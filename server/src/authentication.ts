import { NextFunction, Request, Response } from 'express';
import NodeCache from 'node-cache';
import { Express as ExpressCore } from 'express-serve-static-core';
import * as common from 'blade-common';
import { QueryResult } from 'pg';
import * as fido from "./fido";

import * as db from './db/db'

import { randomUUID } from 'crypto';

import { generateUser } from './db/db';
import { BladeRouter, NotAuthenticated } from './helper';




export function Init(app: ExpressCore) {
    BladeRouter.from(app)
        .handle('/auth/password/check/:login->get', async (input) => {

            const exists = await db.loginExists(input.login);
            return ['success', { found: exists }];

        })
        .handle('/auth/password/register->post', NotAuthenticated, async (input, req) => {
            // const data = req.body as common.RegsiterAccount<common.Login>;
            const user = await generateUser(input)
            console.log(user)
            await new Promise<void>((resolve, reject) => {
                req.logIn({ id: user.id }, err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                })
            })
            return ['success', undefined];
            // const x = await registerAccount();

        })
        .handle('/auth/password/login->post', NotAuthenticated, async (input, req) => {
            const user = await db.loginValid(input.login, input.password)
            if (user) {
                await new Promise<void>((resolve, reject) => {
                    req.logIn({ id: user }, err => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    })
                })

                return ['success', undefined]
            } else {
                return ['authentication required', undefined]
            }
        })



        .handle('/auth/webauth/challenge->get', NotAuthenticated, (input, req) => {
            // const data = req.body 

            const challange = fido.getChallenge();
            return ['success', { challenge: challange, id: randomUUID() }];

        })
        .handle('/auth/webauth/register->post', NotAuthenticated, async (input, req) => {
            const credential = await fido.makeCredential(input, input.comment, req.user?.id);
            await new Promise<void>((resolve, reject) => {

                req.logIn({ id: credential }, err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                })
            });
            return ['success', undefined];

        })
        .handle('/auth/webauth/login->post', NotAuthenticated, async (input, req) => {
            const credential = await fido.verifyAssertion(input);
            await new Promise<void>((resolve, reject) => {

                req.logIn({ id: credential }, err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                })
            });
            return ['success', undefined];

        })




        .handle('/auth/logout->post', (input, req) => {
            req.logOut();
            return ['success', undefined]
        })
        .handle('/auth/invite->get', async (input, req) => {
            const invite = await db.generateInvite(req.user!.id);
            return ['success', {
                link: `${process.env.URL}invite.html#${invite.id}`,
                validUntill: invite.validUntill
            }];

        })

        .handle('/auth/invite/validate->post', async (input, req) => {
            const data = await db.validateInvite(input.invite);
            if (data)
                return ["success", data];
            return ["not found", undefined];

        })
        .handle('/auth/isAuthenticated->get', async (input, req) => {
            const isAuthenticated = req.user ? true : false;
            let user: common.data.User | undefined = undefined;
            if (isAuthenticated) {
                 user = await db.getUser(req.user!.id);
            }

            return ['success', {

                isAuthenticated: isAuthenticated,
                user: user
            }];
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


