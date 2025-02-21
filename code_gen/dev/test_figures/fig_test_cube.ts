import { ColumnVector, ColumnVector3 } from '../../../src/ts/geometry/vectors_and_matrices';
import { Line, SvgScene } from '../../../src/ts/svg/svg_scene';
import { sceneGetBoundingBoxInBrowser } from '../../../src/ts/svg/browser_helper';
import {
    auxiliaryLineProps, mainLineProps, secondaryLineProps
} from '../../../src/ts/geometry/construction_helpers';
import { CameraTransform, ProjectionPlaneCamera } from '../../../src/ts/geometry/projections';


class Fig {
    readonly camera: CameraTransform<3>;
    readonly scene: SvgScene<3>;

    constructor() {
        this.camera = this.createCamera();
        this.scene = SvgScene.create({}, this.camera);
        this.populateScene();
    }

    private createCamera() {
        return new ProjectionPlaneCamera(new ColumnVector3(-0.012, -0.012, 2)).
            lookAt(new ColumnVector3(0, 0, 0));
    }

    private populateScene() {
        const side = 100;
        const depth = side / 10;
        const ptA: ColumnVector<3> = new ColumnVector3(-side / 2, -side / 2, 0);
        const ptB: ColumnVector<3> = new ColumnVector3(side, 0, 0).add(ptA);
        const ptC: ColumnVector<3> = new ColumnVector3(side, side, 0).add(ptA);
        const ptD: ColumnVector<3> = new ColumnVector3(0, side, 0).add(ptA);
        const ptE: ColumnVector<3> = ptA.clone().setComponent(2, -depth);
        const ptF: ColumnVector<3> = ptB.clone().setComponent(2, -depth);
        const ptG: ColumnVector<3> = ptC.clone().setComponent(2, -depth);
        const ptH: ColumnVector<3> = ptD.clone().setComponent(2, -depth);

        this.scene.add(Line.fromVertices(
            [ptA, ptB, ptC, ptD], mainLineProps));
        this.scene.add(Line.fromVertices(
            [ptE, ptF, ptG, ptH], secondaryLineProps));
        this.scene.add(Line.fromVertices([ptA, ptE], auxiliaryLineProps));
        this.scene.add(Line.fromVertices([ptB, ptF], auxiliaryLineProps));
        this.scene.add(Line.fromVertices([ptC, ptG], auxiliaryLineProps));
        this.scene.add(Line.fromVertices([ptD, ptH], auxiliaryLineProps));
    }
}

export function figTestCubeScene() {
    return new Fig().scene;
}

export async function figTestCube() {
    const scene = figTestCubeScene();
    const boundingBox = await sceneGetBoundingBoxInBrowser(scene, ['../dist/default.css']);
    const largeDim = Math.max(boundingBox.width, boundingBox.height);

    scene.viewBoxToBoxWithPadding(boundingBox, largeDim * 0.10);

    return scene;
}
