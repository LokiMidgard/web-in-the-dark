#! /usr/bin/env node
// -*- js -*-

"use strict";


import { promises as fs } from "fs";

import { compile, compileFromFile } from 'json-schema-to-typescript'

import * as ts from 'typescript';
import { Project, StructureKind } from "ts-morph";
import { randomUUID } from "crypto";


async function work() {


    console.log('generate REST pathes')
    const dataStream = await fs.readFile('./src/data.ts');

    const dataContent = dataStream.toString();
    const reg = /^\s*:?\s*TConnection\s+extends\s+'(?<path>[^']+)'/gm;

    let m;
    const paths = [];
    do {
        m = reg.exec(dataContent);
        if (m?.groups) {
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


    console.log('Write REST pathes')
    await fs.writeFile('src/data.g.ts', txt);


    const parsedCMD = ts.getParsedCommandLineOfConfigFile(
        `tsconfig.json`,
        undefined,
        ts.sys as any
    );




    console.log('generate types')
    // initialize
    const project = new Project({});

    // add source files
    project.addSourceFilesAtPaths("src/**/*.ts");


    const checker = project.getTypeChecker();
    function Test(path: string) {
        const dataFile = project.createSourceFile(`src/${randomUUID()}.ts`, `import * as x from "./data" ; const check = x.needsAuthentication("${path}")`);
        const declaraiton = dataFile.getVariableDeclarationOrThrow('check');
        const result = checker.getTypeText(declaraiton.getType());
        return result.toLowerCase() == 'true';
    }
    const pathChecks = paths.map(x => [x, Test(x)]).reduce((p: any, v: any) => {
        p[v[0]] = v[1];
        return p;
    }, {});

    let authenticationText = `export const lookup = ${JSON.stringify(pathChecks)} as const;`
    await fs.writeFile('src/data-authentication.g.ts', authenticationText);


    // compile schemas
    console.log('generate schemas')

    await compileFromFile('data/crew.playbook.schema.json').then(ts => fs.writeFile('src/import.g.d.ts', ts))

}

work();