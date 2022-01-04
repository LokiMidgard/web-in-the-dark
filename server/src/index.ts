import express, { Request, Response } from 'express';
import * as common from 'blade-common';
import path from 'path';
import { QueryResult, Pool } from 'pg';
import * as pg from 'pg';
import socket from 'socket.io';
import cookieparser from 'cookie-parser';
import http from "http";
import { AuthenticationForbidden as NotAuthenticated, AuthenticationRequired as Authenticated, db_invite, db_local_login, db_user, registerAccount } from './authentication';
import session from 'express-session';
import passport, { Passport } from 'passport';
import { Strategy } from 'passport-local';
import flash from 'connect-flash';
import bcryptr from 'bcryptjs';
import { randomUUID } from 'crypto';
const PORT = process.env.PORT || 5000


declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SESSION_SECRET_KEY: string
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
      console.info('Generating default user', defaultUser);
      const userQuery = await client.query<db_local_login>('select * from local_login where login = $1;', [process.env.DEFAULT_USER]);
      if (userQuery.rowCount == 0) {
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

async function getInviter(data: common.RegsiterAccount) {

  if (!data.invite) {
    return undefined;
  }
  const client = await pool.connect();
  try {
    const userQuery = await client.query<db_invite>('select * from invites where id = $1;', [data.invite]);
    if (userQuery.rowCount == 0) {
      return undefined;
    }
    return userQuery.rows[0];
  } finally {
    client.release();
  }

}


async function generateUser(data: common.RegsiterAccount, options?: { ignoreInvite: boolean }): Promise<db_user> {
  const inviter = await getInviter(data);
  if (!inviter && !(options?.ignoreInvite ?? false))
    throw 'Ivite coulde not be found'
  const userId: string = randomUUID();
  const name = data.name;

  if (common.isLogin(data.authentication)) {
    const password = data.authentication.password
    const login = data.authentication.login


    const hash = password ? await async function (password: string) {
      const salt = await bcryptr.genSalt();
      const hash = await bcryptr.hash(password, salt);
      return hash;
    }(password) : undefined;


    const client = await pool.connect();
    try {
      let userQuery: QueryResult<db_user> | undefined
      try {

        await client.query('begin;');
        userQuery = await client.query('insert into users (id, name, granted_by) values($1, $2, $3);', [userId, name, inviter?.granted_by ?? null]);
        await client.query('insert into local_login (user_id, login, password) values($1, $2, $3);', [userId, login, hash]);
        if (data.invite)
          await client.query('delete from invites where id = $1;', [data.invite]);
      } finally {
        await client.query('end;');
      }


      if (!userQuery || userQuery.rowCount != 1) {
        throw 'Failed to insert'
      }

      return userQuery.rows[0];
    } finally {
      client.release();
    }
  }
  else {
    throw 'Unsupported authentication method'
  }


}

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
  .post('/auth/password/check', async (req, res) => {
    const data = req.body as common.CheckLogin;
    try {
      const client = await pool.connect();
      let result: QueryResult<any>;
      try {
        result = await client.query('SELECT * FROM local_login where login = $1;', [data.login]);
        res.status(result.rowCount == 0 ? 404 : 200).send();
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  })
  .post('/auth/password/register', NotAuthenticated, async (req, res, next) => {
    try {
      const data = req.body as common.RegsiterAccount<common.Login>;
      const user = await generateUser(data)
      console.log('generated user')
      passport.authenticate('local', (err, user, info) => {
        if (user) {
          req.login(user, (err) => {
            if (err)
              res.status(500).send(err);
            else
              res.status(200).send(user);
          });
        } else {

          console.warn('callback authenticate', err, user, info)
          res.status(500).send('no user?');
        }
      })({
        body: {
          login: data.authentication.login,
          password: data.authentication.password
        }
      }, res, next)
      // const x = await registerAccount();
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  })
  .post('/auth/password/login', NotAuthenticated, passport.authenticate('local'), (req, res) => {
    res.status(200).send("OK")
  })
  .get('/auth/logout', Authenticated, (req, res) => {
    req.logOut();
    res.redirect('/')
  })
  .get('/api/invite', Authenticated, async (req, res, next) => {
    try {
      try {
        const client = await pool.connect();
        try {
          var today = new Date();
          var tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);
          await client.query('delete from invites where valid_until < NOW();');
          const query = await client.query<{ id: string, valid_until: string }>('insert into invites (valid_until, granted_by) values($1, $2) RETURNING id,valid_until;', [tomorrow.toISOString(), req.user?.id]);
          if (query.rowCount != 1) {
            res.status(500).send(`Wrong number of rows ${query.rowCount}`);
            return
          }
          const result = query.rows[0];
          res.status(200).send({
            link: `${process.env.URL}invite.html#${result.id}`,
            validUntill: result.valid_until
          });
        } finally {
          client.release();
        }
      } catch (err) {
        console.error(err);
        res.status(500).send("Error " + err);
      }

    } catch (err) {
      console.error("sending error login", err);
      res.status(500).send("Error " + err);
    }
  })
  .get('/auth/isAuthenticated', async (req, res, next) => {
    try {

      const isAuthenticated = req.user ? true : false;
      let name = undefined;
      if (isAuthenticated) {

        const client = await pool.connect();
        try {
          var today = new Date();
          var tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);
          const query = await client.query<db_user>('select * from users where id = $1;', [req.user?.id]);
          if (query.rowCount != 1) {
            res.status(500).send(`Wrong number of rows ${query.rowCount}`);
            return
          }
          const result = query.rows[0];
          name = result.name;
        } finally {
          client.release();
        }
      }

      const data: common.isAuthenticated = {
        isAuthenticated: req.user ? true : false,
        userName: name
      };
      res.status(200).send(data);

    } catch (err) {
      console.error("sending error login", err);
      res.status(500).send("Error " + err);
    }
  });

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

