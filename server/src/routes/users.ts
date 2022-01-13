import { Express as ExpressCore } from 'express-serve-static-core';
import { getUser } from '../db/db';
import { addPlayer, createGroup, deleteGroup, getGroup, getGroups, getPlayerGroups, getPlayers, removePlayer } from '../db/group';
import { BladeRouter, callbackFunction, callbackInput } from '../helper';
import { data } from 'blade-common';



export function Init(app: ExpressCore) {
    BladeRouter.from(app)
        .handle('/users/:userId:string->get', async input => {
            const success = await getUser(input.userId);
            if (success)
                return ['success', success];
            else
                return ['not found', undefined]
        })


}