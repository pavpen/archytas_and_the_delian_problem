import * as React from 'react';

export const ColorThemeUpdaterContext = React.createContext<ColorThemeUpdater>(null);

type ColorThemeUpdaterEventName = 'themeChange';
type ColorThemeUpdaterEventListener<EventName extends ColorThemeUpdaterEventName> =
    EventName extends 'themeChange' ? (themeName: string, themeUpdater: ColorThemeUpdater) => void : never;

export class ColorThemeUpdater {
    private static lightModeMediaQuery: MediaQueryList = null;
    private userSelectedTheme: string = null;
    private themesFieldSet: HTMLFieldSetElement = null;
    private handleDarkModeOsChange: () => void;
    private themeClassNames: Array<string>;
    private readonly osDefaultThemeDarknessClassName = 'os-default-theme-darkness';
    private themeChangeListeners = new Array<(themeName: string, themeUpdater: ColorThemeUpdater) => void>();

    constructor(
        readonly allowedThemeNames: Iterable<string>,
        readonly darkThemeName = 'dark',
        readonly lightThemeName = 'light'
    ) {
        this.themeClassNames = Array.from(allowedThemeNames, themeName => `${themeName}-theme`);
        this.handleDarkModeOsChange = () => {
            if (this.userSelectedTheme == null) {
                const themeName = ColorThemeUpdater.lightModeMediaQuery.matches ?
                    this.lightThemeName : this.darkThemeName;

                this.applyTheme(themeName);
            }
        };
    }

    private applyTheme(themeName: string): this {
        document.body.classList.remove(...this.themeClassNames);
        document.body.classList.add(`${themeName}-theme`);

        if (this.themesFieldSet) {
            if (this.userSelectedTheme == null) {
                this.themesFieldSet.classList.add(this.osDefaultThemeDarknessClassName);
            } else {
                this.themesFieldSet.classList.remove(this.osDefaultThemeDarknessClassName);
            }
            for (const input of this.themesFieldSet.getElementsByTagName('input')) {
                if (input.value == themeName) {
                    input.checked = true;
                    break;
                }
            }
        }
        this.notifyThemeChangeListeners(themeName);

        return this;
    }

    private notifyThemeChangeListeners(themeName: string) {
        for (const listener of this.themeChangeListeners) {
            listener(themeName, this);
        }
    }

    addEventListener(
        eventName: ColorThemeUpdaterEventName,
        listener: ColorThemeUpdaterEventListener<typeof eventName>
    ): this {
        switch (eventName) {
            case 'themeChange':
                this.themeChangeListeners.push(listener);
                break;
            default:
                throw new Error(`Unrecognized event name: ${eventName}`);
        }

        return this;
    }

    removeEventListener(
        eventName: ColorThemeUpdaterEventName,
        listener: ColorThemeUpdaterEventListener<typeof eventName>
    ): this {
        switch (eventName) {
            case 'themeChange':
                {
                    const idx = this.themeChangeListeners.indexOf(listener);

                    if (idx >= 0) {
                        this.themeChangeListeners.splice(idx, 1);
                    }
                    break;
                }
            default:
                throw new Error(`Unrecognized event name: ${eventName}`);
        }

        return this;
    }

    setThemesFieldSet(node: HTMLFieldSetElement): this {
        this.themesFieldSet = node;
        if (node == null) {
            this.detachFromDom();
        } else {
            this.attachToDom();
        }

        return this;
    }

    private detachFromDom() {
        if (ColorThemeUpdater.lightModeMediaQuery != null) {
            ColorThemeUpdater.lightModeMediaQuery.removeEventListener(
                'change', this.handleDarkModeOsChange);
        }
    }

    private attachToDom() {
        if (ColorThemeUpdater.lightModeMediaQuery == null) {
            ColorThemeUpdater.lightModeMediaQuery =
                window.matchMedia('(prefers-color-scheme: light)')
        }
        ColorThemeUpdater.lightModeMediaQuery.removeEventListener(
            'change', this.handleDarkModeOsChange);
        ColorThemeUpdater.lightModeMediaQuery.addEventListener(
            'change', this.handleDarkModeOsChange);
        this.handleDarkModeOsChange();
    }

    handleUserSelect(element: HTMLInputElement) {
        const themeName = element.value;

        this.userSelectedTheme = themeName;
        this.applyTheme(themeName);
    }
}

export function ColorThemeMenu(
    props: {
        themeUpdater: ColorThemeUpdater,
        radioGroupName?: string,
        idPrefix?: string
    }
) {
    const { themeUpdater } = props;
    const radioGroupName = props.radioGroupName || 'color-theme';
    const idPrefix = props.idPrefix || 'color-theme';
    const buttonId = `${idPrefix}-button`;

    return <div className="color-theme-button-container">
        <input id={buttonId} type="checkbox" className="color-theme-button" aria-label="Select color theme" />
        <label htmlFor={buttonId}>🎨</label>
        <div className="color-theme-item-container">
            <fieldset ref={(node) => { themeUpdater.setThemesFieldSet(node); }}>
                <legend>Color theme</legend>
                {Array.from(themeUpdater.allowedThemeNames, (themeName, idx) => {
                    const id = `${idPrefix}-${themeName}`;

                    return <div className="color-theme-item" key={idx}>
                        <input id={id} type="radio" name={radioGroupName} value={themeName}
                            onInput={(e) => themeUpdater.handleUserSelect(e.target as HTMLInputElement)} />
                        <label htmlFor={id}>{themeName}</label>
                    </div>;
                }
                )}
            </fieldset>
        </div>
    </div>;
}
