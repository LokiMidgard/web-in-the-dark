import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { Fido2Lib } from 'fido2-lib';

declare global {
    namespace Express {
        interface AuthInfo { }
        // tslint:disable-next-line:no-empty-interface
        interface User {
            id: string
        }
    }
}

interface ParamsDictionary {
    [key: string]: string;
}
interface ParsedQs { [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[] }

export function AuthenticationRequired<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    Locals extends Record<string, any> = Record<string, any>
>(req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction) {
    if (req.user) {
        return next();
    }
    res.status(401).send('Authentication Required' as any);
}
export function AuthenticationForbidden<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    Locals extends Record<string, any> = Record<string, any>
>(req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction) {
    if (!req.user) {
        return next();
    }
    res.status(401).send('Only for not loged in useres' as any);
}



export interface db_invite { id: string, valid_until: string, granted_by: string }
export interface db_user { id: string, name: string, granted_by: string }
export interface db_local_login { user_id: string, login: string, created: string, password: string }

const lib = new Fido2Lib({
    rpName: `Web in the dark (${process.env.HOST})`,
    rpIcon: `${process.env.URL}fav.ico`,
    rpId: process.env.Host,
    challengeSize: 128,
    attestation: 'none',
    cryptoParams: [-7, -257]
})

var enc = new TextEncoder(); // always utf-8

export async function registerAccount(): Promise<[PublicKeyCredentialCreationOptions, () => Promise<void>]> {

    const registrations = await lib.attestationOptions() as PublicKeyCredentialCreationOptions;

    const id = randomUUID();
    const challenge = randomUUID();
    registrations.user.id = enc.encode(id);
    registrations.challenge = enc.encode(challenge);

    return [registrations, async () => { }];


}