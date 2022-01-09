import { Express as ExpressCore } from 'express-serve-static-core';

import { RequestHandler, response, Request } from 'express';
import { data } from 'blade-common';



type returnSuccess = 'success';
type returnError = 'error' | 'not found' | 'authentication required' | 'forbidden';
type returnStatus = returnSuccess | returnError;
type returnArray<Connection extends data.Connections.Connections> = [returnSuccess, data.Result<Connection>] | [returnError, data.Error<Connection>];
type callbackFunction<Connection extends data.Connections.Connections> = (input: data.Input<Connection>, req: Request<data.InputPath<Connection>, data.Result<Connection> | data.Error<Connection>, data.InputBody<Connection>>) => Promise<returnArray<Connection> | 'skip'> | returnArray<Connection> | 'skip'

export class BladeRouter {
    private app: ExpressCore;
    private constructor(app: ExpressCore) {
        this.app = app;
    }

    /**
     * from
app:ExpressCore     */
    public static from(app: ExpressCore) {
        return new BladeRouter(app);
    }

    public handle<Conection extends data.Connections.Connections>(connection: Conection, ...callbacks: callbackFunction<Conection>[]) {
        const [path, method] = data.deconstruct(connection);

        const transformed = callbacks.map(callback => {
            const c: RequestHandler<data.InputPath<Conection>, data.Result<Conection> | data.Error<Conection>, data.InputBody<Conection>> = async (req, res, next) => {

                var input = { ...req.body, ...req.params };
                let retunrValue;
                try {

                    retunrValue = await callback(input, req);
                } catch (e: any) {
                    console.log(`Error handling ${path}`, e);
                    res.status(500)
                    res.send(e?.message);
                    return;
                }
                if (retunrValue == 'skip') {
                    next();
                } else {

                    const [state, result] = retunrValue;

                    switch (state) {
                        case 'success':
                            res.status(200)
                            break;
                        case 'not found':
                            res.status(404)
                            break;
                        case 'authentication required':
                            res.status(401)
                            break;
                        case 'forbidden':
                            res.status(403)
                            break;
                        case 'error':
                        default:
                            res.status(500)
                            break;
                    }
                    res.send(result);
                }
            };
            return c;
        })

        this.app[method](path, transformed);
        return this;
    }
}


export function Authenticated
    (input: any, req: Request<any, any, any>): ['not found', undefined] | 'skip' {
    if (req.user) {
        return 'skip';
    }
    return ['not found', undefined]
}
export function NotAuthenticated
    (input: any, req: Request<any, any, any>): ['forbidden', undefined] | 'skip' {
    if (!req.user) {
        return 'skip';
    }
    return ['forbidden', undefined]
}

