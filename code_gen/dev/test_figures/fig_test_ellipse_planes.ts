import { ColumnVector, ColumnVector3 } from '../../../src/ts/geometry/vectors_and_matrices';
import { ConstStepRange, PlaneDirections } from '../../../src/ts/geometry/parameters';
import { EllipticalArc, Line, SvgScene } from '../../../src/ts/svg/svg_scene';
import { sceneGetBoundingBoxInBrowser } from '../../../src/ts/svg/browser_helper';
import {
    addPlaneDirections,
    addPlaneGrid,
    addWorldAxes3,
    auxiliaryLineProps, mainLineProps,
    secondaryLineProps, showEllipticalArcProjectionDebugInfo, xHat3, xyPlane, zHat3
} from '../../../src/ts/geometry/construction_helpers';
import { CameraTransform, ProjectionPlaneCamera } from '../../../src/ts/geometry/projections';


class Fig {
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

        addPlaneDirections(this.scene, center, firstExtremePlane, 100, mainLineProps);
        const xRange = new ConstStepRange(-radius, radius, 4);
        const yRange = new ConstStepRange(-radius, radius, 4);
        addPlaneGrid(
            this.scene,
            center,
            firstExtremePlane,
            xRange,
            yRange,
            auxiliaryLineProps);
        addWorldAxes3(this.scene, 10, mainLineProps);
        for (let x = 0; x <= xRange.stepCount; ++x) {
            for (let y = 0; y <= yRange.stepCount; ++y) {
                const startPt = center.clone().
                    addScaled(firstExtremePlane.xHat, xRange.atStep(x)).
                    addScaled(firstExtremePlane.yHat, yRange.atStep(y));
                const endPt = startPt.clone().addScaled(firstExtremePlane.zHat, 10);

                this.scene.add(Line.fromVertices([startPt, endPt], secondaryLineProps));
            }
        }

        const { examplePointAngle_rad, examplePoint } = this.circleWithGeometricMean(
            center, radius, firstExtremePlane, exampleStartExtremeToRadius);

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

        addPlaneDirections(this.scene, meanToMeanCircleCenter, secondExtremePlane, 100, mainLineProps);
        addPlaneDirections(
            this.scene,
            this.scene.cameraTransform.getProjectionPlaneCenter(new ColumnVector3()),
            new PlaneDirections(
                this.scene.cameraTransform.getProjectionPlaneXHat(new ColumnVector3()),
                this.scene.cameraTransform.getProjectionPlaneYHat(new ColumnVector3())),
            100,
            mainLineProps);

        addPlaneGrid(
            this.scene,
            meanToMeanCircleCenter,
            secondExtremePlane,
            new ConstStepRange(-radius, radius, 4),
            new ConstStepRange(-radius, radius, 4),
            auxiliaryLineProps);

        this.circleWithGeometricMean(
            meanToMeanCircleCenter,
            radius,
            secondExtremePlane,
            examplePoint.distanceTo(diameterStart) / radius,
        );
    }

    private circleWithGeometricMean(
        center: ColumnVector<3>,
        radius: number,
        plane: PlaneDirections<3>,
        startExtremeToRadius: number,
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

        const arcPts = [];
        for (let i = 0; i <= circle.config.circularAngle_rad.stepCount; ++i) {
            arcPts.push(circle.pointAtCircularAngle_rad(circle.config.circularAngle_rad.atStep(i)));
        }
        scene.add(Line.fromVertices(arcPts, secondaryLineProps));

        showEllipticalArcProjectionDebugInfo(scene, circle);

        // scene.add(Line.fromVertices([diameterStart, diameterEnd], secondaryLineProps));
        // scene.add(PointMark.fromPoint(center, secondaryLineProps));

        const examplePointAngle_rad = Math.acos(-1 + startExtremeToRadius);
        const examplePoint = circle.pointAtCircularAngle_rad(examplePointAngle_rad);

        return { examplePointAngle_rad, examplePoint };
    }
}

export function figTestEllipsePlanesScene() {
    return new Fig().scene;
}

export async function figTestEllipsePlanes() {
    const scene = figTestEllipsePlanesScene();
    const boundingBox = await sceneGetBoundingBoxInBrowser(scene, ['../dist/default.css']);
    const largeDim = Math.max(boundingBox.width, boundingBox.height);

    scene.viewBoxToBoxWithPadding(boundingBox, largeDim * 0.10);

    return scene;
}
