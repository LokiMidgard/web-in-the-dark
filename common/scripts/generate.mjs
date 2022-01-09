#! /usr/bin/env node
// -*- js -*-

"use strict";


import { promises as fs } from "fs";
// import extract from 'extract-zip';

// import fsync from "fs";
// // import info from "../package.json";
// import path from "path";
// import { minify } from "uglify-js";
// import https from 'https'
// import zlib from 'zlib';

// import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);










const dataStream = await fs.readFile('./src/data.ts');

const dataContent = dataStream.toString();
const reg = /^\s*:?\s*TConnection\s+extends\s+'(?<path>[^']+)'/gm;

let m;
let paths = [];
do {
    m = reg.exec(dataContent);
    if (m) {
        paths.push(m.groups['path'])
    }
} while (m)


let txt = 'export const dumy = {};\nexport type Connections =\n'
let first = true;
for (const p of paths) {
    if (!first)
        txt += ' | '
    else
        txt += '   '
    txt += `'${p}'\n`
    first = false;
}
txt += ';'


fs.writeFile('src/data.g.ts',txt);


// if (!fsync.existsSync('./dist'))
//     await fs.mkdir('./dist')
// if (!fsync.existsSync('./tmp'))
//     await fs.mkdir('./tmp')

// const libFiles = await readFiles('./lib');
// const srcFiles = await readFiles('./src');

// // console.log(libFiles)

// if (!fsync.existsSync('./tmp/assets.zip')) {
//     console.log('Downloading assets')
//     const download = new Promise(resolve => {

//         https.get('https://www.astralvault.net/games/SA/MapEditor/assets.zip', async res => {

//             const path = './tmp/assets.zip';
//             const filePath = fsync.createWriteStream(path);
//             res.pipe(filePath);
//             filePath.on('finish', () => {
//                 filePath.close();
//                 console.log('Download Completed');
//                 resolve();
//             })
//         })
//     });
//     await download;
// }


// console.log('extracting assets...')
// await extract('./tmp/assets.zip', { dir: path.join(__dirname, '..', 'dist', 'assets') })
// console.log('assets extracted')

// console.log('minifiying...')
// const minified = minify(libFiles.concat(srcFiles))

// if (minified.warnings)
//     console.warn(minified.warnings)
// if (minified.error)
//     console.warn(minified.error)

// await fs.writeFile('./dist/TI3SA.min.js', minified.code);
// if (minified.map)
//     await fs.writeFile('./dist/TI3SA.min.js.map', minified.map);

// console.log("minified")

// async function readFiles(p) {
//     const lib = await fs.readdir(p);
//     const libFiles = (await Promise.all(lib.map((x, i) => fs.readFile(path.join(p, x))))).map(x => x.toString());
//     return libFiles;
// }

// console.log('copy local assets');
// copyFolderRecursiveSync('./assets', './dist/')
// copyFolderRecursiveSync('./css', './dist/')

// console.log('copy index.html');
// copyFileSync('index.html', './dist/index.html')
// console.log('Finish');


// function copyFileSync(source, target) {

//     var targetFile = target;

//     // If target is a directory, a new file with the same name will be created
//     if (fsync.existsSync(target)) {
//         if (fsync.lstatSync(target).isDirectory()) {
//             targetFile = path.join(target, path.basename(source));
//         }
//     }

//     fsync.writeFileSync(targetFile, fsync.readFileSync(source));
// }

// function copyFolderRecursiveSync(source, target) {
//     var files = [];

//     // Check if folder needs to be created or integrated
//     var targetFolder = path.join(target, path.basename(source));
//     if (!fsync.existsSync(targetFolder)) {
//         fsync.mkdirSync(targetFolder);
//     }

//     // Copy
//     if (fsync.lstatSync(source).isDirectory()) {
//         files = fsync.readdirSync(source);
//         files.forEach(function (file) {
//             var curSource = path.join(source, file);
//             if (fsync.lstatSync(curSource).isDirectory()) {
//                 copyFolderRecursiveSync(curSource, targetFolder);
//             } else {
//                 copyFileSync(curSource, targetFolder);
//             }
//         });
//     }
// }