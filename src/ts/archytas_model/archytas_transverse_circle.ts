import * as THREE from 'three';

import { ConstStepRange, PlaneDirections, ValueRange } from '../geometry/parameters';
import { ColumnVector, ColumnVector3 } from '../geometry/vectors_and_matrices';
import { EllipseArc } from './plane_objects';
import { Label, LabelPositioner } from '../three_scene_renderer';
import { Line } from './tesselation_base';

export class TransverseCircleAngleRange extends ConstStepRange {
    private _transformedStart: number;
    private _transformedEnd: number;

    constructor(
        angleOapCompliment_rad: ValueRange,
        readonly stepCountMultiplier = 10) {
        super(
            angleOapCompliment_rad.start,
            angleOapCompliment_rad.end,
            angleOapCompliment_rad.stepCount * stepCountMultiplier);
        this._transformedStart =
            TransverseCircleAngleRange.fromAngleOapCompliment_rad(
                angleOapCompliment_rad.start);
        this._transformedEnd =
            TransverseCircleAngleRange.fromAngleOapCompliment_rad(
                angleOapCompliment_rad.end);
    }

    stepSize(stepIdx: number) {
        return this.atStep(stepIdx + 1) - this.atStep(stepIdx);
    }

    atStep(stepIdx: number) {
        return TransverseCircleAngleRange.fromAngleOapCompliment_rad(super.atStep(stepIdx));
    }

    /** Returns whether a given value is within the closed range. */
    includes(value: number) {
        return value >= this._transformedStart && value <= this._transformedEnd;
    }

    /** Returns the index of the last step with value <= the given value. */
    lastIncludedStepIdx(value: number) {
        return super.lastIncludedStepIdx(
            TransverseCircleAngleRange.toAngleOapCompliment_rad(value));
    }

    static fromAngleOapCompliment_rad(
        angleOapCompliment_rad: number
    ) {
        // angleOapCompliment = 90° - ∢OAP
        // AP = 2 * r * sin(90° - ∢OAP) = r - r * cos(transverseCircleAngle)
        // => cos(transverseCircleAngle) = 1 - 2 * sin(90° - ∢OAP)
        return Math.acos(1.0 - 2.0 * Math.sin(Math.PI - angleOapCompliment_rad));
    }

    /** Inverse of {@link TransverseCircleAngleRange.fromAngleOapCompliment_rad}. */
    private static toAngleOapCompliment_rad(
        transverseCircleAngle_rad: number
    ) {
        return Math.PI - Math.asin((1.0 - Math.cos(transverseCircleAngle_rad)) / 2.0);
    }
}

export class TransverseCircleConfiguration {
    constructor(
        readonly circleMaterial: THREE.Material,
        readonly diameterMaterial: THREE.Material,
        readonly lineRaMaterial: THREE.Material,
        readonly lineRpMaterial: THREE.Material,
        readonly lineRsMaterial: THREE.Material,
        readonly ptRLabel: Label,
        readonly ptSLabel: Label,
        readonly labelPositioner: LabelPositioner,
        readonly origin: ColumnVector<3>,
        readonly baseCirclePlane: PlaneDirections<3>,
        readonly centralAngle_rad: TransverseCircleAngleRange,
        readonly radius: number) { }
}

export class ArchytasTransverseCircle {
    readonly circle: EllipseArc;
    readonly diameter: Line;
    readonly lineRa: Line;
    readonly lineRp: Line;
    readonly lineRs: Line;
    readonly sceneObject: THREE.Object3D;
    private readonly circlePlane: PlaneDirections<3>;
    private readonly center = new ColumnVector3();
    private readonly diameterEnd = new ColumnVector3();
    readonly ptR = new ColumnVector3();
    private readonly ptP = new ColumnVector3();
    private _angleOapCompliment_rad: number = 0;

    constructor(
        readonly config: TransverseCircleConfiguration
    ) {
        this.sceneObject = new THREE.Group()

        this.circlePlane = new PlaneDirections<3>(
            new ColumnVector3(),
            this.config.baseCirclePlane.zHat.clone().multiplyScalar(-1));
        this.updatePointsAndDirections(this._angleOapCompliment_rad);

        this.circle = new EllipseArc(
            {
                origin: this.center,
                plane: this.circlePlane,
                circularAngle_rad: this.config.centralAngle_rad,
                semiXAxis: this.config.radius,
                semiYAxis: this.config.radius
            },
            this.config.circleMaterial);
        this.sceneObject.add(this.circle.sceneObject);

        this.diameter = new Line(
            config.diameterMaterial,
            [config.origin, this.diameterEnd]);
        this.sceneObject.add(this.diameter.sceneObject);

        this.lineRa = new Line(
            config.lineRaMaterial,
            [this.ptR, this.config.origin]);
        this.sceneObject.add(this.lineRa.sceneObject);

        this.lineRp = new Line(
            config.lineRpMaterial,
            [this.ptR, this.ptP]);
        this.sceneObject.add(this.lineRp.sceneObject);

        this.lineRs = new Line(
            config.lineRsMaterial,
            [this.ptR, this.diameterEnd]);
        this.sceneObject.add(this.lineRs.sceneObject);

        this.config.ptRLabel.localPosition = this.ptR;
        this.config.ptRLabel.sceneObjectWithMatrixWorld = this.lineRs.sceneObject;

        this.config.ptSLabel.localPosition = this.diameterEnd;
        this.config.ptSLabel.sceneObjectWithMatrixWorld = this.lineRs.sceneObject;

        this.updateLabelPositions();
    }

    set angleOapCompliment_rad(value: number) {
        if (this._angleOapCompliment_rad == value) {
            return;
        }
        const centralAngle_rad = TransverseCircleAngleRange.fromAngleOapCompliment_rad(value);

        if (this.config.centralAngle_rad.includes(centralAngle_rad)) {
            this.updatePointsAndDirections(value);
            this.circle.vertexCoords.recalculateVertices();
            this.diameter.updateVertex(1, this.diameterEnd).
                commitUpdates();
            this.lineRa.updateVertex(0, this.ptR).
                commitUpdates();
            this.lineRp.updateVertex(0, this.ptR).
                updateVertex(1, this.ptP).
                commitUpdates();
            this.lineRs.updateVertex(0, this.ptR).
                updateVertex(1, this.diameterEnd).
                commitUpdates();
            this.updateLabelPositions();
            this._angleOapCompliment_rad = value;
        } else {
            console.error(
                `Angle OAP compliment (90° - ∢OAP) ${value} rad corresponds to an out of bounds ` +
                `(${this.config.centralAngle_rad.repr('°', 180 / Math.PI)})` +
                ` central angle = ${centralAngle_rad / Math.PI * 180}°`);
        }
    }

    private updatePointsAndDirections(angleOapCompliment_rad: number) {
        this.updateCirclePlane(angleOapCompliment_rad);
        this.updateCenter();
        this.updateDiameterEnd();
        this.updatePtP(angleOapCompliment_rad);
        this.updatePtR();
    }

    private updateCirclePlane(angleOapCompliment_rad: number) {
        this.circlePlane.xHat.copy(this.config.baseCirclePlane.yHat).
            multiplyScalar(-Math.cos(angleOapCompliment_rad)).
            addScaled(
                this.config.baseCirclePlane.xHat,
                Math.sin(angleOapCompliment_rad));
    }

    /** Depends on {@link circlePlane} */
    private updateCenter() {
        this.center.copy(this.config.origin).
            addScaled(this.circlePlane.xHat, -this.config.radius);
    }

    /** Depends on {@link circlePlane} */
    private updateDiameterEnd() {
        this.diameterEnd.copy(this.config.origin).
            addScaled(this.circlePlane.xHat, -2.0 * this.config.radius);
    }

    /** Depends on {@link circlePlane} */
    private updatePtP(angleOapCompliment_rad: number) {
        this.ptP.copy(this.config.origin).
            addScaled(
                this.circlePlane.xHat,
                -2.0 * this.config.radius * Math.sin(angleOapCompliment_rad));
    }

    /** Depends on {@link center}, {@link ptP}, {@link circlePlane}. */
    private updatePtR() {
        const lenCenterToP = this.center.distanceTo(this.ptP);

        this.ptR.copy(this.ptP).
            addScaled(
                this.circlePlane.yHat,
                Math.sqrt(
                    this.config.radius * this.config.radius -
                    lenCenterToP * lenCenterToP));
    }

    private updateLabelPositions() {
        this.config.labelPositioner.
            positionLabel(this.config.ptRLabel).
            positionLabel(this.config.ptSLabel);
    }
}
