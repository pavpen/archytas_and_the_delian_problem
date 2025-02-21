import * as THREE from 'three';

export class Color {
    static fromCssColor(colorSpec: string) {
        var r = NaN, g = NaN, b = NaN, a = NaN;

        if (colorSpec.startsWith('#')) {
            if (colorSpec.length == 4) {
                // '#RGB':
                r = parseInt(colorSpec[1], 16);
                r = (r << 4) + r;
                g = parseInt(colorSpec[2], 16);
                g = (g << 4) + g;
                b = parseInt(colorSpec[3], 16);
                b = (b << 4) + b;
                a = 255;
            } else if (colorSpec.length == 5) {
                // '#RGBA'
                r = parseInt(colorSpec[1], 16);
                r = (r << 4) + r;
                g = parseInt(colorSpec[2], 16);
                g = (g << 4) + g;
                b = parseInt(colorSpec[3], 16);
                b = (b << 4) + b;
                a = parseInt(colorSpec[4], 16);
                a = (a << 4) + a;
            } else if (colorSpec.length == 7) {
                // '#RRGGBB':
                r = parseInt(colorSpec.substring(1, 3), 16);
                g = parseInt(colorSpec.substring(3, 5), 16);
                b = parseInt(colorSpec.substring(5, 7), 16);
                a = 255;
            } else if (colorSpec.length == 9) {
                // '#RRGGBBAA':
                r = parseInt(colorSpec.substring(1, 3), 16);
                g = parseInt(colorSpec.substring(3, 5), 16);
                b = parseInt(colorSpec.substring(5, 7), 16);
                a = parseInt(colorSpec.substring(7, 9), 16);
            } else {
                throw new Error(`Invalid color specification: ${colorSpec}`);
            }
        } else {
            throw new Error(`Color specification not supported: ${colorSpec}`);
        }

        if (r != r || g != g || b != b || a != a) {
            throw new Error(`Invalid color specification: ${colorSpec}`);
        }

        const rgbaInt = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;

        return new Color(rgbaInt);
    }

    rgbaInt: number;

    constructor(rgbaInt: number) {
        this.rgbaInt = rgbaInt;
    }

    get r() {
        return this.rgbaInt >>> 24;
    }

    get g() {
        return (this.rgbaInt >>> 16) & 0xff;
    }

    get b() {
        return (this.rgbaInt >>> 8) & 0xff;
    }

    get a() {
        return this.rgbaInt & 0xff;
    }

    get rgbInt(): number {
        return this.rgbaInt >>> 8;
    }

    toThreeJsColor() {
        return new THREE.Color(this.rgbInt);
    }

    toCssHex() {
        const colorInt = this.a == 255 ? (this.rgbaInt >>> 8) : this.rgbaInt;
        const colorLen = this.a == 255 ? 6 : 8;

        return `#${colorInt.toString(16).padStart(colorLen, '0')}`;
    }
}

export interface CssColorVariables {
    error: string;
    primary: string;
    primaryBg: string;
    primaryFg: string;
    primaryVariant: string;
    secondary: string;
    secondaryBg: string;
    secondaryVariant: string;
}

export interface CssLineVariables {
    mainLineThickness_px: string;
    mainLineIsDashed: string;
    secondaryLineThickness_px: string;
    secondaryLineIsDashed: string;
    auxiliaryLineThickness_px: string;
    auxiliaryLineIsDashed: string;
}

export interface CssStyleVariables {
    colors: CssColorVariables;
    lineStyles: CssLineVariables;
}

export class ColorPalette {
    error: Color;
    primary: Color;
    primaryBg: Color;
    primaryFg: Color;
    primaryVariant: Color;
    secondary: Color;
    secondaryBg: Color;
    secondaryVariant: Color;

    constructor(cssVariables: CssColorVariables) {
        this.error = Color.fromCssColor(cssVariables.error);
        this.primary = Color.fromCssColor(cssVariables.primary);
        this.primaryBg = Color.fromCssColor(cssVariables.primaryBg);
        this.primaryFg = Color.fromCssColor(cssVariables.primaryFg);
        this.primaryVariant = Color.fromCssColor(cssVariables.primaryVariant);
        this.secondary = Color.fromCssColor(cssVariables.secondary);
        this.secondaryBg = Color.fromCssColor(cssVariables.secondaryBg);
        this.secondaryVariant = Color.fromCssColor(cssVariables.secondaryVariant);
    }
}

function parseBoolean(value: string): boolean {
    const trueValues = ['true', 'yes', 'on', '1'];
    const falseValues = ['false', 'no', 'off', '0'];

    value = value.toLowerCase();
    if (trueValues.includes(value)) {
        return true;
    } else if (falseValues.includes(value)) {
        return false;
    } else {
        throw new Error(`Unrecognized boolean serialization: ${value}`);
    }
}

export class LineStyle {
    mainThickness_px: number;
    mainIsDashed: boolean;
    secondaryThickness_px: number;
    secondaryIsDashed: boolean;
    auxiliaryThicknes_px: number;
    auxiliaryIsDashed: boolean;

    constructor(cssVariables: CssLineVariables) {
        this.mainThickness_px = parseFloat(cssVariables.mainLineThickness_px);
        this.mainIsDashed = parseBoolean(cssVariables.mainLineIsDashed);
        this.secondaryThickness_px = parseFloat(cssVariables.secondaryLineThickness_px);
        this.secondaryIsDashed = parseBoolean(cssVariables.secondaryLineIsDashed);
        this.auxiliaryThicknes_px = parseFloat(cssVariables.auxiliaryLineThickness_px);
        this.auxiliaryIsDashed = parseBoolean(cssVariables.auxiliaryLineIsDashed);
    }
}

export class Style {
    readonly colors: ColorPalette;
    readonly lineStyles: LineStyle;

    constructor(
        cssColorVariables: CssColorVariables,
        cssLineVariables: CssLineVariables
    ) {
        this.colors = new ColorPalette(cssColorVariables);
        this.lineStyles = new LineStyle(cssLineVariables);
    }
}
