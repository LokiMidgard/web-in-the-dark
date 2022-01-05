import { NextFunction, Request, Response } from 'express';
import NodeCache from 'node-cache';
import { Express as ExpressCore } from 'express-serve-static-core';
import * as common from 'blade-common';
import { QueryResult } from 'pg';
import * as fido from "./fido";

import passport from 'passport';
import bcryptr from 'bcryptjs';
import { randomUUID } from 'crypto';

import { pool } from './index';

const cache = new NodeCache();


async function getInviter(data: common.RegsiterAccount) {

    if (!data.invite) {
        return undefined;
    }
    const client = await pool.connect();
    try {
        const userQuery = await client.query<db_invite>('select * from invites where id = $1;', [data.invite]);
        if (userQuery.rowCount == 0) {
            return undefined;
        }
        return userQuery.rows[0];
    } finally {
        client.release();
    }

}


export async function generateUser(data: common.RegsiterAccount<common.Login> | common.RegsiterAccount<common.WebAuthN> & fido.WebauthLogin, options?: { ignoreInvite: boolean }): Promise<db_user> {
    const inviter = await getInviter(data);
    if (!inviter && !(options?.ignoreInvite ?? false))
        throw 'Ivite coulde not be found'
    const userId: string = randomUUID();
    const name = data.name;

    if (common.isLogin(data.authentication)) {
        const password = data.authentication.password
        const login = data.authentication.login


        const hash = password ? await async function (password: string) {
            const salt = await bcryptr.genSalt();
            const hash = await bcryptr.hash(password, salt);
            return hash;
        }(password) : undefined;


        const client = await pool.connect();
        try {
            let userQuery: QueryResult<db_user> | undefined
            try {

                await client.query('begin;');
                userQuery = await client.query('insert into users (id, name, granted_by) values($1, $2, $3);', [userId, name, inviter?.granted_by ?? null]);
                await client.query('insert into local_login (user_id, login, password) values($1, $2, $3);', [userId, login, hash]);
                if (data.invite)
                    await client.query('delete from invites where id = $1;', [data.invite]);
            } finally {
                await client.query('end;');
            }


            if (!userQuery || userQuery.rowCount != 1) {
                throw 'Failed to insert'
            }

            return userQuery.rows[0];
        } finally {
            client.release();
        }
    }
    else if (common.isWebAuthN(data.authentication)) {
        const client = await pool.connect();
        const loginData: fido.WebauthLogin = data as any;
        try {
            let userQuery: QueryResult<db_user> | undefined
            try {

                await client.query('begin;');
                userQuery = await client.query('insert into users (id, name, granted_by) values($1, $2, $3);', [userId, name, inviter?.granted_by ?? null]);
                await client.query('insert into webauth_login (user_id, id, publicKeyJwk, signCount, comment) values($1, $2, $3, $4, $5);', [userId, loginData.id, loginData.publicKeyJwk, loginData.signCount, "to fill"]);
                if (data.invite)
                    await client.query('delete from invites where id = $1;', [data.invite]);
            } finally {
                await client.query('end;');
            }

            if (!userQuery || userQuery.rowCount != 1) {
                throw 'Failed to insert'
            }

            return userQuery.rows[0];
        } finally {
            client.release();
        }

    }
    else {
        throw 'Unsupported authentication method'
    }


}


export function Init(app: ExpressCore) {
    app.post('/auth/password/check', async (req, res) => {
        const data = req.body as common.CheckLogin;
        try {
            const client = await pool.connect();
            let result: QueryResult<any>;
            try {
                result = await client.query('SELECT * FROM local_login where login = $1;', [data.login]);
                res.status(result.rowCount == 0 ? 404 : 200).send();
            } finally {
                client.release();
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Error " + err);
        }
    })
        .post('/auth/password/register', NotAuthenticated, async (req, res, next) => {
            try {
                const data = req.body as common.RegsiterAccount<common.Login>;
                const user = await generateUser(data)
                console.log('generated user')
                passport.authenticate('local', (err, user, info) => {
                    if (user) {
                        req.login(user, (err) => {
                            if (err)
                                res.status(500).send(err);
                            else
                                res.status(200).send(user);
                        });
                    } else {

                        console.warn('callback authenticate', err, user, info)
                        res.status(500).send('no user?');
                    }
                })({
                    body: {
                        login: data.authentication.login,
                        password: data.authentication.password
                    }
                }, res, next)
                // const x = await registerAccount();
            } catch (err) {
                console.error(err);
                res.status(500).send("Error " + err);
            }
        })
        .post('/auth/password/login', NotAuthenticated, passport.authenticate('local'), (req, res) => {
            res.status(200).send("OK")
        })



        .get('/auth/webauth/challenge', NotAuthenticated, async (req, res, next) => {
            try {
                // const data = req.body 

                const challange = fido.getChallenge();
                res.json({
                    challenge: challange,
                    id: randomUUID()
                });

            } catch (err) {
                console.error(err);
                res.status(500).send("Error " + err);
            }
        })
        .post('/auth/webauth/register', NotAuthenticated, async (req, res, next) => {
            try {
                const data = req.body as common.RegsiterAccount<common.WebAuthN>;
                const credential = await fido.makeCredential(data, req.user?.id);
                req.logIn({ id: credential }, err => {
                    if (err)
                        res.status(500).send();
                    else
                        res.status(200).send();
                })
            } catch (err) {
                console.error(err);
                res.status(500).send("Error " + err);
            }
        })
        .post('/auth/webauth/login', NotAuthenticated, async (req, res) => {
            try {
                const credential = await fido.verifyAssertion(req.body);
                req.logIn({ id: credential }, err => {

                    if (err)
                        res.status(401).send();
                    else {
                        res.status(200).send();
                    }
                    res.json({
                        success: err ? false : true
                    });
                })

            } catch (e) {
                console.error(e);
                res.json({
                    error: e
                });
            }
        })




        .get('/auth/logout', Authenticated, (req, res) => {
            req.logOut();
            res.redirect('/')
        })
        .get('/auth/invite', Authenticated, async (req, res, next) => {
            try {
                const client = await pool.connect();
                try {
                    var today = new Date();
                    var tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    await client.query('delete from invites where valid_until < NOW();');
                    const query = await client.query<{ id: string, valid_until: string }>('insert into invites (valid_until, granted_by) values($1, $2) RETURNING id,valid_until;', [tomorrow.toISOString(), req.user?.id]);
                    if (query.rowCount != 1) {
                        res.status(500).send(`Wrong number of rows ${query.rowCount}`);
                        return
                    }
                    const result = query.rows[0];
                    res.status(200).send({
                        link: `${process.env.URL}invite.html#${result.id}`,
                        validUntill: result.valid_until
                    });
                } finally {
                    client.release();
                }
            } catch (err) {
                console.error(err);
                res.status(500).send("Error " + err);
            }


        })

        .post('/auth/invite/validate', async (req, res, next) => {
            try {
                const client = await pool.connect();
                try {
                    const data = req.body as { invite: string };
                    var today = new Date();
                    var tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    await client.query('delete from invites where valid_until < NOW();');
                    const query = await client.query<db_invite>('select * from invites where id = $1;', [data.invite]);
                    if (query.rowCount != 1) {
                        res.status(404).send(`No invite found`);
                        return
                    }
                    const result = query.rows[0];
                    const query2 = await client.query<db_user>('select * from users where id = $1;', [result.granted_by]);
                    const result2 = query2.rows[0];

                    res.status(200).send({
                        granted_by: result2.name,
                        validUntill: result.valid_until
                    });
                } finally {
                    client.release();
                }
            } catch (err) {
                console.error(err);
                res.status(500).send("Error " + err);
            }
        })
        .get('/auth/isAuthenticated', async (req, res, next) => {
            try {

                const isAuthenticated = req.user ? true : false;
                let name = undefined;
                if (isAuthenticated) {

                    const client = await pool.connect();
                    try {
                        var today = new Date();
                        var tomorrow = new Date();
                        tomorrow.setDate(today.getDate() + 1);
                        const query = await client.query<db_user>('select * from users where id = $1;', [req.user?.id]);
                        if (query.rowCount != 1) {
                            res.status(500).send(`Wrong number of rows ${query.rowCount}`);
                            return
                        }
                        const result = query.rows[0];
                        name = result.name;
                    } finally {
                        client.release();
                    }
                }

                const data: common.isAuthenticated = {
                    isAuthenticated: req.user ? true : false,
                    userName: name
                };
                res.status(200).send(data);

            } catch (err) {
                console.error("sending error login", err);
                res.status(500).send("Error " + err);
            }
        })
}

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

export function Authenticated<
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
export function NotAuthenticated<
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
export interface db_local_login { user_id: string, login: string, created: string, password: string }
export interface db_user { id: string, name: string, granted_by: string }
export interface db_webauth_login { user_id: string, id: string, comment: string, created: string, signcount: number, publickeyjwk: common.Jwk }

