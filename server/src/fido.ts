import base64url from 'base64url';
import cbor from 'cbor';
import uuid from 'uuid-parse';
import jwkToPem from 'jwk-to-pem';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import url from 'url';
import * as common from 'blade-common';
// import { db_webauth_login, generateUser } from './authentication';
import { Assertion } from 'blade-common/src/webauth';
import { generateUser, generateWebAuth, getWebAuth, updateWebAuth } from './db/db';

// import storage from './storage.js';

const hostname = process.env.HOST || "localhost";
const jwt_secret = process.env.JWT_SECRET || "defaultsecret";



/**
 * Gets an opaque challenge for the client.
 * Internally, this challenge is a JWT with a timeout.
 * @returns {string} challenge
 */
export function getChallenge() {
    return jwt.sign({}, jwt_secret, {
        expiresIn: 120 * 1000
    });
};

interface Attestation {
    id: string,
    attestationObject: string,
    clientDataJSON: string
}

/**
 * Creates a FIDO credential and stores it
 * @param {any} attestation AuthenticatorAttestationResponse received from client
 */
export async function makeCredential(input: common.RegsiterAccount<common.WebAuthN> | common.WebAuthN, comment: string, userId?: string): Promise<string> {

    const registerAccount = common.isWebAuthN(input)
        ? undefined
        : input;

    const attestation = common.isWebAuthN(input)
        ? input
        : input.authentication;

    if (!registerAccount && !userId) {
        throw 'For this registration flow you need to be signed in.'
    }

    //https://w3c.github.io/webauthn/#registering-a-new-credential
    if (!attestation.id)
        throw new Error("id is missing");

    if (!attestation.attestationObject)
        throw new Error("attestationObject is missing")

    if (!attestation.clientDataJSON)
        throw new Error("clientDataJSON is missing");

    //Step 1-2: Let C be the parsed the client data claimed as collected during
    //the credential creation
    let C;
    try {
        C = JSON.parse(attestation.clientDataJSON) as ClientData;
    } catch (e) {
        throw new Error("clientDataJSON could not be parsed");
    }

    //Step 3-6: Verify client data
    validateClientData(C, "webauthn.create");
    //Step 7: Compute the hash of response.clientDataJSON using SHA-256.
    const clientDataHash = sha256(attestation.clientDataJSON);

    //Step 8: Perform CBOR decoding on the attestationObject
    let attestationObject;
    try {
        attestationObject = cbor.decodeFirstSync(Buffer.from(attestation.attestationObject, 'base64'));
    } catch (e) {
        throw new Error("attestationObject could not be decoded");
    }
    //Step 8.1: Parse authData data inside the attestationObject
    const authenticatorData = parseAuthenticatorData(attestationObject.authData);
    //Step 8.2: authenticatorData should contain attestedCredentialData
    if (!authenticatorData.attestedCredentialData)
        throw new Error("Did not see AD flag in authenticatorData");

    //Step 9: Verify that the RP ID hash in authData is indeed the SHA-256 hash
    //of the RP ID expected by the RP.
    if (!authenticatorData.rpIdHash.equals(sha256(hostname))) {
        throw new Error("RPID hash does not match expected value: sha256(" + hostname + ")");
    }

    //Step 10: Verify that the User Present bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000001) == 0) {
        throw new Error("User Present bit was not set.");
    }

    //Step 11: Verify that the User Verified bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000100) == 0) {
        throw new Error("User Verified bit was not set.");
    }

    //Steps 12-19 are skipped because this is a sample app.

    //Store the credential
    const credential: WebauthLogin = {
        id: authenticatorData.attestedCredentialData.credentialId.toString('base64'),
        publicKeyJwk: authenticatorData.attestedCredentialData.publicKeyJwk,
        signCount: authenticatorData.signCount
    };


    if (!userId && registerAccount) {
        const user = await generateUser({ ...registerAccount, ...credential });
        return user.id;
    } else if (userId) {
        await generateWebAuth(userId, credential.id, credential.publicKeyJwk, credential.signCount, comment)
        return userId;
    }
    else {
        throw 'Ivalid State'
    }
};

export interface WebauthLogin {
    id: string,
    publicKeyJwk: common.Jwk,
    signCount: number
}

/**
 * Verifies a FIDO assertion
 * @param {any} assertion AuthenticatorAssertionResponse received from client
 * @return {any} credential object
 */
export async function verifyAssertion(assertion: Assertion) {

    // https://w3c.github.io/webauthn/#verifying-assertion

    // Step 1 and 2 are skipped because this is a sample app

    // Step 3: Using credential’s id attribute look up the corresponding
    // credential public key.

    console.log('Try to search entry with id ', assertion.id);
    const credential = await getWebAuth(assertion.id);

    const publicKey = credential.publickeyjwk;
    if (!publicKey)
        throw new Error("Could not read stored credential public key");

    // Step 4: Let cData, authData and sig denote the value of credential’s
    // response's clientDataJSON, authenticatorData, and signature respectively
    const cData = assertion.clientDataJSON;
    const authData = Buffer.from(assertion.authenticatorData, 'base64');
    const sig = Buffer.from(assertion.signature, 'base64');

    // Step 5 and 6: Let C be the decoded client data claimed by the signature.
    let C: ClientData;
    try {
        C = JSON.parse(cData);
    } catch (e) {
        throw new Error("clientDataJSON could not be parsed");
    }
    //Step 7-10: Verify client data
    validateClientData(C, "webauthn.get");

    //Parse authenticator data used for the next few steps
    console.log('try parsing ', authData)
    const authenticatorData = parseAuthenticatorData(authData);

    //Step 11: Verify that the rpIdHash in authData is the SHA-256 hash of the
    //RP ID expected by the Relying Party.
    if (!authenticatorData.rpIdHash.equals(sha256(hostname))) {
        throw new Error("RPID hash does not match expected value: sha256(" + hostname + ")");
    }

    //Step 12: Verify that the User Present bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000001) == 0) {
        throw new Error("User Present bit was not set.");
    }

    //Step 13: Verify that the User Verified bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000100) == 0) {
        throw new Error("User Verified bit was not set.");
    }

    //Step 14: Verify that the values of the client extension outputs in
    //clientExtensionResults and the authenticator extension outputs in the
    //extensions in authData are as expected
    if (authenticatorData.extensionData) {
        //We didn't request any extensions. If extensionData is defined, fail.
        throw new Error("Received unexpected extension data");
    }

    //Step 15: Let hash be the result of computing a hash over the cData using
    //SHA-256.
    const hash = sha256(cData);

    //Step 16: Using the credential public key looked up in step 3, verify
    //that sig is a valid signature over the binary concatenation of authData
    //and hash.
    const verify = (publicKey.kty === "RSA") ? crypto.createVerify('RSA-SHA256') : crypto.createVerify('sha256');
    verify.update(authData);
    verify.update(hash);
    if (!verify.verify(jwkToPem(publicKey), sig))
        throw new Error("Could not verify signature");

    //Step 17: verify signCount
    if (authenticatorData.signCount != 0 &&
        authenticatorData.signCount < credential.signcount) {
        throw new Error("Received signCount of " + authenticatorData.signCount +
            " expected signCount > " + credential.signcount);
    }

    //Update signCount
    console.log('updateing the entry')
    updateWebAuth(credential.id, authenticatorData.signCount);
    //Return credential object that was verified
    return credential.user_id;
};

export interface AuthenticationData {
    rpIdHash: Buffer;
    flags: number;
    signCount: number;
    attestedCredentialData: AttestedCredentialData | undefined;
    extensionData: string | undefined;
}

export interface AttestedCredentialData {
    aaguid: string;
    credentialIdLength: number;
    credentialId: Buffer;
    //convert public key to JWK for storage
    publicKeyJwk: common.Jwk;
}
/**
 * Parses authData buffer and returns an authenticator data object
 * @param {Buffer} authData
 * @returns {AuthenticatorData} Parsed AuthenticatorData object
 * @typedef {Object} AuthenticatorData
 * @property {Buffer} rpIdHash
 * @property {number} flags
 * @property {number} signCount
 * @property {AttestedCredentialData} attestedCredentialData
 * @property {string} extensionData
 * @typedef {Object} AttestedCredentialData
 * @property {string} aaguid
 * @property {any} publicKeyJwk
 * @property {string} credentialId
 * @property {number} credentialIdLength
 */
export function parseAuthenticatorData(authData: Buffer): AuthenticationData {
    try {
        const flags = authData[32];
        const attestedCredentialData = (flags & 64) ? (() => {
            const credentialIdLength = (authData[53] << 8) | authData[54];
            //Public key is the first CBOR element of the remaining buffer
            const publicKeyCoseBuffer = authData.slice(55 + credentialIdLength, authData.length);
            const attestedCredentialData = {

                aaguid: uuid.unparse(authData.slice(37, 53)).toUpperCase(),
                credentialIdLength: credentialIdLength,
                credentialId: authData.slice(55, 55 + credentialIdLength),
                //convert public key to JWK for storage
                publicKeyJwk: coseToJwk(publicKeyCoseBuffer)
            };


            return attestedCredentialData;
        })() : undefined

        const extensionData = (flags & 128) ? (() => {
            //has extension data

            let extensionDataCbor;

            if (attestedCredentialData) {
                //if we have attesttestedCredentialData, then extension data is
                //the second element
                extensionDataCbor = cbor.decodeAllSync(authData.slice(55 + attestedCredentialData.credentialIdLength, authData.length));
                extensionDataCbor = extensionDataCbor[1];
            } else {
                //Else it's the first element
                extensionDataCbor = cbor.decodeFirstSync(authData.slice(37, authData.length));
            }

            return cbor.encode(extensionDataCbor).toString('base64');
        })() : undefined

        const authenticatorData = {
            rpIdHash: authData.slice(0, 32),
            flags: flags,
            signCount: (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | (authData[36]),
            attestedCredentialData: attestedCredentialData,
            extensionData: extensionData
        };




        return authenticatorData;
    } catch (e) {
        throw new Error("Authenticator Data could not be parsed")
    }
}

interface ClientData {
    type: string,
    origin: string,
    challenge: string
}
/**
 * Validates CollectedClientData
 * @param {any} clientData JSON parsed client data object received from client
 * @param {string} type Operation type: webauthn.create or webauthn.get
 */
export function validateClientData(clientData: ClientData, type: string) {
    if (clientData.type !== type)
        throw new Error("collectedClientData type was expected to be " + type);

    let origin;
    try {
        origin = url.parse(clientData.origin);
    } catch (e) {
        throw new Error("Invalid origin in collectedClientData");
    }

    if (origin.hostname !== hostname)
        throw new Error("Invalid origin in collectedClientData. Expected hostname " + hostname);

    if (hostname !== "localhost" && origin.protocol !== "https:")
        throw new Error("Invalid origin in collectedClientData. Expected HTTPS protocol.");

    let decodedChallenge;
    try {
        decodedChallenge = jwt.verify(base64url.decode(clientData.challenge), jwt_secret);
    } catch (err) {
        throw new Error("Invalid challenge in collectedClientData");
    }
};

/**
 * Converts a COSE key to a JWK
 * @param {Buffer} cose Buffer containing COSE key data
 * @returns {any} JWK object
 */
export function coseToJwk(cose: Buffer): common.Jwk {
    try {
        let publicKeyJwk: common.Jwk;
        const publicKeyCbor = cbor.decodeFirstSync(cose);

        if (publicKeyCbor.get(3) == -7) {
            publicKeyJwk = {
                kty: "EC",
                crv: "P-256",
                x: publicKeyCbor.get(-2).toString('base64'),
                y: publicKeyCbor.get(-3).toString('base64')
            }
        } else if (publicKeyCbor.get(3) == -257) {
            publicKeyJwk = {
                kty: "RSA",
                n: publicKeyCbor.get(-1).toString('base64'),
                e: publicKeyCbor.get(-2).toString('base64')
            }
        } else {
            throw new Error("Unknown public key algorithm");
        }

        return publicKeyJwk;
    } catch (e) {
        throw new Error("Could not decode COSE Key");
    }
}

/**
 * Evaluates the sha256 hash of a buffer
 * @param {Buffer} data
 * @returns sha256 of the input data
 */
export function sha256(data: crypto.BinaryLike) {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest();
}


