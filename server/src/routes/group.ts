import { Express as ExpressCore } from 'express-serve-static-core';
import { getUser } from '../db/db';
import { createGroup, deleteGroup, getGroup } from '../db/group';
import { BladeRouter } from '../helper';



export function Init(app: ExpressCore) {
    BladeRouter.from(app)
        .handle('/groups/:id->put', async (input) => {
            const group = await createGroup(input.name, input.authenticatedUserId);
            const me = await getUser(input.authenticatedUserId);
            if (!me)
                throw 'Self not found...';
            return ['success', { id: group.id, name: group.name, gm: me }];
        })
        .handle('/groups/:id->get', async (input) => {
            const group = await getGroup(parseInt(input.id));
            const gm = await getUser(group.gm);
            if (!gm)
                throw 'gm not found...';
            return ['success', { id: group.id, name: group.name, gm: gm }];
        })
        .handle('/groups/:id->delete', async input => {
            const group = await getGroup(parseInt(input.id));
            if (group.gm != input.authenticatedUserId)
                return ['forbidden', undefined]
            const success = await deleteGroup(parseInt(input.id), input.authenticatedUserId);
            return [success ? 'success' : 'not found', undefined]
        })
}