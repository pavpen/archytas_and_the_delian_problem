import { ColumnVector, ColumnVector2, Matrix3 } from '../geometry/vectors_and_matrices';
import { ConstStepRange } from '../geometry/parameters';
import { EllipticalArc, Line, PointMark, SvgScene, SceneText, sceneToReactElement } from '../svg/svg_scene';
import { auxiliaryLineProps, mainLineProps, ptNwLabelProps, ptSeLabelProps, ptSLabelProps, ptSwLabelProps, secondaryLineProps } from '../geometry/construction_helpers';
import { PlaneCamera } from '../geometry/projections';
import * as React from 'react';

export function fig01Scene() {
    const center: ColumnVector<2> = new ColumnVector2(0, 0);
    const radius = 300;
    const diameterStart = center.clone().subtract(new ColumnVector2(radius, 0));
    const diameterEnd = center.clone().add(new ColumnVector2(radius, 0));

    const scene = SvgScene.create({}, new PlaneCamera(new Matrix3().makeScale(1, -1)));

    const circle = scene.add(EllipticalArc.fromCenterRadiusAngle(
        center,
        radius,
        ConstStepRange.radRangeFromStartEndDegStepCount(0, 180, 1),
        mainLineProps
    ));

    scene.add(Line.fromVertices([diameterStart, diameterEnd], secondaryLineProps));
    scene.add(PointMark.fromPoint(center, secondaryLineProps));

    const exampleStartExtremeToRadius = Math.pow(2, 2 / 3) / 8;
    const examplePointAngle_rad = Math.acos(-1 + exampleStartExtremeToRadius);
    const examplePoint = circle.pointAtCircularAngle_rad(examplePointAngle_rad);
    const examplePointProjection = examplePoint.clone().setComponent(1, 0);

    scene.add(Line.fromVertices([diameterStart, examplePoint], secondaryLineProps));
    scene.add(Line.fromVertices([examplePoint, diameterEnd], auxiliaryLineProps));
    scene.add(Line.fromVertices([examplePoint, examplePointProjection], auxiliaryLineProps));
    scene.add(SceneText.atPoint(diameterStart, 'A', ptSwLabelProps));
    scene.add(SceneText.atPoint(diameterEnd, 'O', ptSeLabelProps));
    scene.add(SceneText.atPoint(center, 'C', ptSLabelProps));
    scene.add(SceneText.atPoint(examplePoint, 'P', ptNwLabelProps));
    scene.add(SceneText.atPoint(examplePointProjection, 'Q', ptSLabelProps));

    return scene;
}

export function Fig01(): React.JSX.Element {
    return sceneToReactElement(fig01Scene());
}
