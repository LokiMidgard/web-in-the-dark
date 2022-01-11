import { db_user, poolConnect } from "./db";


export interface db_group { id: number, name: string, gm: string }


export async function createGroup(name: string, gmUserId: string): Promise<db_group> {
    const connection = await poolConnect();
    try {
        const groupresult = await connection.query<db_group>('insert into group (name, gm) values ($1, $2) returning id, name, gm', [name, gmUserId]);
        return groupresult.rows[0];
    } finally {
        connection.release();
    }
}
export async function deleteGroup(id: number, gm_id: string) {
    const connection = await poolConnect();
    try {
        const groupresult = await connection.query('delete from group where id = $1 and gm = $2', [id, gm_id]);
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
        const groupresult = await connection.query<db_group>('select * from  group where id = $1', [id]);
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
        const players = await connection.query<db_group>('select id, name, gm from groups join group_Player on grups.id = group_player.group_id where group_player.user_id = $1', [userId]);
        return players.rows;
    } finally {
        connection.release();
    }
}

export async function getPlayerGroups(userId: string): Promise<db_group[]> {
    const connection = await poolConnect();
    try {
        const players = await connection.query<db_group>('select id, name, gm from groups join group_Player on grups.id = group_player.group_id where group_player.user_id = $1', [userId]);
        return players.rows;
    } finally {
        connection.release();
    }
}
