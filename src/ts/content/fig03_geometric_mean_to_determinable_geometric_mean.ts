import { ColumnVector, ColumnVector3 } from '../geometry/vectors_and_matrices';
import { ConstStepRange, PlaneDirections, ValueRange } from '../geometry/parameters';
import { EllipticalArc, Line, PointMark, SvgScene, SceneText, SceneTextProps, sceneToReactElement } from '../svg/svg_scene';
import {
    auxiliaryLineProps, mainLineProps,
    ptELabelProps, ptNeLabelProps, ptNwLabelProps, ptSeLabelProps, ptSLabelProps, ptSwLabelProps, ptWLabelProps,
    secondaryLineProps, xHat3, zHat3
} from '../geometry/construction_helpers';
import { CameraTransform, ProjectionPlaneCamera } from '../geometry/projections';
import * as React from 'react';


class LabelConfig {
    constructor(
        readonly text: string,
        readonly props: SceneTextProps) { }
}

function labelAtPosition(
    scene: SvgScene<3>,
    position: ColumnVector<3>,
    config?: LabelConfig
) {
    if (config) {
        return scene.add(SceneText.atPoint(
            position, config.text, config.props));
    }

    return null;
}

class Fig03Builder {
    readonly camera: CameraTransform<3>;
    readonly scene: SvgScene<3>;
    private readonly radius = 300;

    constructor() {
        this.camera = this.createCamera();
        this.scene = SvgScene.create({}, this.camera);
        this.populateScene();
    }

    private createCamera() {
        return new ProjectionPlaneCamera(new ColumnVector3(-500, 400, 400)).
            setFocalDistance(1000).
            lookAt(new ColumnVector3(-500, 10, 0)).
            flipYAxis();
    }

    private populateScene() {
        const radius = this.radius;
        const firstExtremePlane: PlaneDirections<3> =
            new PlaneDirections<3>(xHat3.clone(), zHat3.clone().multiplyScalar(-1)).
                rotateByAngle_rad(Math.PI / 4);
        const center: ColumnVector<3> = new ColumnVector3(0, 0, -radius * Math.sqrt(2));
        const diameterStart = center.clone().addScaled(firstExtremePlane.xHat, -radius);
        const exampleStartExtremeToRadius = Math.pow(2, 2 / 3) / 8;

        const { examplePointAngle_rad, examplePoint } = this.circleWithGeometricMean(
            center, radius, firstExtremePlane, exampleStartExtremeToRadius,
            new LabelConfig('A', ptSwLabelProps),
            new LabelConfig('O', ptSeLabelProps),
            new LabelConfig('C', ptSLabelProps),
            new LabelConfig('P', { ...ptSwLabelProps, dx: '-0.5em', dy: '-0.15em' }),
            new LabelConfig('Q', { ...ptELabelProps, dx: '0.25em', dy: '0.15em' }));

        const meanToMeanCircleCenter = EllipticalArc.fromConfig(
            {
                origin: diameterStart,
                plane: firstExtremePlane,
                circularAngle_rad: ConstStepRange.radRangeFromStartEndDegStepCount(0, 180, 1),
                semiXAxis: radius,
                semiYAxis: radius,
            }
        ).pointAtCircularAngle_rad(examplePointAngle_rad / 2);

        const secondExtremePlane: PlaneDirections<3> = new PlaneDirections(
            meanToMeanCircleCenter.clone().subtract(diameterStart).normalizeColumnVectors(),
            firstExtremePlane.zHat
        );

        this.circleWithGeometricMean(
            meanToMeanCircleCenter,
            radius,
            secondExtremePlane,
            examplePoint.distanceTo(diameterStart) / radius,
            null,
            new LabelConfig('S', ptWLabelProps),
            null,
            new LabelConfig('R', ptNeLabelProps),
            null);
    }

    private circleWithGeometricMean(
        center: ColumnVector<3>,
        radius: number,
        plane: PlaneDirections<3>,
        startExtremeToRadius: number,
        diameterStartLabel: LabelConfig,
        diameterEndLabel: LabelConfig,
        centerLabel: LabelConfig,
        examplePointLabel: LabelConfig,
        examplePointProjectionLabel: LabelConfig
    ) {
        const scene = this.scene;
        const diameterStart = center.clone().addScaled(plane.xHat, -radius);
        const diameterEnd = center.clone().addScaled(plane.xHat, radius);
        const circle =
            scene.add(
                EllipticalArc.fromConfig(
                    {
                        origin: center,
                        plane: plane,
                        circularAngle_rad: ConstStepRange.radRangeFromStartEndDegStepCount(0, 180, 8),
                        semiXAxis: radius,
                        semiYAxis: radius,
                    },
                    mainLineProps
                )
            );

        scene.add(Line.fromVertices([diameterStart, diameterEnd], secondaryLineProps));
        scene.add(PointMark.fromPoint(center, secondaryLineProps));

        const examplePointAngle_rad = Math.acos(-1 + startExtremeToRadius);
        const examplePoint = circle.pointAtCircularAngle_rad(examplePointAngle_rad);

        const examplePointProjection: ColumnVector<3> =
            plane.xHat.clone().multiplyScalar(
                examplePoint.clone().subtract(diameterStart).vectorDot(plane.xHat)
            ).add(diameterStart);

        scene.add(Line.fromVertices([diameterStart, examplePoint], secondaryLineProps));
        scene.add(Line.fromVertices([examplePoint, diameterEnd], auxiliaryLineProps));
        scene.add(Line.fromVertices([examplePoint, examplePointProjection], auxiliaryLineProps));
        labelAtPosition(scene, diameterStart, diameterStartLabel);
        labelAtPosition(scene, diameterEnd, diameterEndLabel);
        labelAtPosition(scene, center, centerLabel);
        labelAtPosition(scene, examplePoint, examplePointLabel);
        labelAtPosition(scene, examplePointProjection, examplePointProjectionLabel);

        return { examplePointAngle_rad, examplePoint };
    }
}

export function fig03Scene() {
    return new Fig03Builder().scene;
}

export function Fig03(): React.JSX.Element {
    return sceneToReactElement(fig03Scene());
}
