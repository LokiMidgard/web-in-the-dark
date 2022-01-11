import { Express as ExpressCore } from 'express-serve-static-core';
import { getUser } from '../db/db';
import { addPlayer, createGroup, deleteGroup, getGroup, getPlayerGroups, getPlayers, removePlayer } from '../db/group';
import { BladeRouter, callbackFunction, callbackInput } from '../helper';
import { data } from 'blade-common';



export function Init(app: ExpressCore) {
    BladeRouter.from(app)
        .handle('/groups/my->get', async (input) => {
            const groups = await getPlayerGroups(input.authenticatedUserId);
            return ["success", await Promise.all(groups.map(async x => {
                const gm = await getUser(x.gm);
                if (!gm)
                    throw 'gm not found'
                return ({
                    name: x.name,
                    id: x.id, gm: gm
                });
            }))];
        })
        .handle('/groups->put', async (input) => {
            const group = await createGroup(input.name, input.authenticatedUserId);
            const me = await getUser(input.authenticatedUserId);
            if (!me)
                throw 'Self not found...';
            return ['success', { id: group.id, name: group.name, gm: me }];
        })
        .handle('/groups/:groupId:number->get', async (input) => {
            const group = await getGroup(input.groupId);
            if (!group)
                throw 'group not found...';
            const gm = await getUser(group.gm);
            if (!gm)
                throw 'gm not found...';
            return ['success', { id: group.id, name: group.name, gm: gm }];
        })
        .handle('/groups/:groupId:number->delete', isGmOfGroup(x => x.groupId), async input => {
            const success = await deleteGroup(input.groupId, input.authenticatedUserId);
            return [success ? 'success' : 'not found', undefined]
        })
        .handle('/groups/:groupId:number/users->delete', isGmOfGroup(x => x.groupId), async input => {
            const success = await removePlayer(input.groupId, input.id);
            return [success ? 'success' : 'not found', undefined]
        })
        .handle('/groups/:groupId:number/users->put', isGmOfGroup(x => x.groupId), async input => {
            const success = await addPlayer(input.groupId, input.id);
            return [success ? 'success' : 'not found', undefined]
        })
        .handle('/groups/:groupId:number/users->get', isMemberOfGroup(x => x.groupId), async input => {
            const success = await getPlayers(input.groupId);
            return ['success', success];
        })

    function isGmOfGroup<Connection extends data.Connections.Connections>(groupIdSelector: (input: callbackInput<Connection>) => number): callbackFunction<Connection> {
        return async (input, req) => {
            const groupId = groupIdSelector(input);
            const group = await getGroup(groupId);
            if (!group)
                return ['not found', undefined];
            if (group.gm != (input as any /*if there is no authenticated user thats fine*/).authenticatedUserId)
                return ['forbidden', undefined]
            return 'skip';

        }
    }
    function isMemberOfGroup<Connection extends data.Connections.Connections>(groupIdSelector: (input: callbackInput<Connection>) => number): callbackFunction<Connection> {
        return async (input, req) => {
            const groupId = groupIdSelector(input);
            const group = await getGroup(groupId);
            if (!group)
                return ['not found', undefined];
            if (group.gm != (input as any /*if there is no authenticated user thats fine*/).authenticatedUserId
            ) {
                const players = await getPlayers(groupId);
                const playerOfGroup = players.some(x => x.id == (input as any).authenticatedUserId)
                if (!playerOfGroup) {
                    return ['forbidden', undefined]
                }
            }
            return 'skip';

        }
    }

}