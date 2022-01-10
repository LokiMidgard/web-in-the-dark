#! /usr/bin/env node
// -*- js -*-

"use strict";


import { promises as fs } from "fs";



import * as ts from 'typescript';
import { Project, StructureKind } from "ts-morph";
import { randomUUID } from "crypto";


async function work() {


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


    await fs.writeFile('src/data.g.ts', txt);


    const parsedCMD = ts.getParsedCommandLineOfConfigFile(
        `tsconfig.json`,
        undefined,
        ts.sys as any
    );

    // // const files = parsedCMD!.fileNames;
    // const files = ['./src/data.ts'];

    // console.log(files)
    // const program = ts.createProgram(files, parsedCMD!.options);

    // const checker = program.getTypeChecker();
    // const sourceFile = program.getSourceFile('./src/data.ts')!;

    // const s = ts.createSourceFile('test.ts', 'import * as x from "./src/data.ts" ; const shouldBeFalse = x.needsAuthentication("bar")',ts.ScriptTarget.ESNext);

    // ts.forEachChild(s, (node: ts.Node) => {
    //     if (ts.isVariableStatement(node)) {
    //         const type = checker.getTypeAtLocation(node.declarationList.declarations[0].getChildren().filter(ts.isCallExpression)[0]);
    //         console.log(checker.typeToString( type));

    //     }
    // });


    // initialize
    const project = new Project({
        // Optionally specify compiler options, tsconfig.json, in-memory file system, and more here.
        // If you initialize with a tsconfig.json, then it will automatically populate the project
        // with the associated source files.
        // Read more: https://ts-morph.com/setup/
       
    });

    // add source files
    project.addSourceFilesAtPaths("src/**/*.ts");


    function Test(path: string) {

        const dataFile = project.createSourceFile(`src/${randomUUID()}.ts`, `import * as x from "./data" ; const check = x.needsAuthentication("${path}")`);
        const declaraiton = dataFile.getVariableDeclarationOrThrow('check');
        const result = project.getTypeChecker().getTypeText(declaraiton.getType());
        return result.toLowerCase() == 'true';
    }


    const pathChecks = paths.map(x => [x, Test(x)]).reduce((p: any, v: any) => {
        p[v[0]] = v[1];
        return p;
    }, {});

    let authenticationText = `export const lookup = ${JSON.stringify(pathChecks)} as const;`
    await fs.writeFile('src/data-authentication.g.ts', authenticationText);

}

work();