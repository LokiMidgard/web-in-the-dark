import { QueryResult } from 'pg';
import { poolConnect } from './db'

type db_clock = { id: number, name: string, segments: number, value: number }

export async function createClock(name: string, segments: number, value: number) {
    const client = await poolConnect();
    try {

        const result = await client.query<db_clock>('insert into clocks (name, segments, value) values($1, $2, $3) RETURNING id, name, segments, value;', [name, segments, value]);
        return result.rows[0];
    } finally {
        client.release();
    }
}


export async function updateClock(id: number, name?: string, segments?: number, value?: number) {
    const client = await poolConnect();
    try {
        let index = 1;
        let values = [];
        let insertString = ''
        if (name) {
            if(index>1)
            insertString+=', '
            values.push(name);
            insertString += ` name = $${index}`;
            index++;
        }
        if (segments) {
            if(index>1)
            insertString+=', '
            values.push(segments);
            insertString += ` segments = $${index}`;
            index++;
        }
        if (value) {
            if(index>1)
            insertString+=', '
            values.push(value);
            insertString += ` value = $${index}`;
            index++;
        }
        if (values.length > 0) {
            const update = `update clocks set ${insertString} where id = $${index} returning id, name, segments, value`
            values.push(id);
            const result = await client.query<db_clock>(update, values);
            return result.rows[0];
        }
        return undefined;
    } finally {
        client.release();
    }
}

export async function deleteClock(id: number) {
    const client = await poolConnect();
    try {
        const result = await new Promise((resolve, reject) => client.query('delete from clocks where id = $1', [id],
            (err, result) => {
                if (err)
                    reject(err);
                else
                    resolve(result);
            }));
    } finally {
        client.release();
    }
}

export async function getClocks() {
    const client = await poolConnect();
    let result: QueryResult<db_clock>;
    try {
        result = await client.query('SELECT * FROM clocks');
        return result.rows
    } finally {
        client.release();
    }

}