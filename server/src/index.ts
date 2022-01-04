import express, {  } from 'express';
import path from 'path';
import { QueryResult, Pool } from 'pg';
import socket from 'socket.io';
import cookieparser from 'cookie-parser';
import http from "http";
import { Authenticated as Authenticated, db_local_login, db_user, generateUser, Init as AuthenticationInit } from './authentication';
import session from 'express-session';
import passport from 'passport';
import { Strategy } from 'passport-local';
import flash from 'connect-flash';
import bcryptr from 'bcryptjs';

const PORT = process.env.PORT || 5000


declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SESSION_SECRET_KEY: string
      JWT_SECRET: string
      URL: string
      HOST: string
      SSL: "true" | "false" | undefined
      DEFAULT_USER: string | undefined
      DEFAULT_PASSWORD: string | undefined
    }



  }
}


export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.SSL == 'false'
    ? false :
    process.env.SSL == 'true'
      ? true
      : {
        rejectUnauthorized: false
      }
});

if (!process.env.SESSION_SECRET_KEY) {
  throw 'Define env SESSION_SECRET_KEY'
}


if (process.env.DEFAULT_USER && process.env.DEFAULT_PASSWORD) {
  const defaultUser = process.env.DEFAULT_USER;
  const defaultPassword = process.env.DEFAULT_PASSWORD;
  (async function () {

    const client = await pool.connect();
    try {
      const userQuery = await client.query<db_local_login>('select * from local_login where login = $1;', [process.env.DEFAULT_USER]);
      if (userQuery.rowCount == 0) {
        console.info('Generating default user', defaultUser);
        // no default user create one:
        await generateUser({
          name: defaultUser,
          invite: undefined,
          authentication: {
            login: defaultUser,
            password: defaultPassword
          }
        },
          {
            ignoreInvite: true
          });

      }
    } finally {
      client.release();
    }
  })();
}

const app = express();
app.set("port", PORT);

var httpServer = new http.Server(app);
const io = new socket.Server(httpServer);

passport.serializeUser((user, done) => {
  done(undefined, user.id);
})
passport.deserializeUser((user, done) => {
  done(undefined, { id: user as string });
})

passport.use('local', new Strategy({ usernameField: 'login' }, async (userid, password, doen) => {
  const client = await pool.connect();
  try {
    const query = await client.query<db_local_login>('select * from local_login where login = $1;', [userid]);
    if (query.rowCount == 0) {
      doen('login not found', false);
      return;
    }
    const login = query.rows[0];
    if (await bcryptr.compare(password, login.password)) {
      const userQuery = await client.query<db_user>('select * from users where id = $1;', [login.user_id]);

      if (userQuery.rowCount == 0) {
        doen('user not for login found', false);
        return;
      }
      const user = userQuery.rows[0];
      doen(undefined, user);
      return;
    } else {
      doen('password incorrect', false);
      return;
    }

  } catch (e) {
    doen(e);
  }
  finally {
    client.release();
  }


}))

app.use(express.static(path.join(__dirname, '../../client/public')))
  .use(cookieparser())
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use(session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use(flash())
  .put('/clock', Authenticated, async (req, res) => {
    try {
      const newEntry = req.body;
      const client = await pool.connect();
      try {

        const result = await new Promise<QueryResult<any>>((resolve, reject) => client.query('insert into clocks (name, segments, value) values($1, $2, $3) RETURNING id;', [newEntry.name, makeInt(newEntry.segments), makeInt(newEntry.value)],
          (err, result) => {
            if (err)
              reject(err);
            else
              resolve(result);
          }));
        res.send(result);
        io.sockets.emit('update_clock', { id: result.rows[0].id, segments: newEntry.segments, name: newEntry.name, value: newEntry.value });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  }).patch('/clock', Authenticated, async (req, res) => {
    try {
      const newEntry = req.body;
      if (newEntry.id) {
        const client = await pool.connect();
        try {
          const result = await new Promise((resolve, reject) => client.query('update clocks set name = $1, segments = $2, value = $3where id = $4', [newEntry.name, makeInt(newEntry.segments), makeInt(newEntry.value), makeInt(newEntry.id)],
            (err, result) => {
              if (err)
                reject(err);
              else
                resolve(result);
            }));
        } finally {
          client.release();
        }
        res.status(200).send({ id: newEntry.id });
        io.sockets.emit('update_clock', { id: makeInt(newEntry.id), segments: makeInt(newEntry.segments), name: newEntry.name, value: makeInt(newEntry.value) });

      } else {
        res.status(500).send("ERROR no id");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  }).delete('/clock', Authenticated, async (req, res) => {
    try {
      const newEntry = req.body;
      if (newEntry.id) {
        const client = await pool.connect();
        try {
          const result = await new Promise((resolve, reject) => client.query('delete from clocks where id = $1', [makeInt(newEntry.id)],
            (err, result) => {
              if (err)
                reject(err);
              else
                resolve(result);
            }));
        } finally {
          client.release();
        }
        res.status(200).send({ id: newEntry.id });
        io.sockets.emit('delete_clock', { id: newEntry.id });
      } else {
        res.status(500).send("ERROR no id");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  })
  .get('/clock', async (req, res) => {
    try {
      const client = await pool.connect();
      let result: QueryResult<any>;
      try {
        result = await client.query('SELECT * FROM clocks');
      } finally {
        client.release();
      }
      res.send((result) ? result.rows : []);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  })
  ;

  AuthenticationInit(app);

function makeInt(value: any) {
  if (typeof value === "number") {
    return value;
  } if (typeof value === "string") {
    return parseInt(value);
  }
  throw `Not correct type ${typeof value} of ${JSON.stringify(value)}`
}

// start our simple server up on localhost:3000
const server = httpServer
  .listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));

