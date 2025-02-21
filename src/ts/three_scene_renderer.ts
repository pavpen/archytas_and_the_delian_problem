import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ColumnVector, ColumnVector2, ColumnVector3 } from './geometry/vectors_and_matrices';

/** HTMLElement used as a label at a scene 3D coordinate. */
export class Label {
    /**
     * @param element - The HTML label element to position.
     * @param relativeOffset - How much to offset the HTML element's center
     *     from the 3D coordinate projected in Web page space. The horizontal
     *     unit is the element's width, and the vertical unit is the element's
     *     height.
     * @param localPosition - Label center (from which to offset by
     *     `relativeOffset`) in local 3D scene coordinates.
     * @param sceneObjectWithMatrixWorld - A 3D scene object in whose
     *     coordinate system `localPosition` is specified.
     */
    constructor(
        public element: HTMLElement,
        public relativeOffset: ColumnVector<2> = new ColumnVector2(),
        public localPosition: ColumnVector<3> = null,
        public sceneObjectWithMatrixWorld: THREE.Object3D = null
    ) { }
}

/** Updates positions of HTMLElement labels from scene 3D coordinates. */
export class LabelPositioner {
    // Allocated for calculations:
    private readonly _vertex = new ColumnVector3();

    constructor(
        readonly camera: THREE.Camera,
        public veiwportWidth_px: number,
        public viewportHeight_px: number
    ) { }

    positionLabel(label: Label) {
        this._vertex.copy(label.localPosition).
            applyMatrix4(label.sceneObjectWithMatrixWorld.matrixWorld).
            project(this.camera);

        const ptX = (0.5 + this._vertex.x / 2) * this.veiwportWidth_px;
        const ptY = (0.5 - this._vertex.y / 2) * this.viewportHeight_px;

        const x = ptX + (-0.5 + label.relativeOffset.getComponent(0)) * label.element.offsetWidth;
        const y = ptY + (-0.5 + label.relativeOffset.getComponent(1)) * label.element.offsetHeight;;

        label.element.style.left = `${Math.round(x)}px`;
        label.element.style.top = `${Math.round(y)}px`;

        return this;
    }
}

/** Helper for setting up a Three.js scene. */
export class ThreeSceneRenderer {
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly lights: Array<THREE.Light>;
    readonly renderer: THREE.WebGLRenderer;
    readonly controls: OrbitControls;
    readonly labelPositioner: LabelPositioner;
    readonly labels = new Array<Label>();
    private readonly updateLabelPositions: () => void;
    private animated = false;

    constructor(
        private readonly targetElement: HTMLElement,
        viewportWidth_px: number,
        viewportHeight_px: number,
        fieldOfView_deg = 75,
        nearClippingDisctance = 0.1,
        farClippingDistance = 1000
    ) {
        this.scene = new THREE.Scene();

        const aspectRatio = viewportWidth_px / viewportHeight_px;

        this.camera = new THREE.PerspectiveCamera(
            fieldOfView_deg,
            aspectRatio,
            nearClippingDisctance,
            farClippingDistance);
        this.camera.position.set(-2, 2, 2);

        this.lights = [];

        const directionalLight = new THREE.DirectionalLight(0xffffff);

        directionalLight.position.set(0, 10, 0);

        this.lights.push(directionalLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);

        pointLight.position.set(10, -10, -10);

        this.lights.push(pointLight);

        this.lights.forEach(light => this.scene.add(light));

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(viewportWidth_px, viewportHeight_px);

        this.controls = new OrbitControls(
            this.camera, this.renderer.domElement);
        this.controls.target.set(0.5, 1.5, 0);
        this.controls.update();

        this.labelPositioner = new LabelPositioner(
            this.camera, viewportWidth_px, viewportHeight_px);

        const renderer = this;
        this.updateLabelPositions = () => {
            for (const l of renderer.labels) {
                renderer.labelPositioner.positionLabel(l);
            }
        };
        this.controls.addEventListener('change', this.updateLabelPositions);
        this.controls.addEventListener('end', this.updateLabelPositions);

        targetElement.appendChild(this.renderer.domElement);
    }

    animate() {
        if (this.animated) {
            return;
        }

        const sceneRenderer = this;
        const renderFrame = () => {
            if (sceneRenderer.animated) {
                sceneRenderer.renderer.render(sceneRenderer.scene, sceneRenderer.camera);
                requestAnimationFrame(renderFrame);
            }
        };

        this.animated = true;
        renderFrame();
        this.updateLabelPositions();
    }

    unanimate() {
        this.animated = false;
    }

    destroy() {
        this.unanimate();
        this.targetElement.removeChild(this.renderer.domElement);
    }

    setSize(width_px: number, height_px: number) {
        this.renderer.setSize(width_px, height_px);
        this.camera.aspect = width_px / height_px;
        this.camera.updateProjectionMatrix();
        this.labelPositioner.veiwportWidth_px = width_px;
        this.labelPositioner.viewportHeight_px = height_px;
        this.updateLabelPositions();
    }

    /** For debugging: */
    showLights(color: THREE.ColorRepresentation) {
        for (const light of this.lights) {
            if ((light as THREE.DirectionalLight).isDirectionalLight) {
                this.scene.add(new THREE.DirectionalLightHelper((light as THREE.DirectionalLight), 1, color));
            } else if ((light as any).isPointLight) {
                this.scene.add(new THREE.PointLightHelper((light as THREE.PointLight), 1, color));
            } else {
                console.error('Unable to visualize light:');
                console.error(light);
            }
        }
    }
}
