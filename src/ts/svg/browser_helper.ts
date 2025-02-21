import { renderToString } from 'react-dom/server';
import puppeteer, { Browser, Viewport } from 'puppeteer-core';
import { BoundingBox2, SvgScene } from './svg_scene';
import * as React from 'react';

/**
 * Calculates the bounding box in usuer coordinates of a scene rendered as SVG
 * in a browser.
 * 
 * You may need to calculate this bounding box, if you want to display the
 * scene SVG as a standalone illustration.  SVG uses user coordinates for
 * specifying SVG curves.  However, SVG curves and text can be styled with CSS
 * which uses viewport units (such as CSS pixels, `em`s, etc.).
 * 
 * When specifying the SVG `viewBox` attribute, which determines which region
 * of the SVG canvas in user coordinates will be visible, you need to use user
 * coordinates.  However, there's no way to know how much CSS styling (e.g.,
 * line thickness, text size, font, etc.) will add to the bounding box of the
 * unstyled SVG.
 * 
 * This function renders, and styles the scene SVG in a browser, then measures
 * the bounding box of the rendered result.
 * 
 * Note: Use this function outside of a Web page. It requires a browser
 * instance, such as a headless Chrome process.
 * 
 * @param scene - The scene, for which to calculate a bounding box
 * @param cssUrls - URLs of CSS stylesheets to add when rendering the scene SVG
 * @param browser - Browser instance to use for rendering the scene SVG. If
 *    `null`, a new headless browser instance will be launched
 * @param viewport - SVG viewport dimensions to use when rendering the scene
 * @returns The bounding box of the rendered SVG in user coordinates
 */
export async function sceneGetBoundingBoxInBrowser<Dim extends 2 | 3>(
    scene: SvgScene<Dim>,
    cssUrls: Array<string>,
    browser: Browser = null,
    viewport: Viewport = { width: 640, height: 320 }
): Promise<BoundingBox2> {
    let key = 0;
    const head = React.createElement(
        'head',
        {},
        [
            React.createElement('meta', { charSet: 'utf-8', key: key++ }),
            ...cssUrls.map(url => React.createElement('link', { rel: 'stylesheet', href: url, key: key++ })),
            React.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1', key: key++ }),
        ]);
    const initialBBox = scene.getSkeletonBoundingBox();
    const body = React.createElement(
        'body',
        {},
        scene.toElement({
            viewBox: `${initialBBox.minX} ${initialBBox.minY} ${initialBBox.width} ${initialBBox.height}`
        }));
    const doc = React.createElement('html', {}, head, body);
    const bbox = await svgGetBBoxInBrowser(doc, browser, viewport);

    // console.log(bbox);

    return new BoundingBox2(bbox.minX, bbox.minY, bbox.maxX, bbox.maxY);
}

export async function svgGetBBoxInBrowser(
    documentWithSvg: React.JSX.Element,
    browser: Browser = null,
    viewport: Viewport = { width: 640, height: 320 }
) {
    const _browser = browser ?
        browser : await puppeteer.launch({ channel: 'chrome', headless: true });
    const page = await _browser.newPage();

    await page.setViewport(viewport);

    await page.setContent(renderToString(documentWithSvg));
    const boundingRect = await page.evaluate(() => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const nodes = document.getElementsByTagName('svg')[0].children;
        const endI = nodes.length;
        for (let i = 0; i < endI; ++i) {
            const n = nodes[i];

            if (n instanceof SVGGraphicsElement) {
                const box = n.getBBox();
                const x0 = box.x, x1 = box.x + box.width;
                const y0 = box.y, y1 = box.y + box.height;

                minX = Math.min(minX, x0, x1);
                minY = Math.min(minY, y0, y1);
                maxX = Math.max(maxX, x0, x1);
                maxY = Math.max(maxY, y0, y1);
            }
        }

        return { minX, minY, maxX, maxY };
    });

    await _browser.close();

    return boundingRect;
}
