import express, { } from 'express';
import path from 'path';
import * as db from './db/db';
import socket from 'socket.io';
import cookieparser from 'cookie-parser';
import http from "http";
import { Init as AuthenticationInit } from './authentication';
import { Init as GroupInit } from './routes/group';
import session from 'express-session';
import passport from 'passport';
import flash from 'connect-flash';
import { clock, generateUser, getUserByLogin } from './db/db';
import { BladeRouter } from './helper';
import { deleteClock, getClocks, updateClock } from './db/clock';
import { decodeBase64 } from 'bcryptjs';




var env = process.env.NODE_ENV || 'development';
if (env == "development") {
  require('dotenv').config({ path: '../.env' })
}
db.Init();


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


if (!process.env.SESSION_SECRET_KEY) {
  throw 'Define env SESSION_SECRET_KEY'
}


if (process.env.DEFAULT_USER && process.env.DEFAULT_PASSWORD) {
  const defaultUser = process.env.DEFAULT_USER;
  const defaultPassword = process.env.DEFAULT_PASSWORD;
  (async function () {
    if (!process.env.DEFAULT_USER)
      return;
    const user = await getUserByLogin(process.env.DEFAULT_USER);
    if (!user) {

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
  })();
}


const app = express();
app.set("port", PORT);

var httpServer = new http.Server(app);
const io = new socket.Server(httpServer);


if (env == "development") {

  const livereload = require("livereload");
  const connectLivereload = require("connect-livereload");
  // open livereload high port and start to watch public directory for changes
  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, 'public'));
  // ping browser on Express boot, once browser has reconnected and handshaken
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });

  console.warn("live reload activated")
  // monkey patch every served HTML so they know of changes
  app.use(connectLivereload());
}

passport.serializeUser((user, done) => {
  done(undefined, user.id);
})
passport.deserializeUser((user, done) => {
  done(undefined, { id: user as string });
})
app.use(express.static(path.join(__dirname, 'public')))
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
  .use(flash());
BladeRouter.from(app)
  .handle('/clock->put', async (input, req) => {
    console.log(input);

    const result = await clock.createClock(input.name, input.segments, input.value ?? 0);
    io.sockets.emit('update_clock', result);
    return ['success', result];
  }).handle('/clock->patch', async (input, req) => {
    console.log('clock input', input)
    const newEntry = await updateClock(input.id, input.name, input.segments, input.value);
    if (newEntry) {

      io.sockets.emit('update_clock', { id: newEntry.id, segments: newEntry.segments, name: newEntry.name, value: newEntry.value });
      return ['success', newEntry];
    }
    return ['error', undefined]

  }).handle('/clock->delete', async (input, req) => {
    deleteClock(input.id);

    io.sockets.emit('delete_clock', { id: input.id });
    return ["success", undefined];
  })
  .handle('/clock->get', async (input, req) => {
    return ['success', await getClocks()];
  })
  ;

AuthenticationInit(app);
GroupInit(app)

// start our simple server up on localhost:3000
const server = httpServer
  .listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));

