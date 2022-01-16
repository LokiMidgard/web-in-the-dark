import { Express as ExpressCore } from 'express-serve-static-core';
import { getUser } from '../db/db';
import { addPlayer, createCrew, createGroup, deleteGroup, getAbilities, getChohorts, getClaim, getCrew, getCrewClaims, getCrewPlaybook, getGroup, getGroups, getPlaybookClaims, getPlayerGroups, getPlayers, getUpgreads, removePlayer, setCrewPlaybook } from '../db/group';
import { BladeRouter, callbackFunction, callbackInput } from '../helper';
import { data } from 'blade-common';
import { decodeBase64 } from 'bcryptjs';



export function Init(app: ExpressCore) {
    BladeRouter.from(app)
        .handle('/groups/my->get', async (input) => {
            const groups = await getGroups(input.authenticatedUserId);
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
            console.log(input)
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
        .handle('/groups/:groupId:number/crewplaybook->patch', isMemberOfGroup(x => x.groupId), async input => {
            const crew = await getCrew(input.groupId)
            if (!crew) {
                await createCrew(input.groupId, input.playbookId)
            } else {
                await setCrewPlaybook(crew.id, input.playbookId);
            }

            return ['success', undefined];
        })
        .handle('/groups/:groupId:number/crew->get', isMemberOfGroup(x => x.groupId), async input => {
            const crew = await getCrew(input.groupId)
            if (crew) {

                const upgreads = await getUpgreads(crew.id);
                const abilities = await getAbilities(crew.id);
                const cohorts = await getChohorts(crew.id);

                const playbook = await getCrewPlaybook(crew.playbook);
                if (!playbook) {
                    // return ['error', undefined];
                    return ['error', { message: 'Faild to find playbook' }];
                }


                const claims = await getCrewClaims(crew.id);
                const playbookClaims = await getPlaybookClaims(crew.playbook);

                const claimIdsNotInPlaybook = claims.filter(x => playbookClaims.filter(y => y.id != x.claim_id).length > 0);

                const claimNotInPlaybook = await Promise.all(claimIdsNotInPlaybook.map(async x => {
                    const claim = await getClaim(x.claim_id);
                    return {
                        id: x.claim_id,
                        description: claim.description,
                        name: claim.name,
                        type: claim.type,
                        taken: true,
                        x: undefined,
                        y: undefined
                    };

                }));

                const c = playbookClaims.map(x => ({
                    id: x.id,
                    description: x.description,
                    name: x.name,
                    type: x.type,
                    x: x.x_pos,
                    y: x.y_pos,
                    taken: claims.filter(y => y.claim_id == x.id).length > 0
                })).concat(
                    claimNotInPlaybook
                );

                const categorys = [...new Set(upgreads.map(x => x.category))];

                return ['success', {
                    name: crew.name,
                    coin: crew.coin,
                    heat: crew.heat,
                    hold: crew.hold,
                    lair: crew.lair,
                    notes: crew.notes,
                    xp: crew.xp,
                    wanted: crew.wanted_level,
                    rep: crew.rep,
                    tier: crew.tier,
                    vaults: crew.vaultes,

                    upgrades: categorys.map(c => {

                        return {

                            category: c,
                            values: upgreads.filter(x => x.category == c).map(x => ({
                                name: x.name,
                                amount: x.taken
                            }))
                        };
                    }),
                    abbilitys: abilities.map(x => ({ name: x.name, text: x.text })),
                    cohorts: cohorts.map(x => ({
                        edges: x.edges,
                        flaws: x.flaws,
                        type: x.type,
                        armor: x.armor,
                        kind: x.kind,
                        state: x.state
                    })),
                    playbook: {
                        caultIncrease: playbook.vault_crease,
                        id: playbook.id,
                        maxHeat: playbook.max_heat,
                        maxRep: playbook.max_rep,
                        maxXp: playbook.max_xp,
                        name: playbook.name,
                        numberOfVeteranAbilitys: playbook.veteran_abilities,
                        xpTrigger: playbook.xp_trigger
                    },
                    claims: c

                }];
            } else {
                return ['not found', undefined];
            }
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