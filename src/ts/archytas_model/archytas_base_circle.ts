import * as THREE from 'three';
import { ConstStepRange, PlaneDirections, ValueRange } from '../geometry/parameters';
import { ColumnVector, ColumnVector3, ColumnVectorFactory } from '../geometry/vectors_and_matrices';
import { EllipseArc } from './plane_objects';
import { Label, LabelPositioner } from '../three_scene_renderer';
import { Line } from './tesselation_base';

export class BaseCircleAngleRange extends ConstStepRange {
    constructor(angleOapCompliment_rad: ValueRange) {
        super(
            BaseCircleAngleRange.fromAngleOapCompliment_rad(angleOapCompliment_rad.start),
            BaseCircleAngleRange.fromAngleOapCompliment_rad(angleOapCompliment_rad.end),
            angleOapCompliment_rad.stepCount);
    }

    /**
     * Converts an angle between the the tangent to a diameter, and a secant 
     * through the point where the tangent touches the circle into an angle
     * around the center of the circle.
     */
    static fromAngleOapCompliment_rad(
        angleOapCompliment_rad: number
    ): number {
        return 2.0 * angleOapCompliment_rad;
    }
}

export class BaseCircleConfiguration {
    constructor(
        readonly circleMaterial: THREE.Material,
        readonly diameterMaterial: THREE.Material,
        readonly lineApMaterial: THREE.Material,
        readonly linePqMaterial: THREE.Material,
        readonly linePoMaterial: THREE.Material,
        readonly ptALabel: Label,
        readonly ptOLabel: Label,
        readonly ptPLabel: Label,
        readonly ptQLabel: Label,
        readonly labelPositioner: LabelPositioner,
        readonly origin: ColumnVector<3>,
        readonly plane: PlaneDirections<3>,
        readonly centralAngle: BaseCircleAngleRange,
        readonly radius: number) { }
}

export class ArchytasBaseCircle {
    readonly circle: EllipseArc;
    readonly diameter: Line;
    readonly lineAp: Line;
    readonly linePq: Line;
    readonly linePo: Line;
    readonly sceneObject: THREE.Object3D;
    private readonly ptP = new ColumnVector3();
    readonly ptQ = new ColumnVector3();
    private readonly diameterEnd: ColumnVector<3>;
    private readonly center: ColumnVector<3>;
    private readonly _angleOapCompliment = 0.0;

    constructor(
        readonly config: BaseCircleConfiguration
    ) {
        this.sceneObject = new THREE.Group()

        this.center = config.origin.clone().
            addScaled(config.plane.xHat, -config.radius);
        this.diameterEnd = config.origin.clone().
            addScaled(config.plane.xHat, -2.0 * config.radius);
        this.updatePointsAndDirections(this._angleOapCompliment);

        this.circle = new EllipseArc(
            {
                origin: this.center,
                plane: config.plane,
                circularAngle_rad: config.centralAngle,
                semiXAxis: config.radius,
                semiYAxis: config.radius
            },
            config.circleMaterial);
        this.sceneObject.add(this.circle.sceneObject);

        this.diameter = new Line(
            config.diameterMaterial,
            [config.origin, this.diameterEnd]);
        this.sceneObject.add(this.diameter.sceneObject);

        this.lineAp = new Line(
            config.lineApMaterial,
            [config.origin, this.ptP]);
        this.sceneObject.add(this.lineAp.sceneObject);

        this.linePq = new Line(
            config.linePqMaterial,
            [this.ptP, this.ptQ]);
        this.sceneObject.add(this.linePq.sceneObject);

        this.linePo = new Line(
            config.linePoMaterial,
            [this.ptP, this.diameterEnd]);
        this.sceneObject.add(this.linePo.sceneObject);

        this.config.ptALabel.localPosition = config.origin;
        this.config.ptALabel.sceneObjectWithMatrixWorld = this.diameter.sceneObject;

        this.config.ptOLabel.localPosition = this.diameterEnd;
        this.config.ptOLabel.sceneObjectWithMatrixWorld = this.diameter.sceneObject;

        this.config.ptPLabel.localPosition = this.ptP;
        this.config.ptPLabel.sceneObjectWithMatrixWorld = this.linePq.sceneObject;

        this.config.ptQLabel.localPosition = this.ptQ;
        this.config.ptQLabel.sceneObjectWithMatrixWorld = this.linePq.sceneObject;

        this.updateLabelPositions();
    }

    set angleOapCompliment_rad(value: number) {
        const centralAngle_rad = BaseCircleAngleRange.fromAngleOapCompliment_rad(value);

        if (this.config.centralAngle.includes(centralAngle_rad)) {
            this.updatePointsAndDirections(value);
            this.lineAp.updateVertex(1, this.ptP).
                commitUpdates();
            this.linePq.updateVertex(0, this.ptP).
                updateVertex(1, this.ptQ).
                commitUpdates();
            this.linePo.updateVertex(0, this.ptP).
                commitUpdates();
            this.updateLabelPositions();
        } else {
            console.error(
                `Angle OAP compliment (90° - ∢OAP) ${value} rad corresponds to an out of bounds ` +
                `[${this.config.centralAngle.start} rad; ${this.config.centralAngle.end} rad]` +
                ` central angle = ${centralAngle_rad} rad`);
        }
    }

    private updateLabelPositions() {
        this.config.labelPositioner.
            positionLabel(this.config.ptALabel).
            positionLabel(this.config.ptOLabel).
            positionLabel(this.config.ptPLabel).
            positionLabel(this.config.ptQLabel);
    }

    private updatePointsAndDirections(angleOapCompliment_rad: number) {
        const centralAngle_rad = 2.0 * angleOapCompliment_rad;
        const center = this.center;
        const radius = this.config.radius;
        const plane = this.config.plane;

        this.ptQ.copy(center).
            addScaled(plane.xHat, radius * Math.cos(centralAngle_rad));
        this.ptP.copy(this.ptQ).
            addScaled(plane.yHat, radius * Math.sin(centralAngle_rad));
    }
}
