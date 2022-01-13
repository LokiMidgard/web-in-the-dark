import type * as express from 'express-serve-static-core'

import { Login, RegsiterAccount, WebAuthN } from ".";
import { Assertion } from "./webauth";

import type { Connections } from "./data.g"
import { RequireAtLeastOne, Simplify } from 'type-fest';
import { lookup } from './data-authentication.g';
export * as Connections from "./data.g"


export type InputBody<TPath extends Connections> = def<TPath>['input'];
export type InputPath<TPath extends Connections> = RouteParameters<Path<TPath>>;
export type Input<TPath extends Connections> = InputBody<TPath> & InputPath<TPath>;


export type Result<TPath extends Connections> = def<TPath>['result']
export type NeedsAuthentication<TPath extends Connections> = def<TPath>['authenticated']

export type Error<TPath extends Connections> = def<TPath>['error']

export type Method<T extends Connections> = T extends `${infer path}->${infer method}`
    ? method extends METHODS ? method
    : never
    : never;
export type Path<T extends Connections> = T extends `${infer path}->${infer method}`

    ? method extends METHODS ? path
    : never
    : never;

export function needsAuthentication<T extends Connections>(test: T): NeedsAuthentication<T> {
    return lookup[test];
}



type RemoveTail<S extends string, Tail extends string> = S extends `${infer P}${Tail}` ? P : S;
type GetRouteParameter<S extends string> = RemoveTail<
    RemoveTail<RemoveTail<S, `/${string}`>, `-${string}`>,
    `.${string}`
>;

type ExtractName<S extends string> = S extends `${infer P}:${string}`
    ? P
    : S;
type ExtractType<S extends string> = S extends `${string}:${infer T}`
    ? T extends 'string'
    ? string
    : T extends 'number'
    ? number
    : T extends 'bool'
    ? boolean
    : T extends 'boolean'
    ? boolean
    : never
    : string;


// prettier-ignore
export type RouteParameters<Route extends string> = string extends Route
    ? {}
    : Route extends `${string}(${string}`
    ? {} //TODO: handling for regex parameters
    : Route extends `${string}:${infer Rest}`
    ? (
        GetRouteParameter<Rest> extends never
        ? {}
        : GetRouteParameter<Rest> extends `${infer ParamName}?`
        ? { [P in ExtractName<ParamName>]?: ExtractType<ParamName> }
        : { [P in ExtractName<GetRouteParameter<Rest>>]: ExtractType<GetRouteParameter<Rest>> }
    ) &
    (Rest extends `${GetRouteParameter<Rest>}${infer Next}`
        ? RouteParameters<Next> : unknown)
    : {};

export type User = {
    name: string,
    id: string,
    granted_by: string,
}
export interface Group {
    name: string
    id: number
    gm: User
}


export function deconstruct<Conection extends Connections>(conection: Conection): [Path<Conection>, Method<Conection>] {
    const index = conection.indexOf('->');
    return [conection.substring(0, index) as Path<Conection>, conection.substring(index + 2) as Method<Conection>];
}

export function transformRouteParameters<Connection extends Connections>(connection: Connection, params: express.RouteParameters<Path<Connection>>): InputPath<Connection> {
    const result: any = {};
    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            const type = getTypeForPathParameter(connection, key)
            const element = params[key] as string;
            if (type) {
                if (type == 'boolean') {
                    result[key] = element.toLocaleLowerCase() == 'true';
                } else if (type == 'number') {
                    result[key] = parseInt(element);
                }
                else {
                    result[key] = element;
                }
            }
        }
    }
    return result;
}



function getTypeForPathParameter<Connection extends Connections>(connection: Connection, param: keyof express.RouteParameters<Path<Connection>>) {
    const [path, _] = deconstruct(connection);
    const i = path.indexOf(`:${param}`);
    if (!i) {
        return undefined;
    }
    if (path[i + 1] != ':') {
        return 'string'
    }
    if (path.startsWith('number', i + 2)) {
        return 'number'
    }
    if (path.startsWith('string', i + 2)) {
        return 'string'
    }
    if (path.startsWith('bool', i + 2)) {
        return 'boolean'
    }
    if (path.startsWith('boolean', i + 2)) {
        return 'boolean'
    }
    throw 'unknown type';
}

interface CommonError {

}


type DefaultError<T> = T extends string ? { message: T } | CommonError | undefined
    : T extends object ? T | CommonError | undefined
    : T extends void ? CommonError | undefined
    : never;

type METHODS = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
type Set<Input extends (Object | void), result extends (Object | void), Error extends string | object | void, NeedsAuthentication extends boolean> = {
    input: Input, result: result,
    error: DefaultError<Error>,
    authenticated: NeedsAuthentication
};

type def<TConnection extends Connections> =
    // Authentication
    TConnection extends '/auth/password/check/:login->get' ? Set<void, { found: boolean }, void, false>
    : TConnection extends '/auth/password/register->post' ? Set<RegsiterAccount<Login>, void, void, false>
    : TConnection extends '/auth/password/login->post' ? Set<Login, void, void, false>
    : TConnection extends '/auth/webauth/challenge->get' ? Set<void, {
        challenge: string,
        id: string
    }, void, false>
    : TConnection extends '/auth/webauth/register->post' ? Set<RegsiterAccount<WebAuthN> & { comment: string }, void, void, false>
    : TConnection extends '/auth/webauth/login->post' ? Set<Assertion, void, void, false>
    : TConnection extends '/auth/logout->post' ? Set<void, void, void, true>
    : TConnection extends '/auth/invite->get' ? Set<void, {
        link: string,
        validUntill: string
    }, void, true>
    : TConnection extends '/auth/invite/validate->post' ? Set<{ invite: string }, {
        granted_by: string,
        validUntill: string
    }, void, false>
    : TConnection extends '/auth/isAuthenticated->get' ? Set<void, {
        isAuthenticated: boolean,
        user: User | undefined
    }, void, false>

    // Clocks
    : TConnection extends '/clock->put' ? Set<{ name: string, segments: number, value?: number },
        { id: number, name: string, segments: number, value?: number },
        void, true>
    : TConnection extends '/clock->patch' ? Set<{ id: number } & RequireAtLeastOne<{ name?: string, segments?: number, value?: number }>,
        { id: number, name: string, segments: number, value?: number },
        void, true>
    : TConnection extends '/clock->delete' ? Set<{ id: number },
        void,
        void, true>
    : TConnection extends '/clock->get' ? Set<void,
        { name: string, segments: number, value?: number }[],
        void, false>

    // group
    : TConnection extends '/groups/:groupId:number->get' ? Set<void,
        Group,
        void, true>
    : TConnection extends '/groups->put' ? Set<{ name: string /*, gm_id: string your are alwys the gm*/ },
        Group,
        void, true>
    : TConnection extends '/groups/:groupId:number->delete' ? Set<void,
        void,
        void, true>
    // group user handling heandling
    : TConnection extends '/groups/my->get' ? Set<void,
        Group[],
        void, true>
    : TConnection extends '/groups/:groupId:number/users->get' ? Set<void,
        User[],
        void, true>
    : TConnection extends '/groups/:groupId:number/users->put' ? Set<User,
        void,
        void, true>
    : TConnection extends '/groups/:groupId:number/users->delete' ? Set<User,
        void,
        void, true>

    // users
    : TConnection extends '/users/:userId:string->get' ? Set<void,
        User,
        void, true>

    // default
    : never

