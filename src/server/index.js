var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
//  import express, { json } from 'express';
//  import { resolve } from 'path';
//  import ioserver, { Socket } from 'socket.io';
//  import http from 'http'
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl: {
    //   rejectUnauthorized: false
    // }
    ssl: false
});
const server = express()
    .use(express.static(path.join(__dirname, '../../public')))
    .use(express.json())
    .put('/clock', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newEntry = req.body;
        const client = yield pool.connect();
        console.log(newEntry);
        const result = yield new Promise((resolve, reject) => client.query('insert into clocks (name, segments, value) values($1, $2, $3) RETURNING id', [newEntry.name, newEntry.segments, newEntry.value], (err, result) => {
            if (err)
                reject(err);
            else
                resolve(result);
        }));
        res.send(result);
        client.release();
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Error " + err);
    }
})).patch('/clock', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newEntry = req.body;
        const client = yield pool.connect();
        if (newEntry.id) {
            console.log(newEntry);
            const result = yield new Promise((resolve, reject) => client.query('update clocks set name = $1, segments = $2, value = $3where id = $4', [newEntry.name, newEntry.segments, newEntry.value, newEntry.id], (err, result) => {
                if (err)
                    reject(err);
                else
                    resolve(result);
            }));
            res.status(200).send({ id: newEntry.id });
            io.sockets.emit('update_clock', { id: newEntry.id, segments: newEntry.segments, name: newEntry.name, value: newEntry.value });
            // io.broadcast.emit('update_clock', { id: id, segments: newEntry.segments, name: newEntry.name, value: newEntry.value })
        }
        else {
            res.status(500).send("ERROR no id");
        }
        client.release();
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Error " + err);
    }
}))
    .get('/clock', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield pool.connect();
        const result = yield client.query('SELECT * FROM clocks');
        res.send((result) ? result.rows : []);
        client.release();
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Error " + err);
    }
}));
server
    // .get('/times', (req, res) => res.send(showTimes()))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));
// import ioclient from 'socket.io-client';
// const io = new Server(server);
const io = require('socket.io')(server);
io.on('connection', (socket) => {
    socket.on('my other event', (data) => {
        console.log('I got data. will running another function', data.count);
    });
});
export {};
// import express, { json } from 'express';
// import { resolve } from 'path';
// import ioserver, { Socket } from 'socket.io';
// import http from 'http'
// // const bodyParser = require('body-parser');
// import { join } from 'path';
// const PORT = process.env.PORT || 5000
// import { Pool } from 'pg';
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   // ssl: {
//   //   rejectUnauthorized: false
//   // }
//   ssl: false
// });
// const app = express()
//   .use(express.static(join(__dirname, '../../public')))
//   // .set('views', path.join(__dirname, 'views'))
//   // .set('view engine', 'ejs')
//   // .get('/', (req, res) => res.render('pages/index'))
//   .get('/db', async (req, res) => {
//     try {
//       const client = await pool.connect();
//       const result = await client.query('SELECT * FROM clocks');
//       const results = { 'results': (result) ? result.rows : null };
//       res.send(results);
//       client.release();
//     } catch (err) {
//       console.error(err);
//       res.send("Error " + err);
//     }
//   })
//   .use(json())
//   .put('/clock', async (req, res) => {
//     try {
//       const newEntry = req.body;
//       const client = await pool.connect();
//       console.log(newEntry)
//       const result = await new Promise((resolve, reject) => client.query('insert into clocks (name, segments, value) values($1, $2, $3) RETURNING id', [newEntry.name, newEntry.segments, newEntry.value],
//         (err, result) => {
//           if (err)
//             reject(err);
//           else
//             resolve(result);
//         }));
//       res.send(result);
//       client.release();
//       // io.broadcast.emit('update_clock', newEntry)
//     } catch (err) {
//       console.error(err);
//       res.status(500).send("Error " + err);
//     }
//   }).patch('/clock', async (req, res) => {
//     try {
//       const newEntry = req.body;
//       const client = await pool.connect();
//       if (newEntry.id) {
//         console.log(newEntry)
//         const result = await new Promise((resolve, reject) => client.query('update clocks set name = $1, segments = $2, value = $3where id = $4', [newEntry.name, newEntry.segments, newEntry.value, newEntry.id],
//           (err, result) => {
//             if (err)
//               reject(err);
//             else
//               resolve(result);
//           }));
//         res.status(200).send({ id: newEntry.id });
//         // io.broadcast.emit('update_clock', { id: id, segments: newEntry.segments, name: newEntry.name, value: newEntry.value })
//       } else {
//         res.status(500).send("ERROR no id");
//       }
//       client.release();
//     } catch (err) {
//       console.error(err);
//       res.status(500).send("Error " + err);
//     }
//   })
//   .get('/clock', async (req, res) => {
//     try {
//       const client = await pool.connect();
//       const result = await client.query('SELECT * FROM clocks');
//       res.send((result) ? result.rows : []);
//       client.release();
//     } catch (err) {
//       console.error(err);
//       res.status(500).send("Error " + err);
//     }
//   })
//   // .get('/times', (req, res) => res.send(showTimes()))
// // .listen(PORT, () => console.log(`Listening on ${PORT}`))
// const server = http.createServer(app)
// // const io = socketio(server)
// // let socketIdName = {}
// // io.on('connection', function (socket2) {
// //   console.log('Socket connected ' + socket.id)
// //   socket.on('login', (data) => {
// //     socketIdName[socket.id] = data.username
// //     socket.join(data.username)
// //     socket.emit('logged_in', {
// //       username: data.username,
// //       success: true
// //     })
// //   })
// //   socket.on('chat', (data) => {
// //     if (socketIdName[socket.id]) {
// //       if (data.message.charAt(0) === '@') {
// //         let recipient = data.message.split(' ')[0].substring(1)
// //         io.to(recipient).emit('chat', {
// //           private: true,
// //           sender: socketIdName[socket.id],
// //           message: data.message,
// //           timestamp: new Date()
// //         })
// //       } else {
// //         socket.broadcast.emit('chat', {
// //           sender: socketIdName[socket.id],
// //           message: data.message,
// //           timestamp: new Date()
// //         })
// //       }
// //     }
// //   })
// // })
// server.listen(PORT, () => {
//   console.log(`Server started on http://localhost:${PORT}`)
// })
//   // .listen(PORT, () => console.log(`Listening on ${PORT}`))
