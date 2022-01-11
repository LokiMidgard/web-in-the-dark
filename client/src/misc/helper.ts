import type * as express from 'express-serve-static-core'
import { data } from 'blade-common'
import type { Options } from 'body-parser';



export interface Dictionary<T> {
    [index: string]: T | undefined;
}

export function itterate<T>(dic: Dictionary<T>): [key: string, value: T][] {
    const result: [key: string, value: T][] = []
    for (const key in dic) {
        if (Object.prototype.hasOwnProperty.call(dic, key)) {
            const element = dic[key];
            if (element) {
                result.push([key, element]);
            }
        }
    }
    return result;
}

export function map<T, U>(dic: Dictionary<T>, callbackfn: (value: T, key: string) => U): Dictionary<U> {
    const result: Dictionary<U> = {};
    for (const key in dic) {
        if (Object.prototype.hasOwnProperty.call(dic, key)) {
            const element = dic[key];
            if (element) {
                result[key] = callbackfn(element, key);
            }
        }
    }
    return result;
}

export function dictionary<T>(dic: T[], callbackfn: (value: T) => string): Dictionary<T>;
export function dictionary<T, U>(dic: T[], callbackfn: (value: T) => string, callbackValue?: (value: T) => U): Dictionary<U>;
export function dictionary<T, U = T>(dic: T[], callbackfn: (value: T) => string, callbackValue?: (value: T) => U): Dictionary<U> {
    const result = dic.reduce((old, current) => {
        if (callbackValue) {
            old[callbackfn(current)] = callbackValue(current);
        } else {

            old[callbackfn(current)] = current as any as U;
        }

        return old;
    }, {} as Dictionary<U>);

    return result;
}

export function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    })
}


// this should map T if it is empty to never, but I don't know how the do it
type notEmpty<T extends Record<PropertyKey, any>> =
    keyof T extends never
    ? void
    : T;

type combine<T1, T2> = T1 extends void
    ? T2
    : T2 extends void
    ? T1
    : T1 & T2;



type input<Conection extends data.Connections.Connections> = notEmpty<combine<data.InputBody<Conection>, express.RouteParameters<Conection>>>;

// type RouteParameters<Conection extends data.Connections> = express.RouteParameters<Conection> extends {} ?
// express.RouteParameters<Conection>
//     : express.RouteParameters<Conection>;

export async function sendServerThrow<Conection extends data.Connections.Connections>(connection: Conection, input: input<Conection>): Promise<(data.Result<Conection> & { status: number, successs: true })> {
    const r = await sendServer(connection, input);
    if (!r.successs)
        throw r;
    return r;
}
export async function sendServer<Conection extends data.Connections.Connections>(connection: Conection, input: input<Conection>): Promise<(data.Result<Conection> & { status: number, successs: true }) | (data.Error<Conection> & { status: number, successs: false })> {
    try {
        const [path, method] = data.deconstruct(connection);
        const reg = /\/:(?<value>[^\/]*)/g
        const matches = [...path.matchAll(reg)];
        const values = matches.map(x => x.groups ? x.groups['value'] : '')
            .filter(x => x);

        let actualPath: string = path;

        for (const v of values) {
            const value = input[v as keyof input<Conection>];
            actualPath = actualPath.replace(`:${v}`, String(value))
        }

        let datax: any | undefined = {}
        if (input)
            for (const p of Object.keys(input as any).filter(x => !values.includes(x))) {
                datax[p] = input[p as keyof input<Conection>];
            }

        if (Object.keys(datax).length == 0) { datax = undefined; }


        const response = await fetch(actualPath, {
            method: method,
            body: datax ? JSON.stringify(datax) : undefined,
            headers: datax ? {
                "Content-Type": "application/json",
            } : undefined,
        });

        const responseObj = await getbody(response);

        responseObj.status = response.status;
        responseObj.successs = response.ok;
        return responseObj;
    } catch (error) {
        console.error(`Error sending ${connection}`, error)
        return { successs: false, status: 400, error: error }
    }

    async function getbody(response: Response): Promise<(data.Result<Conection> & { status: number; successs: true; }) | (data.Error<Conection> & { status: number; successs: false; })> {
        // TODO Actually handle empty response and handle other parsing related errors...
        try {
            return await response.json() as any;
        }
        catch {
            // empty response...
            return undefined;
        }
    }
}
