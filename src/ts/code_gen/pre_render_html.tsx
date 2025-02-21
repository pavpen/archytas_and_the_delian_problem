import { renderToString } from 'react-dom/server';
import * as Fs from 'node:fs/promises';
import * as Path from 'node:path';

import { ArchytasPage } from '../content/archytas_page';
import * as React from 'react';



/**
 * Pre-renders index.html.  The resulting widget tree is hydrated at run time.
 */
async function run() {
    const outputPath = `build/dist/index.html`;
    let fileHandle;

    try {
        try {
            await Fs.mkdir(Path.dirname(outputPath));
        } catch (e) {
            // We want to create the directory path, only if doesn't
            // exist. If it does, we can continue.
            if (!['EEXIST'].includes(e.code)) {
                throw e;
            }
        }

        console.log(`Writing: ${outputPath}`);

        fileHandle = await Fs.open(outputPath, 'w');

        fileHandle.writeFile(`<!DOCTYPE html>\n${renderToString(<ArchytasPage />)}`);
    } finally {
        await fileHandle?.close();
    }
}

run();