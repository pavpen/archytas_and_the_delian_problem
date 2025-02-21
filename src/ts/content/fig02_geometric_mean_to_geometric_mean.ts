import { ColumnVector, ColumnVector2, Matrix3 } from '../geometry/vectors_and_matrices';
import { ConstStepRange, PlaneDirections } from '../geometry/parameters';
import { EllipticalArc, Line, PointMark, SvgScene, SceneText, SceneTextProps, sceneToReactElement } from '../svg/svg_scene';
import { auxiliaryLineProps, defaultPlane2, mainLineProps, ptELabelProps, ptNwLabelProps, ptSeLabelProps, ptSLabelProps, ptSwLabelProps, ptWLabelProps, secondaryLineProps } from '../geometry/construction_helpers';
import { PlaneCamera } from '../geometry/projections';
import * as React from 'react';


class LabelConfig {
    constructor(
        readonly text: string,
        readonly props: SceneTextProps) { }
}

function labelAtPosition(
    scene: SvgScene<2>,
    position: ColumnVector<2>,
    config?: LabelConfig
) {
    if (config) {
        return scene.add(SceneText.atPoint(
            position, config.text, config.props));
    }

    return null;
}

function circleWithGeometricMean(
    scene: SvgScene<2>,
    center: ColumnVector<2>,
    radius: number,
    plane: PlaneDirections<2>,
    startExtremeToRadius: number,
    diameterStartLabel: LabelConfig,
    diameterEndLabel: LabelConfig,
    centerLabel: LabelConfig,
    examplePointLabel: LabelConfig,
    examplePointProjectionLabel: LabelConfig
) {
    const diameterStart = center.clone().addScaled(plane.xHat, -radius);
    const diameterEnd = center.clone().addScaled(plane.xHat, radius);
    const circle = scene.add(EllipticalArc.fromConfig(
        {
            origin: center,
            plane: plane,
            circularAngle_rad: ConstStepRange.radRangeFromStartEndDegStepCount(0, 180, 1),
            semiXAxis: radius,
            semiYAxis: radius,
        },
        mainLineProps
    ));

    scene.add(Line.fromVertices([diameterStart, diameterEnd], secondaryLineProps));
    scene.add(PointMark.fromPoint(center, secondaryLineProps));

    const examplePointAngle_rad = Math.acos(-1 + startExtremeToRadius);
    const examplePoint = circle.pointAtCircularAngle_rad(examplePointAngle_rad);
    const examplePointProjection: ColumnVector<2> =
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

export function fig02Scene() {
    const center: ColumnVector<2> = new ColumnVector2(0, 0);
    const radius = 300;
    const diameterStart = center.clone().subtract(new ColumnVector2(radius, 0));

    const scene = SvgScene.create({}, new PlaneCamera(new Matrix3().makeScale(1, -1)));

    const exampleStartExtremeToRadius = Math.pow(2, 2 / 3) / 8;

    const { examplePointAngle_rad, examplePoint } = circleWithGeometricMean(
        scene, center, radius, defaultPlane2, exampleStartExtremeToRadius,
        new LabelConfig('A', ptSwLabelProps),
        new LabelConfig('O', ptSeLabelProps),
        new LabelConfig('C', ptSLabelProps),
        new LabelConfig('P', { ...ptSwLabelProps, dx: '-0.5em', dy: '-0.15em' }),
        new LabelConfig('Q', ptSLabelProps));

    const meanToMeanCircleCenter = EllipticalArc.fromCenterRadiusAngle(
        diameterStart,
        radius,
        ConstStepRange.radRangeFromStartEndDegStepCount(0, 180, 1)
    ).pointAtCircularAngle_rad(examplePointAngle_rad / 2);

    circleWithGeometricMean(
        scene,
        meanToMeanCircleCenter,
        radius,
        defaultPlane2.clone().rotateByAngle_rad(examplePointAngle_rad / 2),
        examplePoint.distanceTo(diameterStart) / radius,
        null,
        new LabelConfig('S', ptELabelProps),
        null,
        new LabelConfig('R', ptWLabelProps),
        null);

    return scene;
}

export function Fig02(): React.JSX.Element {
    return sceneToReactElement(fig02Scene());
}
