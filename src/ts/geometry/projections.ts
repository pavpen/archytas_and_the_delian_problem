import { ColumnVector, ColumnVector3, Matrix3, Matrix4 } from "./vectors_and_matrices";

const EPS = 1e-15;


/**
 * Converts from scene coordinates to camera plane coordinates.
 * 
 * @remarks
 * 
 * The camera plane is two-dimensional.
 */
export interface CameraTransform<Dim extends 2 | 3> {
    isPerspectiveCamera: boolean;
    minDistanceFromCamera: number;
    getWorldPosition(out_result: ColumnVector<Dim>): typeof out_result;
    getProjectionPlaneCenter(out_result: ColumnVector<Dim>): typeof out_result;
    getProjectionPlaneXHat(out_result: ColumnVector<Dim>): typeof out_result;
    getProjectionPlaneYHat(out_result: ColumnVector<Dim>): typeof out_result;
    project(inout_point: ColumnVector<Dim>): typeof inout_point;

    /**
     * Converts from projection plane coordinates to world coordinates.
     * 
     * Vertices projected to the projection plane don't have the 'z' component
     * that can convert them back to the original coordinates.  This method
     * leaves them in the projection plane, but returns world coordinates.
     */
    projectionToWorld(
        projectionPlaneCoords: ColumnVector<Dim>, out_worldCoords: ColumnVector<Dim>
    ): typeof out_worldCoords;

    repr(): string;
}

export class PlaneCamera implements CameraTransform<2> {
    readonly isPerspectiveCamera = false;
    readonly minDistanceFromCamera = 0;
    private readonly projectionPlaneToWorldTransform: Matrix3;

    constructor(
        readonly worldToProjectionPlaneTransform: Matrix3 = new Matrix3()
    ) {
        this.validateCameraTransform(worldToProjectionPlaneTransform);
        this.projectionPlaneToWorldTransform = new Matrix3(worldToProjectionPlaneTransform.clone().invert());
    }

    private validateCameraTransform(worldToProjectionPlaneTransform: Matrix3, eps = EPS) {
        if (worldToProjectionPlaneTransform.getElement(2, 0) != 0 ||
            worldToProjectionPlaneTransform.getElement(2, 1) != 0
        ) {
            throw new Error(
                `Camera world-to-projection-plane transform matrix must ` +
                `have a last row of [0, 0, 1]! Can't accept: ` +
                `${worldToProjectionPlaneTransform.repr()}`);
        }

        const homogenousCoord = worldToProjectionPlaneTransform.getElement(2, 2);

        if (Math.abs(homogenousCoord) < eps) {
            throw new Error(
                `Camera world-to-projection-plane transform matrix has a ` +
                `homogeneus dimenison coordinate which can't be ` +
                `distinguished from 0 with enough precision: ` +
                `${homogenousCoord}`);
        }

        if (homogenousCoord != 1) {
            console.warn(
                `Camera world-to-projection-plane transform matrix has a ` +
                `non-1 bottom right coordinate. Prefer to use the diagonal ` +
                `above the last row to scale coordinates: ` +
                `${worldToProjectionPlaneTransform.repr()}`);
        }
    }

    getWorldPosition(out_result: ColumnVector<2>): ColumnVector<2> {
        const t = this.worldToProjectionPlaneTransform;
        // This is usually 1, but we support unusual transforms:
        const w = t.getElement(2, 2);

        out_result.setComponent(0, t.getElement(2, 0) / w);
        out_result.setComponent(1, t.getElement(2, 1) / w);

        return out_result;
    }

    getProjectionPlaneCenter(out_result: ColumnVector<2>): ColumnVector<2> {
        // We treat the camera, and the center of the projection plane as
        // coinciding.  The camera would be a unit distance away from the
        // projection plane, if there was a z dimension.
        return this.getWorldPosition(out_result);
    }

    getProjectionPlaneXHat(out_result: ColumnVector<2>): ColumnVector<2> {
        const t = this.worldToProjectionPlaneTransform;

        out_result.setComponent(0, t.getElement(0, 0));
        out_result.setComponent(1, t.getElement(1, 0));
        out_result.normalizeColumnVectors();

        return out_result;
    }

    getProjectionPlaneYHat(out_result: ColumnVector<2>): ColumnVector<2> {
        const t = this.worldToProjectionPlaneTransform;

        out_result.setComponent(0, t.getElement(0, 1));
        out_result.setComponent(1, t.getElement(1, 1));
        out_result.normalizeColumnVectors();

        return out_result;
    }

    project(inout_point: ColumnVector<2>): ColumnVector<2> {
        inout_point.applyAffine(this.worldToProjectionPlaneTransform);

        return inout_point;
    }

    projectionToWorld(
        projectionPlaneCoords: ColumnVector<2>, out_worldCoords: ColumnVector<2>
    ): ColumnVector<2> {
        return out_worldCoords.copy(projectionPlaneCoords).applyAffine(this.projectionPlaneToWorldTransform);
    }

    repr(): string {
        return `PlaneCamera: worldToProjectionPlaneTransform:\n` +
            `${this.worldToProjectionPlaneTransform.repr()}`;
    }
}

export class ProjectionPlaneCamera implements CameraTransform<3> {
    // Projection plane basis:
    private readonly xHat = new ColumnVector3(1, 0, 0);
    private readonly yHat = new ColumnVector3(0, 1, 0);
    /** Points from the projection plane center towards the camera. */
    private readonly zHat = new ColumnVector3(0, 0, 1);
    private focalDistance = 1;
    readonly minDistanceFromCamera = 0.1;

    readonly isPerspectiveCamera = true;

    constructor(
        private readonly worldPosition: ColumnVector<3>
    ) { }

    getWorldPosition(out_result: ColumnVector<3>): ColumnVector<3> {
        return out_result.copy(this.worldPosition);
    }

    getProjectionPlaneCenter(out_result: ColumnVector<3>): ColumnVector<3> {
        return out_result.copy(this.worldPosition).
            addScaled(this.zHat, -this.focalDistance);
    }

    getProjectionPlaneXHat(out_result: ColumnVector<3>): ColumnVector<3> {
        return out_result.copy(this.xHat);
    }

    getProjectionPlaneYHat(out_result: ColumnVector<3>): ColumnVector<3> {
        return out_result.copy(this.yHat);
    }

    project(inout_point: ColumnVector<3>): ColumnVector<3> {
        // console.log(`project: inout_point^T: ${inout_point.transposed().repr()}, ` +
        //     `worldPosition^T: ${this.worldPosition.transposed().repr()}, xHat^T: ${this.xHat.transposed().repr()}, ` +
        //     `yHat^T: ${this.yHat.transposed().repr()}, zHat^T: ${this.zHat.transposed().repr()}, ` +
        //     `focalDistance: ${this.focalDistance}`);

        const pointFromEyePoint = inout_point.subtract(this.worldPosition);
        const pointFromEyePointZ = -pointFromEyePoint.vectorDot(this.zHat);

        // console.log(`  pointFromEyePoint^T: ${pointFromEyePoint.transposed().repr()}, pointFromEyePointZ: ${pointFromEyePointZ}`);

        if (pointFromEyePointZ < 0) {
            console.warn(`ProjectionPlaneCamera.project: Projecting a point ` +
                `(${inout_point.clone().add(this.worldPosition).transposed().repr()}) ` +
                `that's behind the camera (${this.worldPosition.transposed().repr()}, ` +
                `direction: ${this.zHat.clone().multiplyScalar(-1).transposed().repr()})!`);
        }
        if (Math.abs(pointFromEyePointZ) < this.minDistanceFromCamera) {
            console.warn(`ProjectionPlaneCamera.project: Projecting a point ` +
                `(${inout_point.clone().add(this.worldPosition).transposed().repr()}) ` +
                `that's too close to the camera (${pointFromEyePointZ})!`);
        }

        inout_point.multiplyScalar(this.focalDistance / pointFromEyePointZ).
            addScaled(this.zHat, this.focalDistance);

        // console.log(`  Projection point - projection plane cener: ${inout_point.transposed().repr()}`);

        const x = inout_point.vectorDot(this.xHat);
        const y = inout_point.vectorDot(this.yHat);
        // The 'z' should be 0:
        const z = inout_point.vectorDot(this.zHat);

        inout_point.setComponent(0, x).setComponent(1, y).setComponent(2, z);

        // console.log(`  Result^T: ${inout_point.transposed().repr()}`);

        return inout_point;
    }

    projectionToWorld(
        projectionPlaneCoords: ColumnVector<3>, out_worldCoords: ColumnVector<3>
    ): typeof out_worldCoords {
        this.getProjectionPlaneCenter(out_worldCoords);
        out_worldCoords.addScaled(this.xHat, projectionPlaneCoords.getComponent(0)).
            addScaled(this.yHat, projectionPlaneCoords.getComponent(1)).
            addScaled(this.zHat, projectionPlaneCoords.getComponent(2));

        return out_worldCoords;
    }

    repr(): string {
        return `ProjectionPlaneCamera: { worldPosition^T: ${this.worldPosition.transposed().repr()}, ` +
            `Projection plane x_hat^T: ${this.xHat.transposed().repr()}, y_hat^T: ` +
            `${this.yHat.transposed().repr()}, z_hat^T: ${this.zHat.transposed().repr()}, ` +
            `focalDistance: ${this.focalDistance}, minDistanceFromCamera: ${this.minDistanceFromCamera} }`;
    }

    lookAt(targetPoint: ColumnVector<3>, eps = EPS): this {
        const distanceFromCamera = targetPoint.distanceTo(this.worldPosition);

        if (distanceFromCamera < eps) {
            throw new Error(`Look-at target (${targetPoint.transposed().repr()}) too close to camera position ` +
                `(${this.worldPosition.transposed().repr()}) [distance ${distanceFromCamera} < ${eps}]!`);
        }

        this.zHat.copy(this.worldPosition).
            subtract(targetPoint).
            normalizeColumnVectors();

        const xProjection = this.zHat.getComponent(0);
        const yProjection = this.zHat.getComponent(1);

        if (Math.abs(xProjection) <= Math.abs(yProjection)) {
            this.yHat.set(-1, 0, 0).vectorCross(this.zHat);
            this.yHat.normalizeColumnVectors();
            this.xHat.copy(this.yHat).vectorCross(this.zHat);
        } else {
            this.xHat.set(0, 1, 0).vectorCross(this.zHat);
            this.xHat.normalizeColumnVectors();
            this.yHat.copy(this.zHat).vectorCross(this.xHat);
        }

        return this;
    }

    flipXAxis(): this {
        this.xHat.multiplyScalar(-1);

        return this;
    }

    flipYAxis(): this {
        this.yHat.multiplyScalar(-1);

        return this;
    }

    flipZAxis(): this {
        this.zHat.multiplyScalar(-1);

        return this;
    }

    setFocalDistance(value: number): this {
        this.focalDistance = value;

        return this;
    }
}
