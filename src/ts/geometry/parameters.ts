import { CameraTransform } from './projections';
import { ColumnVector } from './vectors_and_matrices';


/**
 * A range between two numbers subdivided into steps of possibly unequal size.
 *
 * @remarks
 *
 * It would be convenient to make this an iterable. Unfortunately, using
 * a generator function seems to be up to 30 times slower than a for loop
 * on Chrome 109.0.5414.120, Firefox 109.0, and Edge 109.0.1518.70.
 * Interestingly, Firefox ran a lambda in a for loop only about 25% slower
 * than a for loop (Chrome, and Edge ran a lambda in a loop about about 6
 * times slower than a for loop).
 * 
 * This seems a bit much. So, we don't implement an iterable. ☹️
 */
export interface ValueRange {
    /** The start bound of the range. */
    readonly start: number;

    /** The end bound of the range. */
    readonly end: number;

    /** Size of the range = `{@link end} - {@link start}`. */
    readonly size: number;

    /**
     * Number of steps in the range.
     *
     * Step indices go from 0 to `stepCount - 1`.
     */
    readonly stepCount: number;

    /**
     * The step from a given step index to the next step index.
     *
     * Making this depend on `stepIdx` lets us define ranges where the step is
     * not constant.
     *
     * @remarks
     *
     * This is useful for intersecting geometries, such as curves or surfaces,
     * which are rendered by being approximated as sequences of line segments
     * or triangles.  E.g., if you have:
     *   - two touching circles,
     *   - each approximated by line segments,
     *   - the end points of line segments in each circle corresponding to an
     *     angle around the center of each cirle,
     *   - each of these angles being computed by a `Range`,
     *
     * Then you may want:
     *   - the point where the circles touch to be rendered (be an end point
     *     of approximating line segments) in each circle,
     *   - even if that point doesn't correspond to iterating over the angles
     *     around the centers of each circle with a constant step.
     *
     * Otherwise, in the rendered result the two circles may appear to not be
     * touching (unless each of the approximating line segments was not longer
     * than a pixel).
     */
    stepSize(stepIdx: number): number;

    /** The value in the range at step index `stepIdx`. */
    atStep(stepIdx: number): number;

    /** Returns whether a given value is within the closed range. */
    includes(value: number): boolean;

    /** Returns the index of the last step with value <= the given `value`. */
    lastIncludedStepIdx(value: number): number;

    clone(): this;

    cloneAsMutable(): MutableValueRange;

    reverse(): this;

    repr(unitRepr?: string, valueToRepr?: ((value: number) => string) | number): string;
}

export interface MutableValueRange extends ValueRange {
    setStartEnd(start: number, end: number): this;
}

export class ConstStepRange implements ValueRange {
    static radRangeFromStartEndDegStepCount(
        start_deg: number, end_deg: number, step_count: number
    ) {
        return new ConstStepRange(
            start_deg * Math.PI / 180.0,
            end_deg * Math.PI / 180.0,
            step_count);
    }

    private readonly _stepSize: number;
    protected _start: number;
    protected _end: number;

    /**
     * @param start - The start bound of the range.
     * @param end - The end bound of the range.
     * @param stepCount - The number of steps in the range.
     */
    constructor(
        start: number,
        end: number,
        readonly stepCount: number
    ) {
        this._start = start;
        this._end = end;
        this._stepSize = (end - start) / stepCount;
    }

    get start() {
        return this._start;
    }

    get end() {
        return this._end;
    }

    get size() {
        return this._end - this._start;
    }

    stepSize(stepIdx: number) {
        return this._stepSize;
    }

    atStep(stepIdx: number) {
        return this.start + this._stepSize * stepIdx;
    }

    includes(value: number) {
        return value >= this.start && value <= this.end;
    }

    lastIncludedStepIdx(value: number) {
        return Math.floor((value - this.start) / this._stepSize);
    }

    clone(): this {
        return new ConstStepRange(this.start, this.end, this.stepCount) as this;
    }

    cloneAsMutable(): MutableConstStepRange {
        return new MutableConstStepRange(this.start, this.end, this.stepCount);
    }

    reverse(): this {
        const tmp = this._end;

        this._end = this._start;
        this._start = tmp;

        return this;
    }

    repr(unitRepr: string = '', valueToRepr?: ((value: number) => string) | number): string {
        let start;
        let end;

        if (typeof valueToRepr == 'function') {
            start = valueToRepr(this.start);
            end = valueToRepr(this.end);
        } else if (typeof valueToRepr == 'number') {
            start = this.start * valueToRepr;
            end = this.end * valueToRepr;
        } else {
            start = this.start;
            end = this.end;
        }

        return `[${start}${unitRepr}; ${end}${unitRepr}]`;
    }
}

export class MutableConstStepRange extends ConstStepRange implements MutableValueRange {
    setStartEnd(start: number, end: number): this {
        this._start = start;
        this._end = end;

        return this;
    }
}

/** Defines a plane, and an x, and a y direction in it. */
export class PlaneDirections<Dim extends 2 | 3> {
    /**
     * @param xHat - Unit vector defining the `x` direction.
     * @param yHat - Unit vector defining the `y` direction.
     */
    constructor(readonly xHat: ColumnVector<Dim>, readonly yHat: ColumnVector<Dim>) { }

    get zHat(): Dim extends 3 ? ColumnVector<Dim> : never {
        return this.xHat.clone().vectorCross(this.yHat);
    }

    /**
     * Returns a unit vector in the plane rotated a given angle from the `x`
     * direction.
     */
    unitVecAtAngle(angle_rad: number, out_result: ColumnVector<Dim>) {
        out_result.copy(this.xHat).multiplyScalar(Math.cos(angle_rad)).
            addScaled(this.yHat, Math.sin(angle_rad));

        return out_result;
    }

    /**
     * Returns the angle by which a given vector is displaced from the x axis
     * of this plane.
     * 
     * The result is in radians, in the range from -PI to +PI.
     * 
     * @param vecRelativeToOrigin - The vector whose angle from the x axis to
     *     determine.
     */
    angleForVector_rad(vecRelativeToOrigin: ColumnVector<Dim>): number {
        const x = this.xHat.vectorDot(vecRelativeToOrigin);
        const y = this.yHat.vectorDot(vecRelativeToOrigin);

        return Math.atan2(y, x);
    }

    rotateByAngle_rad(angle_rad: number): this {
        const newXHat = this.xHat.clone().
            multiplyScalar(Math.cos(angle_rad)).
            addScaled(this.yHat, Math.sin(angle_rad));
        const newYHat = this.xHat.clone().
            multiplyScalar(-Math.sin(angle_rad)).
            addScaled(this.yHat, Math.cos(angle_rad));

        this.xHat.copy(newXHat);
        this.yHat.copy(newYHat);

        return this;
    }

    isXyProjectionInRightDirection(): boolean {
        const xHat = this.xHat;
        const yHat = this.yHat;

        return xHat.getComponent(0) * yHat.getComponent(1) -
            xHat.getComponent(1) * yHat.getComponent(0) >= 0;
    }

    clone(): this {
        return new PlaneDirections(
            this.xHat.clone(), this.yHat.clone()) as this;
    }

    repr(): string {
        return `(xHat^T: ${this.xHat.transposed().repr()}, yHat^T: ${this.yHat.transposed().repr()})`;
    }

    projectToCamera(
        cameraTransform: CameraTransform<Dim>,
        unprojectedOrigin: ColumnVector<Dim>,
        projectedOrigin: ColumnVector<Dim>,
        out_result: PlaneDirections<Dim>
    ): typeof out_result {
        out_result.xHat.copy(unprojectedOrigin).
            add(this.xHat);
        cameraTransform.project(out_result.xHat).
            subtract(projectedOrigin);

        out_result.yHat.copy(unprojectedOrigin as any).
            add(this.yHat);
        cameraTransform.project(out_result.yHat).
            subtract(projectedOrigin);

        return out_result;
    }
}
