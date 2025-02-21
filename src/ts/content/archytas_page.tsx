import * as React from 'react';
import { ArchytasArticle } from './archytas_article';
import { ColorThemeMenu, ColorThemeUpdater, ColorThemeUpdaterContext } from '../components/color_theme_menu';
import { styleThemes } from '../style_themes';
import { ArchytasModelWidget } from './archytas_3d_model';


export function ArchytasPage() {
    const themeNames = Object.keys(styleThemes);
    const themeUpdater = new ColorThemeUpdater(themeNames, 'dark', 'light');

    return <html lang="en">
        <head>
            <meta charSet="utf-8" />
            <title>Archytas Model</title>
            <link rel="stylesheet" href="default.css" />
            {/* https://webhint.io/docs/user-guide/hints/hint-meta-viewport/?source=devtools: */}
            <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="dark-theme">
            <ColorThemeUpdaterContext.Provider value={themeUpdater}>
                <ArchytasArticle />
                <ArchytasModelWidget styleThemes={styleThemes} />
                <ColorThemeMenu themeUpdater={themeUpdater} />
            </ColorThemeUpdaterContext.Provider>
            <script src="bundle.js"></script>
        </body>
    </html>
}