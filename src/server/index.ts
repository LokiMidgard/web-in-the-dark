// src/server.ts
import * as express from "express";
const path = require('path')
const { Pool } = require('pg');


const PORT = process.env.PORT || 5000


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.SSL ? false :  {
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


app.use(express.static(path.join(__dirname, '../public')))
  .use(express.json())
  .put('/clock', async (req, res) => {
    try {
      const newEntry = req.body;
      const client = await pool.connect();
      const result = await new Promise((resolve, reject) => client.query('insert into clocks (name, segments, value) values($1, $2, $3) RETURNING id', [newEntry.name, newEntry.segments, newEntry.value],
        (err, result) => {
          if (err)
            reject(err);
          else
            resolve(result);
        }));
      res.send(result);
      client.release();
      io.sockets.emit('update_clock', newEntry);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  }).patch('/clock', async (req, res) => {
    try {
      const newEntry = req.body;
      const client = await pool.connect();
      if (newEntry.id) {
        console.log(newEntry)

        const result = await new Promise((resolve, reject) => client.query('update clocks set name = $1, segments = $2, value = $3where id = $4', [newEntry.name, newEntry.segments, newEntry.value, newEntry.id],
          (err, result) => {
            if (err)
              reject(err);
            else
              resolve(result);
          }));
        res.status(200).send({ id: newEntry.id });
        io.sockets.emit('update_clock', { id: newEntry.id, segments: newEntry.segments, name: newEntry.name, value: newEntry.value });

      } else {
        res.status(500).send("ERROR no id");
      }
      client.release();
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  })
  .get('/clock', async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM clocks');
      res.send((result) ? result.rows : []);
      client.release();
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  });


// start our simple server up on localhost:3000
const server = http
  .listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));

