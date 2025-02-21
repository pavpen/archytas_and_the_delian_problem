import * as cssDarkColorVariablesModule from '../scss/_dark_color_variables.scss';
import * as cssLightColorVariablesModule from '../scss/_light_color_variables.scss';
import * as cssLineStyleVariablesModule from '../scss/_line_variables.scss';
import { CssColorVariables, CssLineVariables, Style } from './style';

export type StyleThemeNames = 'dark' | 'light';
export type StyleThemes = {
    [key in StyleThemeNames]: Style
};

function readModule(cssModule: object) {
    return 'locals' in cssModule ? cssModule.locals : cssModule;
}

const cssDarkColorVariables = readModule(cssDarkColorVariablesModule) as CssColorVariables;
const cssLightColorVariables = readModule(cssLightColorVariablesModule) as CssColorVariables;
const cssLineStyleVariables = readModule(cssLineStyleVariablesModule) as CssLineVariables;

export const styleThemes: StyleThemes = {
    'dark': new Style(cssDarkColorVariables, cssLineStyleVariables),
    'light': new Style(cssLightColorVariables, cssLineStyleVariables),
};
