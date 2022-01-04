export interface RegsiterAccount<T extends Login | WebAuthN = Login | WebAuthN> {
    name: string,
    invite: string | undefined,
    authentication: T
}

export interface Login {
    login: string,
    password: string
}



export type Jwk = {
    kty: "EC",
    crv: "P-256",
    x: string,
    y: string
} | {
    kty: "RSA",
    n: string,
    e: string
}

export interface WebAuthN {
    id: string,
    clientDataJSON: string,
    attestationObject: string
};








export interface CheckLogin {
    login: string
}

export interface isAuthenticated {
    isAuthenticated: boolean;
    userName: string | undefined;
}

export function isLogin(obj: any): obj is Login {
    return (typeof obj === "object"
        && typeof obj.login === "string"
        && typeof obj.password === "string")
}

export function isWebAuthN(obj: any): obj is WebAuthN {
    return (typeof obj === "object"
        && typeof obj.id === "string"
        && typeof obj.clientDataJSON === "string"
        && typeof obj.attestationObject === "string")
}
