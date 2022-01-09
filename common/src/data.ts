import type * as express from 'express-serve-static-core'

import { Login, RegsiterAccount, WebAuthN } from ".";
import { Assertion } from "./webauth";

import type { Connections } from "./data.g"
export * as Connections from "./data.g"


export type InputBody<TPath extends Connections> = def<TPath>['input'];
export type InputPath<TPath extends Connections> = express.RouteParameters<TPath>;
export type Input<TPath extends Connections> = InputBody<TPath> & InputPath<TPath>;


export type Result<TPath extends Connections> = def<TPath>['result']

export type Error<TPath extends Connections> = def<TPath>['error']

export type Method<T extends string> = T extends `${infer path}->${infer method}`
    ? method extends METHODS ? method
    : never
    : never;
export type Path<T extends string> = T extends `${infer path}->${infer method}`

    ? method extends METHODS ? path
    : never
    : never;



export function deconstruct<Conection extends Connections>(conection: Conection): [Path<Conection>, Method<Conection>] {
    const index = conection.indexOf('->');
    return [conection.substring(0, index) as Path<Conection>,conection.substring(index + 2) as Method<Conection>];
}


interface CommonError {

}


type DefaultError<T> = T extends string ? { message: T } | CommonError | undefined
    : T extends object ? T | CommonError | undefined
    : T extends void ? CommonError | undefined
    : never;

type METHODS = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
type Set<Input extends (Object | void), result extends( Object | void), Error extends string | object | void> = {
    input: Input, result: result,
    error: DefaultError<Error>,
};

type def<TConnection extends Connections> =
    // Authentication
    TConnection extends '/auth/password/check/:login->get' ? Set<void, { found: boolean }, void>
    : TConnection extends '/auth/password/register->post' ? Set<RegsiterAccount<Login>, void, void>
    : TConnection extends '/auth/password/login->post' ? Set<Login, void, void>
    : TConnection extends '/auth/webauth/challenge->get' ? Set<void, {
        challenge: string,
        id: string
    }, void>
    : TConnection extends '/auth/webauth/register->post' ? Set<RegsiterAccount<WebAuthN> & { comment: string }, void, void>
    : TConnection extends '/auth/webauth/login->post' ? Set<Assertion, void, void>
    : TConnection extends '/auth/logout->post' ? Set<void, void, void>
    : TConnection extends '/auth/invite->get' ? Set<void, {
        link: string,
        validUntill: string
    }, void>
    : TConnection extends '/auth/invite/validate->post' ? Set<{ invite: string }, {
        granted_by: string,
        validUntill: string
    }, void>
    : TConnection extends '/auth/isAuthenticated->get' ? Set<void, {
        isAuthenticated: boolean,
        userName: string | undefined
    }, void>

    // Clocks
    : TConnection extends '/clock->put' ? Set<{ name: string, segments: number, value?: number },
        { id: number, name: string, segments: number, value?: number },
        void>
    : TConnection extends '/clock->patch' ? Set<{ id: number, name?: string, segments?: number, value?: number },
        { id: number, name: string, segments: number, value?: number },
        void>
    : TConnection extends '/clock->delete' ? Set<{ id: number },
        void,
        void>
    : TConnection extends '/clock->get' ? Set<void,
        { name: string, segments: number, value?: number }[],
        void>

    // default
    : never

