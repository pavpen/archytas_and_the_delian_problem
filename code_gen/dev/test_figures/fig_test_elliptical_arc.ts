import { ColumnVector, ColumnVector3 } from '../../../src/ts/geometry/vectors_and_matrices';
import { EllipticalArc, Line, SvgScene } from '../../../src/ts/svg/svg_scene';
import { sceneGetBoundingBoxInBrowser } from '../../../src/ts/svg/browser_helper';
import {
    auxiliaryLineProps,
    mainLineProps,
    secondaryLineProps,
    showEllipticalArcProjectionDebugInfo
} from '../../../src/ts/geometry/construction_helpers';
import { CameraTransform, ProjectionPlaneCamera } from '../../../src/ts/geometry/projections';
import { ConstStepRange, PlaneDirections } from '../../../src/ts/geometry/parameters';
import { EllipticalArcParameters } from '../../../src/ts/geometry/plane_objects';


class Fig {
    readonly camera: CameraTransform<3>;
    readonly scene: SvgScene<3>;

    constructor() {
        this.camera = this.createCamera();
        this.scene = SvgScene.create({}, this.camera);
        this.populateScene();
    }

    private createCamera() {
        return new ProjectionPlaneCamera(
            new ColumnVector3(-10, 10, 75)
        ).lookAt(new ColumnVector3(0, 0, 0)).
            setFocalDistance(100);
    }

    private populateScene() {
        const center: ColumnVector<3> = new ColumnVector3(0, 0, 0);
        const xHat: ColumnVector<3> = new ColumnVector3(1, 0, 0);
        const yHat: ColumnVector<3> = new ColumnVector3(0, 1, 0);
        const parameters: EllipticalArcParameters<3> = {
            origin: center,
            plane: new PlaneDirections(xHat, yHat),
            circularAngle_rad: ConstStepRange.radRangeFromStartEndDegStepCount(0, 180, 10),
            semiXAxis: 100,
            semiYAxis: 50
        };

        const arc = this.scene.add(EllipticalArc.fromConfig(parameters, auxiliaryLineProps));

        const diameterStart = arc.pointAtCircularAngle_deg(0);
        const diameterEnd = arc.pointAtCircularAngle_deg(180);

        this.scene.add(Line.fromVertices([diameterStart, diameterEnd], secondaryLineProps));

        const interpolationPts = new Array<ColumnVector<3>>(parameters.circularAngle_rad.stepCount);

        for (let i = 0; i <= parameters.circularAngle_rad.stepCount; ++i) {
            interpolationPts[i] = arc.pointAtCircularAngle_rad(parameters.circularAngle_rad.atStep(i));
        }

        this.scene.add(Line.fromVertices(interpolationPts, secondaryLineProps));

        this.addCube(parameters.semiXAxis * 2);

        showEllipticalArcProjectionDebugInfo(this.scene, arc);
    }

    private addCube(side: number) {
        const depth = side / 10;
        const ptA: ColumnVector<3> = new ColumnVector3(-side / 2, -side / 2, 0);
        const ptB: ColumnVector<3> = new ColumnVector3(side, 0, 0).add(ptA);
        const ptC: ColumnVector<3> = new ColumnVector3(side, side, 0).add(ptA);
        const ptD: ColumnVector<3> = new ColumnVector3(0, side, 0).add(ptA);
        const ptE: ColumnVector<3> = ptA.clone().setComponent(2, -depth);
        const ptF: ColumnVector<3> = ptB.clone().setComponent(2, -depth);
        const ptG: ColumnVector<3> = ptC.clone().setComponent(2, -depth);
        const ptH: ColumnVector<3> = ptD.clone().setComponent(2, -depth);

        this.scene.add(Line.fromVertices([ptA, ptB, ptC, ptD, ptA], mainLineProps));
        this.scene.add(Line.fromVertices(
            [ptE, ptF, ptG, ptH, ptE], secondaryLineProps));
        this.scene.add(Line.fromVertices([ptA, ptE], auxiliaryLineProps));
        this.scene.add(Line.fromVertices([ptB, ptF], auxiliaryLineProps));
        this.scene.add(Line.fromVertices([ptC, ptG], auxiliaryLineProps));
        this.scene.add(Line.fromVertices([ptD, ptH], auxiliaryLineProps));
    }
}

export function figTestEllipticalArcScene() {
    return new Fig().scene;
}

export async function figTestEllipticalArc() {
    const scene = figTestEllipticalArcScene();
    const boundingBox = await sceneGetBoundingBoxInBrowser(scene, ['../dist/default.css']);
    const largeDim = Math.max(boundingBox.width, boundingBox.height);

    scene.viewBoxToBoxWithPadding(boundingBox, largeDim * 0.10);

    return scene;
}
