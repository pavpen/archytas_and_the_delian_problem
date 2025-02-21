import WebGL from 'three/examples/jsm/capabilities/WebGL';
import * as React from 'react';
import { Label, ThreeSceneRenderer } from '../three_scene_renderer';
import { ArchytasModel, ArchytasModelLabels } from '../archytas_model/archytas_model';
import { ColumnVector2 } from '../geometry/vectors_and_matrices';
import { RangedScalar } from '../components/ranged_scalar';
import { Accordion } from '../components/accordion';
import { ColorThemeUpdaterContext } from '../components/color_theme_menu';
import { StyleThemeNames, StyleThemes } from '../style_themes';


class ThreeSceneInitializerParams {
    errorMessageContainerElement: HTMLElement = null;
    canvasContainerElement: HTMLElement = null;
    ptAElement: HTMLElement = null;
    ptOElement: HTMLElement = null;
    ptPElement: HTMLElement = null;
    ptQElement: HTMLElement = null;
    ptRElement: HTMLElement = null;
    ptSElement: HTMLElement = null;
    ptTElement: HTMLElement = null;
    angleOap_deg: number = NaN;
}

class ArchytasSceneUpdater {
    readonly params = new ThreeSceneInitializerParams();
    private renderer: ThreeSceneRenderer = null;
    model: ArchytasModel = null;
    private labels: ArchytasModelLabels = null;
    private initialized = false;

    constructor(
        readonly styleThemes: StyleThemes,
    ) { }

    tryInitialize() {
        const readyToInitialize = this.readyToInitialize;

        if (!this.initialized && readyToInitialize) {
            this.initialize();
            this.initialized = true;
        } else if (this.initialized && !readyToInitialize) {
            this.uninitialize();
        }
    }

    private uninitialize() {
        this.initialized = false;
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
    }

    private get readyToInitialize(): boolean {
        /**
         * We need all {@link params} to have a value before we can
         * initialize.
         */
        for (let [key, value] of Object.entries(this.params)) {
            if (!value && value !== 0) {
                return false;
            }
        }

        return true;
    }

    private get angleOapCompliment_rad(): number {
        return (90 - this.params.angleOap_deg) / 180 * Math.PI;;
    }

    private initialize() {
        const params = this.params;
        const { canvasContainerElement, errorMessageContainerElement: errorMessagContainerElement } = params;

        if (!WebGL.isWebGL2Available()) {
            errorMessagContainerElement.appendChild(
                WebGL.getWebGL2ErrorMessage()
            );
        }

        if (!this.renderer) {
            this.renderer = new ThreeSceneRenderer(
                canvasContainerElement,
                canvasContainerElement.clientWidth,
                canvasContainerElement.clientHeight);
            this.renderer.animate();
        }
        if (!this.labels) {
            this.labels = {
                ptA: new Label(params.ptAElement, new ColumnVector2(-0.5, +0.5)),
                ptO: new Label(params.ptOElement, new ColumnVector2(+0.5, +0.5)),
                ptP: new Label(params.ptPElement, new ColumnVector2(+0.0, -0.5)),
                ptQ: new Label(params.ptQElement, new ColumnVector2(+0.0, +0.5)),
                ptR: new Label(params.ptRElement, new ColumnVector2(+0.0, -0.5)),
                ptS: new Label(params.ptSElement, new ColumnVector2(+0.0, -0.5)),
                ptT: new Label(params.ptTElement, new ColumnVector2(+0.0, -0.5))
            };
            if (this.model) {
                this.model.updateLabelPositions(this.angleOapCompliment_rad);
            }
        }
        if (!this.model) {
            this.model =
                new ArchytasModel(
                    this.renderer,
                    this.styleThemes['dark'],
                    this.labels
                ).updateLabelPositions(this.angleOapCompliment_rad);
        }
    }

    handleResize() {
        const canvasContainerElement = this.params.canvasContainerElement;
        this.renderer.setSize(
            canvasContainerElement.clientWidth,
            canvasContainerElement.clientHeight);
    }

    set angleOap_deg(value: number) {
        this.params.angleOap_deg = value;
        this.model.angleOapCompliment_rad = this.angleOapCompliment_rad;
    }

    setTheme(themeName: StyleThemeNames): this {
        const style = this.styleThemes[themeName];

        if (style) {
            this.model.setStyle(style);
        } else {
            console.error(
                `Ignoring unrecognized theme name: ${themeName}. Known theme ` +
                `names: ${Object.keys(this.styleThemes).join(', ')}`);
        }

        return this;
    }
}

/**
 * We put all the state in this component, and pass in an
 * {@link ArchytasSceneUpdater} which allows us to propagate state changes
 * without re-rendering React components.
 * 
 * @remarks
 * 
 * Even though React's way of reflecting state changes is by re-rendering, we
 * want to avoid it here.  Re-rendering the 3D canvas involves unloading it
 * from the graphics card, re-calculating all vertices, and re-uploading the
 * new scene to the graphics card.
 * 
 * Ideally, we want to be able to perform this operation, at least, hundreds
 * of times per second so we can update the scene by dragging a slider.
 * Re-uploading a scene every time becomes unpleasantly noticable, even on a
 * desktop.
 */
function ArchytasControls(props: { sceneUpdater: ArchytasSceneUpdater, debug?: boolean }) {
    const { sceneUpdater, debug } = props;

    const [angleAop_deg, setAngleAop_deg] = React.useState(90);
    const [cylinderSurfaceOpacity, setCylinderSurfaceOpacity] = React.useState(0.5);
    const [cylinderWireframeOpacity, setCylinderWireframeOpacity] = React.useState(1);
    const [torusSurfaceOpacity, setTorusSurfaceOpacity] = React.useState(0.5);
    const [torusWireframeOpacity, setTorusWireframeOpacity] = React.useState(1);
    const [coneSurfaceOpacity, setConeSurfaceOpacity] = React.useState(0.5);
    const [coneWireframeOpacity, setConeWireframeOpacity] = React.useState(1);
    const [endVertexIdx, setEndVertexIdx] = React.useState(0);

    sceneUpdater.params.angleOap_deg = angleAop_deg;

    React.useEffect(
        () => { sceneUpdater.angleOap_deg = angleAop_deg; },
        [angleAop_deg]);
    React.useEffect(() => {
        const material = sceneUpdater.model.materials.cylinderSurface;
        material.opacity = cylinderSurfaceOpacity;
        material.needsUpdate = true;
    }, [cylinderSurfaceOpacity]);
    React.useEffect(() => {
        const material = sceneUpdater.model.materials.cylinderWire;
        material.opacity = cylinderWireframeOpacity;
        material.needsUpdate = true;
    }, [cylinderWireframeOpacity]);
    React.useEffect(() => {
        const material = sceneUpdater.model.materials.torusSurface;
        material.opacity = torusSurfaceOpacity;
        material.needsUpdate = true;
    }, [torusSurfaceOpacity]);
    React.useEffect(() => {
        const material = sceneUpdater.model.materials.torusWire;
        material.opacity = torusWireframeOpacity;
        material.needsUpdate = true;
    }, [torusWireframeOpacity]);
    React.useEffect(() => {
        const material = sceneUpdater.model.materials.coneSurface;
        material.opacity = coneSurfaceOpacity;
        material.needsUpdate = true;
    }, [coneSurfaceOpacity]);
    React.useEffect(() => {
        const material = sceneUpdater.model.materials.coneWire;
        material.opacity = coneWireframeOpacity;
        material.needsUpdate = true;
    }, [coneWireframeOpacity]);

    return <div className="model-controls">
        <RangedScalar id="angle-oap" invertedDirection={true} label="∢OAP:"
            min={0} max={90} value={angleAop_deg} units="&deg;" setValue={setAngleAop_deg} />
        <Accordion id="opacity-controls" label="Opacity">
            <div className="cylinder-controls">
                <label>Cylinder:</label>
                <RangedScalar id="cylinder-surface-opacity" label="Surface:"
                    min={0} max={1} value={cylinderSurfaceOpacity} setValue={setCylinderSurfaceOpacity}
                />
                <RangedScalar id="cylinder-wireframe-opacity" label="Wireframe:"
                    min={0} max={1} value={cylinderWireframeOpacity} setValue={setCylinderWireframeOpacity} />
            </div>
            <div className="torus-controls">
                <label>Torus:</label>
                <RangedScalar id="torus-surface-opacity" label="Surface:"
                    min={0} max={1} value={torusSurfaceOpacity} setValue={setTorusSurfaceOpacity}
                />
                <RangedScalar id="torus-wireframe-opacity" label="Wireframe:"
                    min={0} max={1} value={torusWireframeOpacity} setValue={setTorusWireframeOpacity} />
            </div>
            <div className="cone-controls">
                <label>Cone:</label>
                <RangedScalar id="cone-surface-opacity" label="Surface:"
                    min={0} max={1} value={coneSurfaceOpacity} setValue={setConeSurfaceOpacity}
                />
                <RangedScalar id="cone-wireframe-opacity" label="Wireframe:"
                    min={0} max={1} value={coneWireframeOpacity} setValue={setConeWireframeOpacity} />
            </div>
        </Accordion>
        {debug &&
            <RangedScalar id="end-vertex-idx" label="End vertex index:"
                min={0} max={100} step={1} value={endVertexIdx} setValue={setEndVertexIdx} />
        }
    </div>;
}

export function ArchytasModelWidget(
    props: { debug?: boolean, styleThemes: StyleThemes }
) {
    const { debug, styleThemes } = props;

    const ptCRef = React.useRef<HTMLDivElement>(null);
    const sceneUpdater = new ArchytasSceneUpdater(styleThemes);
    const handleResize = () => {
        sceneUpdater.handleResize();
    };
    let handleResizeInstalled = false;
    let handleThemeChangeInstalled = false;
    const themeUpdater = React.useContext(ColorThemeUpdaterContext);
    const handleThemeChange = (themeName: StyleThemeNames) => {
        sceneUpdater.setTheme(themeName);
    }
    const handleRender = (node: HTMLDivElement) => {
        if (node) {
            if (!handleResizeInstalled) {
                window.addEventListener('resize', handleResize);
                handleResizeInstalled = true;
            }
            if (!handleThemeChangeInstalled) {
                themeUpdater.addEventListener('themeChange', handleThemeChange);
                handleThemeChangeInstalled = true;
            }
        } else {
            if (handleResizeInstalled) {
                window.removeEventListener('resize', handleResize);
                handleResizeInstalled = false;
            }
            if (handleThemeChangeInstalled) {
                themeUpdater.removeEventListener('themeChange', handleThemeChange);
                handleThemeChangeInstalled = false;
            }
        }
    };

    const result = <div className="model-container">
        <ArchytasControls sceneUpdater={sceneUpdater} debug={debug} />
        <div ref={handleRender} className="model-scene">
            <div ref={(node) => { sceneUpdater.params.errorMessageContainerElement = node; sceneUpdater.tryInitialize(); }}
                className="error-message"></div>
            <div ref={(node) => { sceneUpdater.params.canvasContainerElement = node; sceneUpdater.tryInitialize(); }}
                id="canvas-container" suppressHydrationWarning={true}></div>
            {/* Labels that can go on top of the scene canvas: */}
            <div ref={(node) => { sceneUpdater.params.ptAElement = node; sceneUpdater.tryInitialize(); }} id="pt-a-label" className="pt-label">A</div>
            <div ref={ptCRef} id="pt-c-label" className="pt-label">C</div>
            <div ref={(node) => { sceneUpdater.params.ptOElement = node; sceneUpdater.tryInitialize(); }} id="pt-o-label" className="pt-label">O</div>
            <div ref={(node) => { sceneUpdater.params.ptPElement = node; sceneUpdater.tryInitialize(); }} id="pt-p-label" className="pt-label">P</div>
            <div ref={(node) => { sceneUpdater.params.ptQElement = node; sceneUpdater.tryInitialize(); }} id="pt-q-label" className="pt-label">Q</div>
            <div ref={(node) => { sceneUpdater.params.ptRElement = node; sceneUpdater.tryInitialize(); }} id="pt-r-label" className="pt-label">R</div>
            <div ref={(node) => { sceneUpdater.params.ptSElement = node; sceneUpdater.tryInitialize(); }} id="pt-s-label" className="pt-label">S</div>
            <div ref={(node) => { sceneUpdater.params.ptTElement = node; sceneUpdater.tryInitialize(); }} id="pt-t-label" className="pt-label">T</div>
        </div>
    </div>;

    return result;
}
