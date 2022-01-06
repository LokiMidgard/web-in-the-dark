import type * as common from 'blade-common';
import { sendServer } from "../main/helper";

type AttestationConveyancePreference = "direct" | "enterprise" | "indirect" | "none";

type userVerification = "required";
interface CredentialOptions {
    rp: {
        name: string;
        icon: string;
    };
    user: {
        id: ArrayBufferLike;
        name: string;
        displayName: string;
        icon: string;
    };
    pubKeyCredParams: PublicKeyCredentialParameters[];
    authenticatorSelection: {
        //Select authenticators that support username-less flows
        requireResidentKey: boolean;
        //Select authenticators that have a second factor (e.g. PIN, Bio)
        userVerification: userVerification;
        //Selects between bound or detachable authenticators
        authenticatorAttachment: attachment;
    };
    //Since Edge shows UI, it is better to select larger timeout values
    timeout: number;
    //an opaque challenge that the authenticator signs over
    challenge: ArrayBufferLike;
    //prevent re-registration by specifying existing credentials here
    excludeCredentials: PublicKeyCredentialDescriptor[];
    //specifies whether you need an attestation statement
    attestation: AttestationConveyancePreference;
}
export type attachment = 'platform' | 'cross-platform';

declare global {

    interface Credential {
        readonly id: string;
        readonly type: string;
        readonly rawId: Buffer;
        readonly response: {
            readonly clientDataJSON: Buffer,
            readonly attestationObject: Buffer
            readonly signature?: Buffer
            readonly userHandle?: Buffer
            readonly authenticatorData?: Buffer
        }
    }
}

export async function isPlatformSupported() {
    if (PublicKeyCredential && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
        return false;
    } else if (PublicKeyCredential && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
            if (!available) {
                return false;
            }

        } catch {
            return false;
        }
        return true;
    }
}

/**
 * Calls the .create() webauthn APIs and sends returns to server
 * @param {ArrayBuffer} challenge challenge to use
 * @return {any} server response object
 */
export async function createCredential(challenge: string, userId: string, attachment: attachment, invite: string, userName: string) {
    if (!PublicKeyCredential || typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function")
        return Promise.reject("WebAuthn APIs are not available on this user agent.");



    const createCredentialOptions: CredentialOptions = {
        rp: {
            name: "WebAuthn Sample App",
            icon: "https://example.com/rpIcon.png"
        },
        user: {
            id: stringToArrayBuffer(userId),
            name: userName,
            displayName: userName,
            icon: "https://example.com/userIcon.png"
        },
        pubKeyCredParams: [
            {
                //External authenticators support the ES256 algorithm
                type: "public-key",
                alg: -7
            },
            {
                //Windows Hello supports the RS256 algorithm
                type: "public-key",
                alg: -257
            }
        ],
        authenticatorSelection: {
            //Select authenticators that support username-less flows
            requireResidentKey: true,
            //Select authenticators that have a second factor (e.g. PIN, Bio)
            userVerification: "required",
            //Selects between bound or detachable authenticators
            authenticatorAttachment: attachment
        },
        //Since Edge shows UI, it is better to select larger timeout values
        timeout: 50000,
        //an opaque challenge that the authenticator signs over
        challenge: stringToArrayBuffer(challenge),
        //prevent re-registration by specifying existing credentials here
        excludeCredentials: [],
        //specifies whether you need an attestation statement
        attestation: "none"
    };
    const rawAttestation = await navigator.credentials.create({
        publicKey: createCredentialOptions
    });

    var attestation = {
        id: base64encode(rawAttestation.rawId),
        clientDataJSON: arrayBufferToString(rawAttestation.response.clientDataJSON),
        attestationObject: base64encode(rawAttestation.response.attestationObject)
    };

    const send: common.RegsiterAccount<common.WebAuthN> = {
        invite: invite,
        name: userName,
        authentication: attestation
    }

    const response = await sendServer<common.RegsiterAccount<common.WebAuthN>, void>("/auth/webauth/register", "post", send);

    return response;

}


/**
 * Calls the .get() API and sends result to server to verify
 * @param {ArrayBuffer} challenge 
 * @return {any} server response object
 */
export async function getAssertion(challenge: string) {
    if (!PublicKeyCredential)
        return Promise.reject("WebAuthn APIs are not available on this user agent.");

    var allowCredentials = [];
    // var allowCredentialsSelection: 'filled' | 'empty';

    // if (allowCredentialsSelection === "filled") {
    //     var credentialId = localStorage.getItem("credentialId");

    //     if (!credentialId)
    //         return Promise.reject("Please create a credential first");

    //     allowCredentials = [{
    //         type: "public-key",
    //         id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)).buffer
    //     }];
    // }

    var getAssertionOptions = {
        //specifies which credential IDs are allowed to authenticate the user
        //if empty, any credential can authenticate the users
        allowCredentials: allowCredentials,
        //an opaque challenge that the authenticator signs over
        challenge: stringToArrayBuffer(challenge),
        //Since Edge shows UI, it is better to select larger timeout values
        timeout: 50000
    };

    const rawAssertion = await navigator.credentials.get({
        publicKey: getAssertionOptions
    });

    var assertion = {
        id: base64encode(rawAssertion.rawId),
        clientDataJSON: arrayBufferToString(rawAssertion.response.clientDataJSON),
        userHandle: base64encode(rawAssertion.response.userHandle),
        signature: base64encode(rawAssertion.response.signature),
        authenticatorData: base64encode(rawAssertion.response.authenticatorData)
    };

    const response = await sendServer("/auth/webauth/login", "post", assertion);
    return response;
}

/**
 * Base64 encodes an array buffer
 * @param {ArrayBuffer} arrayBuffer 
 */
function base64encode(arrayBuffer: Buffer) {
    if (!arrayBuffer || arrayBuffer.length == 0)
        return undefined;

    return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
}

/**
 * Converts an array buffer to a UTF-8 string
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {string}
 */
function arrayBufferToString(arrayBuffer: Buffer): string {
    return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
}

/**
 * Converts a string to an ArrayBuffer
 * @param {string} string string to convert
 * @returns {ArrayBuffer}
 */
function stringToArrayBuffer(str: string) {
    return Uint8Array.from(str, c => c.charCodeAt(0)).buffer;
}