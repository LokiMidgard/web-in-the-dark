import { TextDecoderStream } from "stream/web";
import { db_user, poolConnect } from "./db";


export interface db_group {
    id: number,
    name: string,
    gm: string
}

export interface db_claims {
    id: number,
    name: string,
    description: string,
    type: 'normal' | 'lair' | 'turf',
    playbook: number,
    x_pos: number | undefined,
    y_pos: number | undefined
}

export interface db_crew_playbook {
    id: number,
    max_rep: number,
    max_heat: number,
    name: string,
    vault_crease: number[],
    max_xp: number,
    xp_trigger: string,
    veteran_abilities: number
}
export interface db_crew {
    id: number,
    name: string,
    group: number,
    playbook: number,
    rep: number,
    hold: 'w' | 's',
    tier: number,
    heat: number,
    wanted_level: number,
    coin: number;
    vaultes: number,
    lair: string,
    xp: number,
    notes: string
}

export interface db_crew_abilities {
    id: number,
    name: string,
    text: string,
    playbook: number
}

export interface db_crew_upgreades {
    id: number,
    max_get: number,
    name: string,
    playbook?: number,
    slots: number,
    category: string,
    taken: number
}
export interface db_cohorts {
    id: number,
    type: number,
    armor: boolean,
    kind: 'expert' | 'gang',
    state: 'normal' | 'weak' | 'impared' | 'broken',
    crew: number,
}

export interface db_cohort_type {
    id: number,
    name: string,
    description: string
}

export interface db_cohort_modifier {
    id: number,
    name: string,
    description: string,
    type: 'edge' | 'flaw'
}



export async function createGroup(name: string, gmUserId: string): Promise<db_group> {
    const connection = await poolConnect();
    try {
        const groupresult = await connection.query<db_group>('insert into groups (name, gm) values ($1, $2) returning id, name, gm', [name, gmUserId]);
        return groupresult.rows[0];
    } finally {
        connection.release();
    }
}
export async function deleteGroup(id: number, gm_id: string) {
    const connection = await poolConnect();
    try {
        const groupresult = await connection.query('delete from groups where id = $1 and gm = $2', [id, gm_id]);
        if (groupresult.rowCount == 0)
            return false;
        return true;
    } finally {
        connection.release();
    }
}
export async function getGroup(id: number): Promise<db_group | undefined> {
    const connection = await poolConnect();
    try {
        const groupresult = await connection.query<db_group>('select * from  groups where id = $1', [id]);
        return groupresult.rows[0];
    } finally {
        connection.release();
    }
}

export async function addPlayer(groupId: number, playerid: string): Promise<boolean> {
    const connection = await poolConnect();
    try {
        const result = await connection.query<db_group>('insert into group_player (group_id, player_id) values ($1, $2)', [groupId, playerid]);
        return result.rowCount > 0;
    } finally {
        connection.release();
    }
}

export async function removePlayer(groupId: number, playerid: string): Promise<boolean> {
    const connection = await poolConnect();
    try {
        const result = await connection.query<db_group>('delete from group_player where group_id = $1 and player_id = $2', [groupId, playerid]);
        return result.rowCount > 0;
    } finally {
        connection.release();
    }
}

export async function getPlayers(groupId: number): Promise<db_user[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_user>('select id, name, granted_by from users join group_Player on users.id = group_player.user_id where group_player.group_id = $1', [groupId]);
        return players.rows ?? [];
    } finally {
        connection.release();
    }
}

export async function getGroups(userId: string): Promise<db_group[]> {
    return [...await getGmGroups(userId), ... await getPlayerGroups(userId)]
}

export async function getGmGroups(userId: string): Promise<db_group[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_group>('select id, name, gm from groups where gm = $1', [userId]);
        return players.rows;
    } finally {
        connection.release();
    }
}

export async function getPlayerGroups(userId: string): Promise<db_group[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_group>('select id, name, gm from groups join group_Player on groups.id = group_player.group_id where group_player.user_id = $1', [userId]);
        return players.rows;
    } finally {
        connection.release();
    }
}


export async function getCrew(groupId: number): Promise<db_crew | undefined> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_crew>('select * from crews where group = $1', [groupId]);
        if (players.rowCount > 0)
            return players.rows[0];
        return undefined;
    } finally {
        connection.release();
    }
}

export async function createCrew(groupId: number, playbookId: number): Promise<db_crew | undefined> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_crew>('insert into crews (group, playbook) values ($1, $2) returning *', [groupId, playbookId]);
        if (players.rowCount > 0)
            return players.rows[0];
        return undefined;
    } finally {
        connection.release();
    }
}

export async function setCrewPlaybook(crewId: number, playbookId: number): Promise<db_crew | undefined> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_crew>('update crews set playbook =  $2 where id = $1', [crewId, playbookId]);
        if (players.rowCount > 0)
            return players.rows[0];
        return undefined;
    } finally {
        connection.release();
    }
}

export async function getAbilities(crewId: number): Promise<db_crew_abilities[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_crew_abilities>('select * from special_abilities_crew as abilities join special_abilities_crew_taken taken on abilities.id = taken.crew_upgreads_id where taken.crews_id = $1', [crewId]);
        return players.rows;
    } finally {
        connection.release();
    }
}

export async function getUpgreads(crewId: number): Promise<db_crew_upgreades[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_crew_upgreades>('select * from crew_upgreads as upgreads join crew_upgrades_taken taken on upgreads.id = taken.crew_upgreads_id where taken.crews_id = $1', [crewId]);
        return players.rows;
    } finally {
        connection.release();
    }
}

export async function getChohorts(crewId: number): Promise<(Omit<db_cohorts, 'type'> & { flaws: db_cohort_modifier[], edges: db_cohort_modifier[], type: db_cohort_type })[]> {
    const connection = await poolConnect();
    try {
        const cohorts = await connection.query<db_cohorts>('select * from cohorts where taken.crew = $1', [crewId]);

        const data = await Promise.all(cohorts.rows.map(async x => {
            const modifier = await connection.query<db_cohort_modifier>('select id, name, description, type from cohorts_modifier as modifier join cohorts_modifier_cohorts j on j.cohorts_modifier_id = modifier.id where j.cohorts_id = $1', [x.id]);
            const type = await connection.query<db_cohort_type>('select id, name, description from cohort_type t join cohorts c on t.id = c.type  where c.id = $1', [x.id]);
            return {
                ...x, ...{
                    type: type.rows[0],
                    flaws: modifier.rows.filter(y => y.type == "flaw"),
                    edges: modifier.rows.filter(y => y.type == "edge")
                }
            };
        }));
        return data;
    } finally {
        connection.release();
    }
}

export async function getCrewPlaybook(playbookId: number): Promise<db_crew_playbook | undefined> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_crew_playbook>('select * from crew_playbooks where id = $1', [playbookId]);
        return players.rows[0];
    } finally {
        connection.release();
    }
}
export async function getPlaybookClaims(playbookId: number): Promise<db_claims[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_claims>('select * from claims where playbook = $1', [playbookId]);
        return players.rows;
    } finally {
        connection.release();
    }
}

export async function getCrewClaims(crewId: number): Promise<{ claim_id: number }[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<{ claim_id: number }>('select claim_id from claimed where crew_id = $1', [crewId]);
        return players.rows;
    } finally {
        connection.release();
    }
}

export async function getClaim(claimId: number): Promise<db_claims> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_claims>('select * from claims where id = $1', [claimId]);
        return players.rows[0];
    } finally {
        connection.release();
    }
}
