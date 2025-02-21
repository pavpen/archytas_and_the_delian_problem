import { renderToString } from 'react-dom/server';
import * as Fs from 'node:fs/promises';
import * as Path from 'node:path';

import { figureConfigs } from './dev_fig_config';
import { sceneGetBoundingBoxInBrowser } from '../../../src/ts/svg/browser_helper';



/**
 * Outputs standalone SVG files.  This is used mainly in development.  It is
 * not necessary for building HTML with embedded SVGs.
 */
async function run() {
    let fileHandle;

    for (const config of figureConfigs) {
        try {
            const scene = config.buildScene();
            const outputPath = `build/${config.devOutputPath}`;

            scene.linkCss('../dist/default.css');

            const boundingBox = await sceneGetBoundingBoxInBrowser(scene, ['../dist/default.css']);

            scene.setViewBox(scene.calculateViewBox(boundingBox));

            const domTree = scene.toElement();

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

            fileHandle.writeFile(renderToString(domTree));
        } finally {
            await fileHandle?.close();
        }
    }
}

run();