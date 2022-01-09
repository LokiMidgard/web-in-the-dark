import * as fido from "../fido";
export * as clock from './clock'

import { randomUUID } from 'crypto';
import { QueryResult, Pool } from 'pg';

import * as common from 'blade-common';
import bcryptr from 'bcryptjs';


export interface db_invite { id: string, valid_until: string, granted_by: string }
export interface db_local_login { user_id: string, login: string, created: string, password: string }
export interface db_user { id: string, name: string, granted_by: string }
export interface db_webauth_login { user_id: string, id: string, comment: string, created: string, signcount: number, publickeyjwk: common.Jwk }


let initPool: (p: Pool) => void;
let pool: Promise<Pool> = new Promise<Pool>(resolve => {
    initPool = resolve;
});

export function Init() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.SSL == 'false'
            ? false :
            process.env.SSL == 'true'
                ? true
                : {
                    rejectUnauthorized: false
                }
    });
    initPool(pool)
}

export async function poolConnect() {
    const p = await pool;
    return await p.connect();
}

export async function loginValid(userid: string, password: string): Promise<string | false> {

    const client = await poolConnect();
    try {
        const query = await client.query<db_local_login>('select * from local_login where login = $1;', [userid]);
        if (query.rowCount == 0) {
            return false;
        }
        const login = query.rows[0];
        if (await bcryptr.compare(password, login.password)) {
            const userQuery = await client.query<db_user>('select * from users where id = $1;', [login.user_id]);

            if (userQuery.rowCount == 0) {
                return false;
            }
            const user = userQuery.rows[0];
            return user.id;
        } else {
            return false;
        }

    } finally {
        client.release();
    }




}


export async function loginExists(login: string) {
    const client = await poolConnect();
    let result: QueryResult<any>;
    try {
        result = await client.query('SELECT * FROM local_login where login = $1;', [login]);
        return result.rowCount > 0;
    } finally {
        client.release();
    }
}

export async function getUserByLogin(login: string) {

    const client = await poolConnect();
    try {
        const userQuery = await client.query<db_local_login>('select * from local_login where login = $1;', [process.env.DEFAULT_USER]);
        if (userQuery.rowCount == 0)
            return undefined;
        const user = await getUser(userQuery.rows[0].user_id);
        return user;
    } finally {
        client.release();
    }

}
export async function generateUser(data: common.RegsiterAccount<common.Login> | common.RegsiterAccount<common.WebAuthN> & fido.WebauthLogin, options?: { ignoreInvite?: boolean }): Promise<db_user> {

    const userId: string = randomUUID();
    const name = data.name;

    const client = await poolConnect();
    let result: db_user | undefined;
    try {
        await client.query('begin;');
        let userQuery: QueryResult<db_user> | undefined


        const inviteQuery = await client.query<db_invite>('select * from invites where id = $1;', [data.invite]);
        const invite = inviteQuery.rowCount == 0 ? undefined : inviteQuery.rows[0];
        if (!invite && !(options?.ignoreInvite ?? false)) {
            const error = {
                message: "Invite Not found"
            };
            throw error;
        }

        if (common.isLogin(data.authentication)) {
            const password = data.authentication.password
            const login = data.authentication.login


            const hash = password ? await async function (password: string) {
                const salt = await bcryptr.genSalt();
                const hash = await bcryptr.hash(password, salt);
                return hash;
            }(password) : undefined;




            userQuery = await client.query('insert into users (id, name, granted_by) values($1, $2, $3) returning id, name, granted_by;', [userId, name, invite?.granted_by ?? null]);
            await client.query('insert into local_login (user_id, login, password) values($1, $2, $3);', [userId, login, hash]);
            if (invite)
                await client.query('delete from invites where id = $1;', [invite.id]);
            if (!userQuery || userQuery.rowCount != 1) {
                throw 'Failed to insert'
            }

            result = userQuery.rows[0];
        }
        else if (common.isWebAuthN(data.authentication)) {
            const client = await poolConnect();
            const loginData: fido.WebauthLogin = data as any;
            try {
                let userQuery: QueryResult<db_user> | undefined
                try {

                    await client.query('begin;');
                    userQuery = await client.query('insert into users (id, name, granted_by) values($1, $2, $3);', [userId, name, invite?.granted_by ?? null]);
                    await client.query('insert into webauth_login (user_id, id, publicKeyJwk, signCount, comment) values($1, $2, $3, $4, $5);', [userId, loginData.id, loginData.publicKeyJwk, loginData.signCount, "to fill"]);
                    if (data.invite)
                        await client.query('delete from invites where id = $1;', [data.invite]);
                } finally {
                    await client.query('end;');
                }

                if (!userQuery || userQuery.rowCount != 1) {
                    throw 'Failed to insert'
                }

                result = userQuery.rows[0];
            } finally {
                client.release();
            }

        }
        else {
            throw 'Unsupported authentication method'
        }
        await client.query('end;');
        return result;
    } catch (e) {
        await client.query('rollback;')
        throw e;
    } finally {
        client.release();
    }

}

export async function generateInvite(id: string, daysValid = 1) {
    const client = await poolConnect();
    try {
        if (daysValid < 1)
            throw `value was to low ${daysValid}`
        var today = new Date();
        var tomorrow = new Date();
        tomorrow.setDate(today.getDate() + daysValid);
        await client.query('delete from invites where valid_until < NOW();');
        const query = await client.query<{ id: string, valid_until: string }>('insert into invites (valid_until, granted_by) values($1, $2) RETURNING id,valid_until;', [tomorrow.toISOString(), id]);
        if (query.rowCount != 1) {
            throw `Wrong number of rows ${query.rowCount}`;
        }
        const result = query.rows[0];
        return {
            id: result.id,
            validUntill: result.valid_until
        };
    } finally {
        client.release();
    }
}

export async function validateInvite(invite: string) {
    const client = await poolConnect();
    try {
        var today = new Date();
        var tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        await client.query('delete from invites where valid_until < NOW();');
        const query = await client.query<db_invite>('select * from invites where id = $1;', [invite]);
        if (query.rowCount != 1) {
            return undefined;
        }
        const result = query.rows[0];
        const query2 = await client.query<db_user>('select * from users where id = $1;', [result.granted_by]);
        const result2 = query2.rows[0];

        return {
            granted_by: result2.name,
            validUntill: result.valid_until
        };
    } finally {
        client.release();
    }

}

export async function getUser(id: string) {
    const client = await poolConnect();
    try {
        const query = await client.query<db_user>('select * from users where id = $1;', [id]);
        if (query.rowCount == 0) {
            return undefined;
        }
        if (query.rowCount != 1) {
            throw `Wrong number of rows ${query.rowCount}`;
        }

        const result = query.rows[0];
        return result;
    } finally {
        client.release();
    }
}

export async function generateWebAuth(userId: string, authenticationId: string, publicKey: common.Jwk, signCount: number, comment: string) {
    const client = await poolConnect();
    try {
        const values = [userId, authenticationId, publicKey, signCount, comment];
        await client.query('insert into webauth_login (user_id, id, publicKeyJwk, signCount, comment) values($1, $2, $3, $4, $5);', values);
    } finally {
        client.release();
    }
    return userId;
}

export async function getWebAuth(id: string) {
    const client = await poolConnect();
    try {
        const query = await client.query<db_webauth_login>('select * from webauth_login where id = $1 limit 1;', [id]);
        if (query.rowCount == 0) {
            throw new Error("Could not find credential with that ID");
        }
        const credential = query.rows[0];
        return credential;
    } finally {
        client.release();
    }
}

export async function updateWebAuth(id: string, signCount: number) {
    const client = await poolConnect();
    try {
        await client.query<any>('update webauth_login set signcount = $2  where id = $1;', [id, signCount]);
    } finally {
        client.release();
    }


}