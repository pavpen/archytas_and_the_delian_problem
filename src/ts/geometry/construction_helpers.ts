import { throwIf } from '../throw_if';
import { ConstStepRange, PlaneDirections, ValueRange } from './parameters';
import { EllipticalArcConfigCalculator, EllipticalArcParameters } from './plane_objects';
import { ColumnVector, ColumnVector2, ColumnVector3, MatrixFactory } from './vectors_and_matrices';
import { EllipticalArc, Line, SvgScene } from '../svg/svg_scene';

export const mainLineProps = { className: 'main-line' };
export const secondaryLineProps = { className: 'secondary-line' };
export const auxiliaryLineProps = { className: 'auxiliary-line' };
export const ptLabelProps = { className: 'pt-label' };
export const ptNLabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-n' };
export const ptSLabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-s' };
export const ptELabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-e', dx: '0.25em' };
export const ptWLabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-w', dx: '-0.25em' };
export const ptNeLabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-ne' };
export const ptNwLabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-nw' };
export const ptSeLabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-se' };
export const ptSwLabelProps = { ...ptLabelProps, className: ptLabelProps.className + ' label-pos-sw' };

export const origin2 = new ColumnVector2(0, 0);
export const xHat2 = new ColumnVector2(1, 0);
export const yHat2 = new ColumnVector2(0, 1);
export const defaultPlane2 = new PlaneDirections<2>(xHat2, yHat2);
export const origin3 = new ColumnVector3(0, 0, 0);
export const xHat3 = new ColumnVector3(1, 0, 0);
export const yHat3 = new ColumnVector3(0, 1, 0);
export const zHat3 = new ColumnVector3(0, 0, 1);
export const xyPlane = new PlaneDirections<3>(xHat3, yHat3);
export const yzPlane = new PlaneDirections<3>(yHat3, zHat3);
export const zxPlane = new PlaneDirections<3>(zHat3, xHat3);

export function addWorldAxes2(scene: SvgScene<2>, lineLength: number, lineProps = secondaryLineProps) {
    scene.add(Line.fromVertices<2>(
        [origin2, xHat2.clone().multiplyScalar(lineLength)], lineProps));
    scene.add(Line.fromVertices<2>(
        [origin2, yHat2.clone().multiplyScalar(lineLength)], lineProps));
}

export function addWorldAxes3(scene: SvgScene<3>, lineLength: number, lineProps = secondaryLineProps) {
    scene.add(Line.fromVertices<3>(
        [origin3, xHat3.clone().multiplyScalar(lineLength)], lineProps));
    scene.add(Line.fromVertices<3>(
        [origin3, yHat3.clone().multiplyScalar(lineLength)], lineProps));
    scene.add(Line.fromVertices<3>(
        [origin3, zHat3.clone().multiplyScalar(lineLength)], lineProps));
}

export function addPlaneGrid<Dim extends 2 | 3>(
    scene: SvgScene<Dim>,
    origin: ColumnVector<Dim>, plane: PlaneDirections<Dim>, xRange: ValueRange, yRange: ValueRange,
    lineProps = secondaryLineProps
) {
    for (let x = 0; x <= xRange.stepCount; ++x) {
        const startPt = origin.clone().
            addScaled(plane.xHat, xRange.atStep(x)).
            addScaled(plane.yHat, yRange.start);
        const endPt = origin.clone().
            addScaled(plane.xHat, xRange.atStep(x)).
            addScaled(plane.yHat, yRange.end);

        scene.add(Line.fromVertices([startPt, endPt], lineProps));
    }
    for (let y = 0; y <= yRange.stepCount; ++y) {
        const startPt = origin.clone().
            addScaled(plane.xHat, xRange.start).
            addScaled(plane.yHat, yRange.atStep(y));
        const endPt = origin.clone().
            addScaled(plane.xHat, xRange.end).
            addScaled(plane.yHat, yRange.atStep(y));

        scene.add(Line.fromVertices([startPt, endPt], lineProps));
    }
}

export function addPlaneDirections<Dim extends 2 | 3>(
    scene: SvgScene<Dim>,
    origin: ColumnVector<Dim>,
    plane: PlaneDirections<Dim>,
    directionLineLength: number,
    lineProps = secondaryLineProps
) {
    const xEnd = origin.clone().addScaled(plane.xHat, directionLineLength);
    const yEnd = origin.clone().addScaled(plane.yHat, directionLineLength);

    scene.add(Line.fromVertices([origin, xEnd], lineProps));
    scene.add(Line.fromVertices([origin, yEnd], lineProps));
}

export function addLineFromCamera<Dim extends 2 | 3>(
    scene: SvgScene<Dim>,
    point: ColumnVector<Dim>,
    camera = scene.cameraTransform,
    minDistanceFromCamera = camera.minDistanceFromCamera + 0.1,
    lineProps = secondaryLineProps
) {
    const cameraPosition = camera.getWorldPosition(point.clone());
    const pointFromCamera = point.clone().subtract(cameraPosition);
    const distanceFromCamera = pointFromCamera.vectorLength;

    if (distanceFromCamera < minDistanceFromCamera) {
        console.warn(`addLineFromCamera: Destination point is too close (${distanceFromCamera}}) ` +
            `to the camera to render minDistanceFromCamera: ${minDistanceFromCamera}! Ignoring.`);

        return;
    }

    const startPt = cameraPosition.clone().addScaled(
        pointFromCamera, minDistanceFromCamera / distanceFromCamera);

    scene.add(Line.fromVertices([startPt, point.clone()], lineProps));
}

export function addLineFromProjectionPlaneCenter<Dim extends 2 | 3>(
    scene: SvgScene<Dim>,
    point: ColumnVector<Dim>,
    camera = scene.cameraTransform,
    lineProps = secondaryLineProps
) {
    const projectionPlaneCenter = camera.getProjectionPlaneCenter(point.clone());

    scene.add(Line.fromVertices([projectionPlaneCenter, point.clone()], lineProps));
}

export function showEllipticalArcProjectionDebugInfo(scene: SvgScene<3>, arc: EllipticalArc<3>, logDebug = false) {
    const camera = scene.cameraTransform;

    const center = arc.config.origin;
    const arcCalculator = new EllipticalArcConfigCalculator(arc.config.origin);
    const projectedArc = {
        origin: arc.config.origin.clone(),
        plane: arc.config.plane.clone(),
        semiXAxis: arc.config.semiXAxis,
        semiYAxis: arc.config.semiYAxis,
        circularAngle_rad: arc.config.circularAngle_rad.cloneAsMutable()
    };
    const debugInfo = arcCalculator.debug_projectToCamera(
        arc.config, camera, projectedArc);
    const inInputFrameInfo = debugInfo.skewedConeInInputEllipseFrame;
    const eyePoint1 = inInputFrameInfo.eyePoint.clone().
        add(center);
    const coneVertex1 = inInputFrameInfo.ellipseBasis.
        multiply(inInputFrameInfo.coneVertex, new ColumnVector3()).
        add(center);
    const ellipseCenter1 = inInputFrameInfo.ellipseBasis.
        multiply(inInputFrameInfo.ellipseCenter, new ColumnVector3());

    if (logDebug) {
        console.log(`showEllipticalArcProjectionDebugInfo: eyePoint1^T: ${eyePoint1.transposed().repr()}, ` +
            `coneVertex1^T: ${coneVertex1.transposed().repr()}, ` +
            `camera.worldPosition^T: ${camera.getWorldPosition(new ColumnVector3()).transposed().repr()}`);
        console.log(`  In projection plane frame: ellipse: origin^T: ${projectedArc.origin.transposed().repr()}, plane: ${projectedArc.plane.repr()}, ` +
            `semiXAxis: ${projectedArc.semiXAxis}, semiYAxis: ${projectedArc.semiYAxis}`);
        console.log(`  ellipseCenter^T: ${ellipseCenter1.transposed().repr()}, center^T: ${center.transposed().repr()}`);
    }

    const angleRange = ConstStepRange.radRangeFromStartEndDegStepCount(0, 360, 10);
    const eq1Samples = [];

    for (let i = 0; i < angleRange.stepCount; ++i) {
        const x = arc.pointAtCircularAngle_rad(angleRange.atStep(i));
        const y = new ColumnVector3();

        inInputFrameInfo.ellipseBasis.transposed().
            multiply(x.clone().subtract(center), y);

        const matrixResult = inInputFrameInfo.eqA.clone();
        const eqOfY = y.vectorDot(
            inInputFrameInfo.eqA.multiply(y, new ColumnVector3())) +
            y.vectorDot(inInputFrameInfo.eqB) +
            inInputFrameInfo.eqC;

        eq1Samples.push(eqOfY);
    }

    const eq1MaxSample = Math.max(...eq1Samples.map(Math.abs));

    if (logDebug) {
        console.log(`  inInputFrame conic equation samples (max=${eq1MaxSample}): ${eq1Samples.join(', ')}`);
    }

    throwIf(eq1MaxSample < 1e-14);

    const inWorldFrame = debugInfo.coneInWorldFrame;
    const eq2Samples = [];

    for (let i = 0; i < angleRange.stepCount; ++i) {
        const x = arc.pointAtCircularAngle_rad(angleRange.atStep(i));

        const matrixResult = inWorldFrame.eqA.clone();
        const eqOfY = x.vectorDot(
            inWorldFrame.eqA.multiply(x, new ColumnVector3())) +
            x.vectorDot(inWorldFrame.eqB) +
            inWorldFrame.eqC;

        eq2Samples.push(eqOfY);
    }

    const eq2MaxSample = Math.max(...eq2Samples.map(Math.abs));

    if (logDebug) {
        console.log(`  inWorldFrame conic equation samples (max=${eq2MaxSample}): ${eq2Samples.join(', ')}`);
    }

    throwIf(eq2MaxSample < 1e-14);

    const projectedConicEq = debugInfo.projectedEllipseConicEq;
    const eq3Samples = [];

    const projectionPlaneCenter = camera.getProjectionPlaneCenter(new ColumnVector3());
    const projectionPlaneXHat = camera.getProjectionPlaneXHat(new ColumnVector3());
    const projectionPlaneYHat = camera.getProjectionPlaneYHat(new ColumnVector3());
    const projectionPlaneBasis = MatrixFactory.create(3, 3).setFromColumnVectors(
        projectionPlaneXHat, projectionPlaneYHat, new ColumnVector3());

    if (logDebug) {
        console.log(`  projectionPlaneCenter^T: ${projectionPlaneCenter.transposed().repr()}, camera: ${camera.repr()}`);
    }

    for (let i = 0; i < angleRange.stepCount; ++i) {
        const x = arc.pointAtCircularAngle_rad(angleRange.atStep(i));

        addLineFromCamera(scene, x, camera, camera.minDistanceFromCamera + 0.1, mainLineProps);

        const y = camera.project(x.clone());
        const y2 = new ColumnVector2().
            setComponent(0, y.getComponent(0)).
            setComponent(1, y.getComponent(1));

        const eqOfY = y2.vectorDot(
            projectedConicEq.eqA.multiply(y2, new ColumnVector2())) +
            y2.vectorDot(projectedConicEq.eqB) +
            projectedConicEq.eqC;

        eq3Samples.push(eqOfY);
    }

    const eq3MaxSample = Math.max(...eq3Samples.map(Math.abs));

    if (logDebug) {
        console.log(`  Projected ellipse conic equation samples (max=${eq3MaxSample}): ${eq3Samples.join(', ')}`);
    }

    throwIf(eq3MaxSample < 1e-14);

    const unprojectedArc: EllipticalArcParameters<3> = {
        origin: projectionPlaneBasis.multiply(projectedArc.origin, new ColumnVector3()).
            add(projectionPlaneCenter) as ColumnVector<3>,
        plane: new PlaneDirections<3>(
            projectionPlaneBasis.multiply(projectedArc.plane.xHat, new ColumnVector3()) as ColumnVector<3>,
            projectionPlaneBasis.multiply(projectedArc.plane.yHat, new ColumnVector3()) as ColumnVector<3>),
        semiXAxis: projectedArc.semiXAxis,
        semiYAxis: projectedArc.semiYAxis,
        circularAngle_rad: projectedArc.circularAngle_rad.clone()
    };

    showEllipseAxes(scene, EllipticalArc.fromConfig(unprojectedArc));
    scene.add(EllipticalArc.fromConfig(
        {
            ...unprojectedArc,
            circularAngle_rad: ConstStepRange.radRangeFromStartEndDegStepCount(0, 360, 1),
        },
        auxiliaryLineProps));

    const startAnglePt = arc.pointAtCircularAngle_rad(arc.config.circularAngle_rad.start);

    scene.add(Line.fromVertices([center, startAnglePt], secondaryLineProps));

    const startAnglePtFromEllipseCenter = camera.project(startAnglePt.clone()).
        subtract(projectedArc.origin);

    const startAngle_rad = Math.atan2(
        // Project the point from the ellipse to the circle with radius = semiXAxis:
        startAnglePtFromEllipseCenter.vectorDot(projectedArc.plane.yHat) / projectedArc.semiYAxis * projectedArc.semiXAxis,
        startAnglePtFromEllipseCenter.vectorDot(projectedArc.plane.xHat));

    if (logDebug) {
        console.log(`  startAnglePtFromEllipseCenter^T: ${startAnglePtFromEllipseCenter.transposed().repr()}, startAngle: ${startAngle_rad / Math.PI * 180}°`);
    }

    scene.add(Line.fromVertices([
        unprojectedArc.origin,
        projectionPlaneBasis.multiply(
            new ColumnVector3().
                addScaled(projectedArc.plane.xHat, projectedArc.semiXAxis * Math.cos(startAngle_rad)).
                addScaled(projectedArc.plane.yHat, projectedArc.semiYAxis * Math.sin(startAngle_rad)).
                add(projectedArc.origin),
            new ColumnVector3()
        ).add(projectionPlaneCenter) as ColumnVector<3>],
        mainLineProps));

    scene.add(Line.fromVertices([
        camera.projectionToWorld(new ColumnVector3(0, 0, 0), new ColumnVector3()),
        camera.projectionToWorld(projectedArc.origin, new ColumnVector3()),
        camera.projectionToWorld(startAnglePtFromEllipseCenter.clone().add(projectedArc.origin), new ColumnVector3()),
    ], auxiliaryLineProps));
}

export function showEllipseAxes<Dim extends 2 | 3>(
    scene: SvgScene<Dim>, arc: EllipticalArc<Dim>, xLineProps = mainLineProps, yLineProps = secondaryLineProps
) {
    const center = arc.config.origin.clone();

    scene.add(Line.fromVertices([center, arc.pointAtCircularAngle_deg(0)], xLineProps));
    scene.add(Line.fromVertices([center, arc.pointAtCircularAngle_deg(90)], yLineProps));
}
