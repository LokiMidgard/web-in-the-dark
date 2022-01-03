export interface RegsiterAccount<T extends Login | WebAuthN = Login | WebAuthN> {
    name: string,
    invite: string,
    authentication: T
}

export interface Login {
    login: string,
    password: string
}


export interface WebAuthN {

}


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