// import express from 'express';

// // Initialize the express engine
// const app: express.Application = express();

// // Take a port 3000 for running server.
// const port: number = 3000;

// // Handling '/' Request
// app.get('/', (_req, _res) => {
//     _res.send("TypeScript Wiht Expresss");
// });

// // Server setup
// app.listen(port, () => {
//     console.log(`TypeScript with Express
//          http://localhost:${port}/`);
// });









// src/server.ts
import express from 'express';
const path = require('path')
import { QueryResult, Pool } from 'pg';


const PORT = process.env.PORT || 5000


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.SSL ? false : {
    rejectUnauthorized: false
  }
});



const app = express();
app.set("port", PORT);

var http = require("http").Server(app);


const io = require('socket.io')(http);
// io.on('connection', (socket: Socket) => {
//   socket.on('my other event', (data) => {
//     console.log('I got data. will running another function', data.count);
//   });
// });


app.use(express.static(path.join(__dirname, '../../client/public')))
  .use(express.json())
  .put('/clock', async (req, res) => {
    try {
      const newEntry = req.body;
      const client = await pool.connect();

      const result = await new Promise<QueryResult<any>>((resolve, reject) => client.query('insert into clocks (name, segments, value) values($1, $2, $3) RETURNING id;', [newEntry.name, makeInt(newEntry.segments), makeInt(newEntry.value)],
        (err, result) => {
          if (err)
            reject(err);
          else
            resolve(result);
        }));
      res.send(result);
      client.release();
      io.sockets.emit('update_clock', { id: result.rows[0].id, segments: newEntry.segments, name: newEntry.name, value: newEntry.value });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  }).patch('/clock', async (req, res) => {
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
  }).delete('/clock', async (req, res) => {
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
const server = http
  .listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
