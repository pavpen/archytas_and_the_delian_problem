import { MutableValueRange, PlaneDirections, ValueRange } from "./parameters";
import { CameraTransform } from "./projections";
import { ColumnVector, ColumnVector2, ColumnVector3, Matrix, Matrix2, Matrix3, MatrixColumnAsVector, MatrixColumnAsVectorFactory, MatrixFactory, RowVector2, RowVector3 } from "./vectors_and_matrices";
import { ParametricVertexCalculator, VertexAndTangent, VertexCalculator, VertexWriter } from "./vertices";

/**
 * Parameters for constructing an elliptical arc.
 */
export interface EllipticalArcParameters<Dim extends 2 | 3> {
    /**
     * Midpoint between the ellipse foci.
     *
     * @see {@link circularAngle_rad}
     */
    readonly origin: ColumnVector<Dim>;

    /**
     * Defines the plane of the elliptical arc, and the direction at angle 0.
     */
    readonly plane: PlaneDirections<Dim>;

    /**
     * Range, and steps of the angle at which to generate tesselation points.
     * 
     * @remarks
     * 
     * There's a circular angle corresponding to each point on the ellipse.
     * It refers to a circle with radius equal to the major axis, and center
     * which is the midpoint between the ellipse's foci.  Each point on the
     * ellipse correspoponds to a point on the circle obtained by constructing
     * a perpendicular to the line through the ellipse's foci.  The
     * intersection with the ellipse corresponds to the intersection with the
     * cirle on each side of the line.  The angle between the line, and radius
     * from the circle's center to the point on the cirle is the
     * `circularAngle`.
     */
    readonly circularAngle_rad: ValueRange;

    /** Half the size of the ellipse in the x direction. */
    readonly semiXAxis: number;

    /** Half the size of the ellipse in the y direction. */
    readonly semiYAxis: number;
}

export interface MutableEllipticalArcParameters<Dim extends 2 | 3> extends
    EllipticalArcParameters<Dim> {

    origin: ColumnVector<Dim>;
    plane: PlaneDirections<Dim>;
    circularAngle_rad: MutableValueRange;
    semiXAxis: number;
    semiYAxis: number;
}

enum SkewedEllipticalConeResult {
    /** The skewed elliptical cone parameters are finite. */
    Finite,

    /**
     * The elliptical cone is degenerate, i.e. it passes through an ellipse
     * whose major axis, minor axis, or both are 0 (or indistiguishable from 0
     * with the used precision).
     */
    AxisDegenerate,

    /**
     * The whole cone is in one plane.  I.e., the cone vertex is in the same
     * plane as the standard ellipse (at z=0) that the cone passes through.
     * 
     * Note that a {@link PlaneDegenerate} cone may also be
     * {@link AxisDegenerate}, if the cone vertex is outside the standard
     * ellipse.
     */
    PlaneDegenerate
}

export class EllipticalArcConfigCalculator<Dim extends 2 | 3> {
    private readonly _vector: ColumnVector<Dim>;
    private readonly _vector2: ColumnVector<2>;
    private readonly _vector3: ColumnVector<3>;
    private readonly _matrix2x2: Matrix2;
    private readonly _matrix3: Matrix<3, 3>;
    private readonly _matrix3x2: Matrix<3, 2>;
    private readonly _matrixColumn3: MatrixColumnAsVector<3>;
    private readonly ellipseBasis: Matrix<3, 3>;
    private readonly projectionPlaneBasis2: Matrix<3, 2>;
    // Elliptical cone which corresponds to the given ellipse, and projection
    // plane:
    private readonly eyePoint_c: ColumnVector<3>;
    private readonly ellipticalConeVertex_c: ColumnVector<3>;
    private readonly ellipseCenter_c: ColumnVector<3>;
    // The conic section equation is X^T * A * X + B^T * X + c = 0:
    private readonly conicEqA_c: Matrix<3, 3>;
    private readonly conicEqB_c: ColumnVector<3>;
    private readonly conicEqC_c: number = -1;
    // Skewed cone corresponding to the elliptical cone:
    private readonly conicEqA_s: Matrix<3, 3>;
    private readonly conicEqB_s: ColumnVector<3>;
    private conicEqC_s: number;
    // Equation in the projection plane:
    private readonly conicEqA_p: Matrix2;
    private readonly conicEqB_p: ColumnVector<2>;
    private conicEqC_p: number;
    // Decomposed into factors for reconstructing the ellipse axes in the
    // projection plane:
    // (X - K)^T * M * (X - K) = 1
    private readonly ellipseEqK_p: ColumnVector<2>;
    private readonly ellipseEqM_p: Matrix2;
    // The factor in the ellipse equation above decomposed into eigenvalues
    // (1/semi-x-axis^2, and 1/semi-y-axis^2), and eigenvectors
    // (ellipse axis unit vectors, after normalization).
    private readonly ellipseEigenvalues_p: ColumnVector<2>;
    private readonly ellipseEigenvectors_p: Matrix<2, 2>;
    private readonly ellipseEigencolumn_p: MatrixColumnAsVector<2>;

    /**
     * @param factoryVector - Used to create new vector objects by cloning.
     *     It's value is unused.  E.g., you can use this to create vector
     *     objects derived from Three.js's Vector3, or from another vector
     *     implementation.
     * @param eps - Floating point numbers with absolute value less than `eps`
     *     will be treated as zero.  Used to avoid considering equal values
     *     unequal due to floating point rounding errors.  Can also lead to
     *     considering unequal values as equal due to insufficient precision.
     */
    constructor(
        factoryVector: ColumnVector<Dim>,
        readonly eps = 1e-15
    ) {
        this._vector = factoryVector.clone();
        if (factoryVector.componentCount > 2) {
            // We only need to calculate projections for 3D ellipses:
            this._vector2 = new ColumnVector2();
            this._vector3 = new ColumnVector3();
            this._matrix2x2 = new Matrix2();
            this._matrix3 = new Matrix3();
            this._matrix3x2 = MatrixFactory.create(3, 2);
            this._matrixColumn3 = MatrixColumnAsVectorFactory.create(this._matrix3x2, 0);
            this.ellipseBasis = new Matrix3();
            this.projectionPlaneBasis2 = MatrixFactory.create(3, 2);
            this.eyePoint_c = new ColumnVector3();
            this.ellipticalConeVertex_c = new ColumnVector3();
            this.ellipseCenter_c = new ColumnVector3();
            this.conicEqA_c = new Matrix3();
            this.conicEqB_c = new ColumnVector3();
            this.conicEqA_s = new Matrix3();
            this.conicEqB_s = new ColumnVector3();
            this.conicEqA_p = new Matrix2();
            this.conicEqB_p = new ColumnVector2();
            this.ellipseEqK_p = new ColumnVector2();
            this.ellipseEqM_p = new Matrix2();
            this.ellipseEigenvalues_p = new ColumnVector2();
            this.ellipseEigenvectors_p = new Matrix2();
            this.ellipseEigencolumn_p =
                MatrixColumnAsVectorFactory.create(this.ellipseEigenvectors_p, 0);
        }
    }

    /**
     * The projection of the ellipse must not be a hyperbola, or a parabola.
     */
    projectToCamera(
        parameters: EllipticalArcParameters<Dim>,
        cameraTransform: CameraTransform<Dim>,
        out_result: MutableEllipticalArcParameters<Dim>,
        eps = this.eps
    ): typeof out_result {
        // console.log(`EllipticalArcConfigCalculator.projectToCamera: parameters: {` +
        //     `origin^T: ${parameters.origin.transposed().repr()}, plane: ${parameters.plane.repr()}, ` +
        //     `semiXAxis: ${parameters.semiXAxis}, semiYAxis: ${parameters.semiYAxis}, ` +
        //     `circularAngle: [${parameters.circularAngle_rad.start / Math.PI * 180}°, ${parameters.circularAngle_rad.end / Math.PI * 180}°]}, ` +
        //     `camera: ${cameraTransform.repr()}`);

        if (parameters.origin.componentCount != 3 || !cameraTransform.isPerspectiveCamera) {
            return this.projectNonPerspective(parameters, cameraTransform, out_result);
        }
        if (this.calcSkewedConeInInputEllipseFrame(parameters, cameraTransform, eps) ==
            SkewedEllipticalConeResult.Finite
        ) {
            this.calcConeInWorldFrame();
            this.calcProjectedEllipseConicEq(cameraTransform);
            this.calcProjectedEllipseMatrixEq();
            this.calcPerspectiveProjection(
                parameters as any, cameraTransform as any, out_result as any, eps);
        } else {
            this.calcDegenerateProjection(
                parameters as any, cameraTransform as any, out_result as any, eps);
        }

        // console.log(`  out_result: {` +
        //     `origin^T: ${out_result.origin.transposed().repr()}, plane: ${out_result.plane.repr()}, ` +
        //     `semiXAxis: ${out_result.semiXAxis}, semiYAxis: ${out_result.semiYAxis}, ` +
        //     `circularAngle: [${out_result.circularAngle_rad.start / Math.PI * 180}°, ${out_result.circularAngle_rad.end / Math.PI * 180}°]}`);

        return out_result;
    }

    /**
     * Calculates the parameters (such as elliptical equation coefficients) of
     * a skewed elliptical cone which passes through the ellipse we want to
     * project, and has a vertex at the camera (a.k.a eyepoint) for which
     * we're projecting the ellipse.  All parameters are calculated, only if
     * they're finite.
     * 
     * The calculated parameters are in the input ellipse refernce frame.
     * 
     * @remarks
     * 
     * Calculates {@link ellipseBasis}, {@link eyePoint_c},
     * {@link ellipticalConeVertex_c}, {@link ellipseCenter_c},
     * {@link conicEqA_c}, {@link conicEqB_c}, {@link conicEqC_c}.
     * 
     * @see https://www.geometrictools.com/Documentation/PerspectiveProjectionEllipse.pdf
     * for a nice description.
     * 
     * @returns Enum value indicating whether all parameters were finite, or
     *     whether some of them weren't, and, therefore, some or al
     *     parameters were not calculated.
     */
    private calcSkewedConeInInputEllipseFrame(
        parameters: EllipticalArcParameters<Dim>,
        cameraTransform: CameraTransform<Dim>,
        eps: number
    ): SkewedEllipticalConeResult {
        if (Math.abs(parameters.semiXAxis) < eps ||
            Math.abs(parameters.semiYAxis) < eps
        ) {
            // console.log(`calcUnprojectedSkewedEllipticalCone: Input ellipse is degenerate ` +
            //     `(semiXAxis: ${parameters.semiXAxis}, semiYAxis: ${parameters.semiYAxis}). ` +
            //     `Output ellipse will also be degenerate.  Returning \`AxisDegenerate\`.`);

            return SkewedEllipticalConeResult.AxisDegenerate;
        }

        this.ellipseBasis.setFromColumnVectors(
            parameters.plane.xHat as any as ColumnVector<3>,
            parameters.plane.yHat as any as ColumnVector<3>,
            parameters.plane.zHat);

        // console.log(`calcUnprojectedSkewedEllipticalCone: ellipseBasis (R_e = ellipse's [x_hat, y_hat, z_hat]):\n` +
        //     `${this.ellipseBasis.repr({ rowPrefix: '    ' })}`);

        // In camera coordinates (with z axis towards the eye point):
        // cameraTransform.getWorldPosition(this.eyePoint_c as any);
        // console.log(`  camera = eyePoint (E)^T: ${this.eyePoint_c.transposed().repr()}`);
        // console.log(`  origin (C_e = ellipse center)^T: ${parameters.origin.transposed().repr()}`);

        const eyePoint_c: ColumnVector<3> = cameraTransform.getWorldPosition(this.eyePoint_c as any).
            subtract(parameters.origin) as any;

        // console.log(`  eyePoint_c (E - C_e)^T: ${eyePoint_c.transposed().repr()}`);

        const ellipticalConeVertex_c = this.ellipticalConeVertex_c.
            setComponent(0, eyePoint_c.vectorDot(parameters.plane.xHat as any)).
            setComponent(1, eyePoint_c.vectorDot(parameters.plane.yHat as any)).
            setComponent(2, eyePoint_c.vectorDot(parameters.plane.zHat));

        // console.log(`  ellipticalConeVertex_c [E_bar = R_e^T * (E - C_e)]^T: ${ellipticalConeVertex_c.transposed().repr()}`);

        if (Math.abs(ellipticalConeVertex_c.getComponent(2)) < eps) {
            // The eyepoint is in the same plane as the ellipse we're trying
            // to project.  If the eyepoint is inside the ellipse, the
            // projection is an infinite ellipse coinciding with the hole
            // horizon.  If the eyepoint is outside the ellipse, the
            // projection is a degenerate ellipse that coincides with a line
            // segment.
            // console.log(`  Eyepoint in the same plane as the ellipse we're projecting.  ` +
            //     `Returning \`PlaneDegenerate\`.`);

            return SkewedEllipticalConeResult.PlaneDegenerate;
        }

        this.ellipseCenter_c.
            setComponent(0, parameters.origin.vectorDot(parameters.plane.xHat)).
            setComponent(1, parameters.origin.vectorDot(parameters.plane.yHat)).
            setComponent(2, parameters.origin.vectorDot(parameters.plane.zHat));

        // console.log(`  ellipseCenter_c [C_bar_e = R_e^T * C_e]^T: ${this.ellipseCenter_c.transposed().repr()}`);

        // Elliptical equation coefficients:
        // X^T * A_c * X + B_c^T * X + c = 0
        // where X = column vector for a point on the ellipse,
        // A_c is = 3x3 symmetric coefficient matrix,
        // B_c = 3x1 coefficient column vector.
        const semiXAxis = parameters.semiXAxis;
        const semiYAxis = parameters.semiYAxis;
        const conicEqA_c = this.conicEqA_c;
        conicEqA_c.setElement(0, 0, 1 / (semiXAxis * semiXAxis));
        conicEqA_c.setElement(1, 1, 1 / (semiYAxis * semiYAxis));
        conicEqA_c.setElement(0, 1, 0);
        conicEqA_c.setElement(1, 0, 0);

        const a_c_02 = -ellipticalConeVertex_c.getComponent(0) / (ellipticalConeVertex_c.getComponent(2) * semiXAxis * semiXAxis)

        conicEqA_c.setElement(0, 2, a_c_02);
        conicEqA_c.setElement(2, 0, a_c_02);

        const a_c_12 =
            -ellipticalConeVertex_c.getComponent(1) / (ellipticalConeVertex_c.getComponent(2) * semiYAxis * semiYAxis)

        conicEqA_c.setElement(1, 2, a_c_12);
        conicEqA_c.setElement(2, 1, a_c_12);
        conicEqA_c.setElement(2, 2,
            (ellipticalConeVertex_c.getComponent(0) * ellipticalConeVertex_c.getComponent(0) / (semiXAxis * semiXAxis) +
                ellipticalConeVertex_c.getComponent(1) * ellipticalConeVertex_c.getComponent(1) / (semiYAxis * semiYAxis) -
                1) /
            (ellipticalConeVertex_c.getComponent(2) * ellipticalConeVertex_c.getComponent(2)));

        // console.log(`  conicEqA_c [A_bar: a_00=1/semiXAxis^2, a11=1/semiYAxis^2, a_01=a_10=0, ` +
        //     `a_02=a_20=-E_bar_0/(E_bar_2*semiXAxis^2), a_12=a_21=-E_bar_1/(E_bar_2*semiYAxis^2), ` +
        //     `a_22=(E_bar_0^2/semiXAxis^2+E_bar_1^2/semiYAxis^2-1)/E_bar_2^2]:\n` +
        //     `${conicEqA_c.repr({ rowPrefix: '    ' })}`);

        this.conicEqB_c.setComponent(0, 0).
            setComponent(1, 0).
            setComponent(2, 2.0 / ellipticalConeVertex_c.getComponent(2));

        // console.log(`  conicEqB_c (B_bar: b_0=b_1=0, b_2=2/E_bar_2)^T: ${this.conicEqB_c.transposed().repr()}`);

        // This doesn't change:
        // this.conicEqC_c = -1;

        // console.log(`  conicEqC_c (c_bar = -1): ${this.conicEqC_c}`);

        return SkewedEllipticalConeResult.Finite;
    }

    /**
     * Calculates the parametric equation coefficients of the elliptical cone
     * that passes through the input input ellipse, and has a vertex at the
     * eyepoint.
     * 
     * The parameters are calculated in wold coordinates.  The input ellipse
     * is no longer in the plane with z=0.
     * 
     * @remarks
     * 
     * Calculates {@link conicEqA_s}, {@link conicEqB_s}, {@link conicEqC_s}.
     * 
     * Depends on the values from {@link calcSkewedConeInInputEllipseFrame}.
     * 
     * @see https://www.geometrictools.com/Documentation/PerspectiveProjectionEllipse.pdf
     * for a nice description.
     */
    private calcConeInWorldFrame() {
        const conicEqA_s = this.ellipseBasis.multiply(this.conicEqA_c, this._matrix3).
            multiply(this.ellipseBasis.transposed(), this.conicEqA_s);

        // console.log(`calcSkewedCone: conicEqA_s (A = R_e * A_bar * R_e^T):\n${conicEqA_s.repr({ rowPrefix: '    ' })}`);

        // Set this.conicEqB_s:
        const vector: ColumnVector<3> = this._vector as any as ColumnVector<3>;
        this.conicEqA_c.multiply(
            this.ellipseCenter_c, vector).
            multiplyScalar(-2).
            add(this.conicEqB_c);
        this.ellipseBasis.multiply(vector, this.conicEqB_s);

        // console.log(`  conicEqB_s [B = R_e * (B_bar - 2 * A_bar * C_bar_e)]^T: ${this.conicEqB_s.transposed().repr()}`);

        // this.conicEqC_s:
        this.conicEqA_c.multiply(this.ellipseCenter_c, vector);
        this.conicEqC_s = vector.vectorDot(this.ellipseCenter_c) -
            this.conicEqB_c.vectorDot(this.ellipseCenter_c) +
            this.conicEqC_c;

        // console.log(`  conicEqC_s (c = C_bar_e^T * A_bar * C_bar_e - B_bar^T * C_bar_e + c_bar): ${this.conicEqC_s}`);
    }

    /**
     * Calculates the parameters of the conic section equation for the
     * intersection between the elliptical cone passing through the input
     * ellipse, and with vertex at the eyepoint, and the projection plane.
     * 
     * The parameters are calculated in the projection plane reference frame.
     * 
     * @remarks
     * 
     * Calculates {@link projectionPlaneBasis2}, {@link conicEqA_p},
     * {@link conicEqB_p}, {@link conicEqC_p}.
     * 
     * Depends on the values from {@link calcConeInWorldFrame}.
     * 
     * @see https://www.geometrictools.com/Documentation/PerspectiveProjectionEllipse.pdf
     * for a nice description.
     */
    private calcProjectedEllipseConicEq(cameraTransform: CameraTransform<Dim>) {
        // projectionPlaneBasis2:
        cameraTransform.getProjectionPlaneXHat(this._vector);
        cameraTransform.getProjectionPlaneYHat(this._vector3 as any);
        this.projectionPlaneBasis2.setFromColumnVectors(
            this._vector as any, this._vector3);

        // console.log(`calcProjectedEllipseConicEq: projectionPlaneBasis2 {J_p = projection plane's [x_hat, y_hat]}:\n` +
        //     `${this.projectionPlaneBasis2.repr({ rowPrefix: '    ' })}`);

        // conicEqA_p:
        this.conicEqA_s.multiply(this.projectionPlaneBasis2, this._matrix3x2);

        const projectionPlaneBasis2Transposed = this.projectionPlaneBasis2.transposed();

        projectionPlaneBasis2Transposed.multiply(
            this._matrix3x2, this.conicEqA_p);

        // console.log(`  conicEqA_p (A_hat = J_p^T * A * J_p):\n${this.conicEqA_p.repr({ rowPrefix: '    ' })}`);

        // conicEqB_p:
        const projectionPlaneCenter: ColumnVector<3> =
            cameraTransform.getProjectionPlaneCenter(this._vector) as any;

        // console.log(`  projectionPlaneCenter (C_p)^T: ${projectionPlaneCenter.transposed().repr()}`);

        this.conicEqA_s.multiply(projectionPlaneCenter, this._vector3).
            multiplyScalar(2).
            add(this.conicEqB_s);
        projectionPlaneBasis2Transposed.multiply(this._vector3, this.conicEqB_p);

        // console.log(`  conicEqB_p [B_hat = J_p^T * (B + 2 * A * C_p)]^T: ${this.conicEqB_p.transposed().repr()}`);

        // conicEqC_p:
        this.conicEqA_s.multiply(projectionPlaneCenter, this._vector3);
        this.conicEqC_p = this._vector3.vectorDot(projectionPlaneCenter) +
            this.conicEqB_s.vectorDot(projectionPlaneCenter) +
            this.conicEqC_s;

        // console.log(`  conicEqC_p (c_hat = C_p^T * A * C_p + B^T * C_p + c): ${this.conicEqC_p}`);
    }

    /**
     * Calculates ellipse equation parameters from conic section parameters
     * from the conic section equation for the projected ellipse.
     * 
     * Parameters are in the projection plane reference frame.  The parameters
     * are for the matrix equation $(Y - K)^T * M * (Y - K) = 1$ where
     * Y = coordinates of a point on the ellipse, K = ellipse center,
     * M = matrix combining ellipse axis vectors, and semi-axes.
     * 
     * @remarks
     * 
     * Calculates {@link ellipseEqK_p}, {@link ellipseEqM_p}.
     * 
     * Depends on the values from {@link calcProjectedEllipseConicEq}.
     * 
     * @see https://www.geometrictools.com/Documentation/PerspectiveProjectionEllipse.pdf
     * for a nice description.
     */
    private calcProjectedEllipseMatrixEq() {
        // Calculate ellipseEqK_p:

        // Calculate conicEqA_p^(-1) * conicEqB_p. We'll reuse it below.
        const vector = this._vector2;

        this._matrix2x2.copy(this.conicEqA_p).invert().
            multiply(this.conicEqB_p, vector);
        this.ellipseEqK_p.copy(vector).multiplyScalar(-1.0 / 2);

        // console.log(`calcEqInEllipseFrame: A_hat^(-1):\n${this._matrix2x2.repr({ rowPrefix: '    ' })}`);
        // console.log(`  ellipseEqK_p [K = -A_hat^(-1) * B_hat / 2]^T: ${this.ellipseEqK_p.transposed().repr()}`);

        // ellipseEqM_p:
        this.ellipseEqM_p.copy(this.conicEqA_p).
            multiplyScalar(
                1.0 /
                (vector.vectorDot(this.conicEqB_p) / 4 - this.conicEqC_p));

        // console.log(`  ellipseEqM_p {M = A_hat / [B_hat^T * A_hat^(-1) * B_hat / 4 - c_hat]}:\n` +
        //     `${this.ellipseEqM_p.repr({ rowPrefix: '    ' })}`);
    }

    /**
     * Calculates output ellipse parameters.
     * 
     * @remarks
     * 
     * Depends on the results from {@link calcProjectedEllipseMatrixEq}.
     * 
     * @see https://www.geometrictools.com/Documentation/PerspectiveProjectionEllipse.pdf
     * for a nice description.
     */
    private calcPerspectiveProjection(
        parameters: EllipticalArcParameters<3>,
        cameraTransform: CameraTransform<3>,
        out_result: MutableEllipticalArcParameters<3>,
        eps: number
    ) {
        // Calculate the projection of the elliptical arc:
        const eigenvalues = this._vector2;
        const eigenvectors = this._matrix2x2;

        this.ellipseEqM_p.getEigenvaluesAndVectors(eigenvalues, eigenvectors);

        // console.log(`calcPerspectiveProjection: Eigendecomposition of ellipseEqM_p (M): ` +
        //     `eigenvalues: ${eigenvalues.transposed().repr()}, eigenvectors:\n${eigenvectors.repr({ rowPrefix: '    ' })}`);

        // Origin:
        out_result.origin.
            setComponent(0, this.ellipseEqK_p.getComponent(0)).
            setComponent(1, this.ellipseEqK_p.getComponent(1)).
            setComponent(2, 0);

        // console.log(`  Projected ellipse origin: ${out_result.origin.transposed().repr()}`);

        // Semimajor, and semiminor axis:
        if (Math.abs(eigenvalues.getComponent(0)) < eps || Math.abs(eigenvalues.getComponent(1)) < eps) {
            console.error(`calcPerspectiveProjection: Projected ellipse has an infinite semi-major, or semi-minor axis! ` +
                `The ellipse projection must be a parabola. [1/semiXAxis^2, 1/semiYAxis^2]: ${eigenvalues.transposed().repr()}, ` +
                `Input ellipse: origin^T: ${parameters.origin.transposed().repr()}, ` +
                `plane: ${parameters.plane.repr()}, ` +
                `semiXAxis: ${parameters.semiXAxis}, semiYAxis: ${parameters.semiYAxis}, ` +
                `circularAngle_rad: ${parameters.circularAngle_rad.repr('°', 180.0 / Math.PI)}, ` +
                `Camera: ${cameraTransform.repr()}`);
        }
        if (eigenvalues.getComponent(0) < 0 || eigenvalues.getComponent(1) < 0) {
            console.error(`calcPerspectiveProjection: Projected ellipse must be a hyperbola! ` +
                `[1/semiXAxis^2, 1/semiYAxis^2]: ${eigenvalues.transposed().repr()}, ` +
                `Input ellipse: origin^T: ${parameters.origin.transposed().repr()}, ` +
                `plane: ${parameters.plane.repr()}, ` +
                `semiXAxis: ${parameters.semiXAxis}, semiYAxis: ${parameters.semiYAxis}, ` +
                `circularAngle_rad: ${parameters.circularAngle_rad.repr('°', 180.0 / Math.PI)}, ` +
                `Camera: ${cameraTransform.repr()}`);
        }
        out_result.semiXAxis = 1 / Math.sqrt(eigenvalues.getComponent(0));
        out_result.semiYAxis = 1 / Math.sqrt(eigenvalues.getComponent(1));

        // console.log(`  semiXAxis: ${out_result.semiXAxis}, semiYAxis: ${out_result.semiYAxis}`);

        // Copy ellipse axis vectors:
        const eigenColumn = this.ellipseEigencolumn_p.setSource(eigenvectors, 0);

        if (eigenColumn.vectorDot(eigenColumn) < eps) {
            // The x axis is indeterminate. This is either a circle (the axis can be in any direction),
            // or the semiXAxis is zero (or both).
            //
            // We shouldn't reach this code branch if one of the axes is zero!
            // This should be handled earlier.
            eigenColumn.setSource(eigenvectors, 1);

            if (eigenColumn.vectorDot(eigenColumn) < eps) {
                // The y axis is also indeterminate. This is a circle (possibly with a zero radius).

                // console.log('  Projected ellipse x and y axis directions are indeterminate. ' +
                //     'This must be a circle. Using the projection plane axes.');

                // Set the projected ellipse axis vectors to the projection plane basis vectors:
                for (let rowI = 0; rowI < 2; ++rowI) {
                    for (let colI = 0; colI < 2; ++colI) {
                        eigenvectors.setElement(
                            rowI, colI, this.projectionPlaneBasis2.getElement(rowI, colI));
                    }
                }
            } else {
                throw new Error('Projected ellipse x axis direction is indeterminate. ' +
                    "The semiXAxis must be 0. This code branch shouldn't be reached!");
            }
        } else {
            eigenColumn.setSource(eigenvectors, 1);

            if (eigenColumn.vectorDot(eigenColumn) < eps) {
                throw new Error('Projected ellipse y axis direction is indeterminate. ' +
                    "The semiYAxis must be 0. This code branch shouldn't be reached!");
            } else {
                // Both axes are determined.
                eigenvectors.normalizeColumnVectors();
            }
        }

        let endI = Math.min(2, out_result.plane.xHat.componentCount);
        for (let i = 0; i < endI; ++i) {
            out_result.plane.xHat.setComponent(i, eigenvectors.getElement(i, 0));
            out_result.plane.yHat.setComponent(i, eigenvectors.getElement(i, 1));
        }
        endI = out_result.plane.xHat.componentCount;
        for (let i = 2; i < endI; ++i) {
            out_result.plane.xHat.setComponent(i, 0);
            out_result.plane.yHat.setComponent(i, 0);
        }

        // console.log(`  Projected ellipse plane directions: ${out_result.plane.repr()}`);

        const vertexCalculator = new EllipticalArcVertexCalculator(parameters, this._vector3);

        this.projectCircularAngle(
            parameters, cameraTransform, out_result, vertexCalculator);
    }

    /**
     * Calculates what angle range in a projected ellipse corresponds to the
     * angle range in the non-projected ellipse.
     * 
     * @remarks
     * 
     * Depends on `out_result` having the already calculated parameters
     * (center, axes) of the projected ellipse.
     */
    private projectCircularAngle(
        parameters: EllipticalArcParameters<3>,
        cameraTransform: CameraTransform<3>,
        out_result: MutableEllipticalArcParameters<3>,
        vertexCalculator: EllipticalArcVertexCalculator<3>
    ) {
        // console.log(`projectCircularAngle: Unprojected angle range: ${parameters.circularAngle_rad.repr('°', 180 / Math.PI)}`);

        // Start angle:
        const vertex: ColumnVector<3> = this._vector3;
        const projectedVertexCalculator = new EllipticalArcVertexCalculator(out_result, this._vector3);

        vertexCalculator.calculateVertex(parameters.circularAngle_rad.start, vertex);
        cameraTransform.project(vertex).
            subtract(out_result.origin);
        let startAngle_rad = projectedVertexCalculator.circularAngleForEllipsePoint(vertex);

        // console.log(`  In projection plane frame: ellipse: origin^T: ${out_result.origin.transposed().repr()}, plane: ${out_result.plane.repr()}`);
        // console.log(`  Vertex at start angle in ellipse frame: ${vertex.transposed().repr()}, ` +
        //     `startAngle: ${startAngle_rad / Math.PI * 180}°`);

        // End angle:
        vertexCalculator.calculateVertex(parameters.circularAngle_rad.end, vertex);
        cameraTransform.project(vertex).
            subtract(out_result.origin);
        let endAngle_rad = projectedVertexCalculator.circularAngleForEllipsePoint(vertex);

        // We can't tell in which direction to go from start andle to end
        // angle with just two points.  Calculate a third one to tell.
        vertexCalculator.calculateVertex(
            (parameters.circularAngle_rad.start + parameters.circularAngle_rad.end) / 2,
            vertex);
        cameraTransform.project(vertex).
            subtract(out_result.origin);

        const midAngle_rad = projectedVertexCalculator.circularAngleForEllipsePoint(vertex);

        const needsInversion = midAngle_rad < Math.min(startAngle_rad, endAngle_rad) ||
            midAngle_rad > Math.max(startAngle_rad, endAngle_rad);
        const needsDirectionFlip = (endAngle_rad > startAngle_rad && parameters.circularAngle_rad.size < 0) ||
            (endAngle_rad < startAngle_rad && parameters.circularAngle_rad.size > 0);

        // console.log(`  startAngle: ${startAngle_rad / Math.PI * 180}°, endAngle: ${endAngle_rad / Math.PI * 180}°, ` +
        //     `midAngle: ${midAngle_rad / Math.PI * 180}° (${midAngle_rad / Math.PI * 180 + 360}°), ` +
        //     `needsInversion: ${needsInversion}, needsDirectionFlip: ${needsDirectionFlip}`);

        if (needsDirectionFlip) {
            out_result.plane.yHat.multiplyScalar(-1);
            startAngle_rad = -startAngle_rad;
            endAngle_rad = -endAngle_rad;
        }
        if (needsInversion) {
            const tmp = endAngle_rad;

            endAngle_rad = startAngle_rad + 2.0 * Math.PI;
            startAngle_rad = tmp;
        }

        // console.log(`  Result: startAngle: ${startAngle_rad / Math.PI * 180}°, endAngle: ${endAngle_rad / Math.PI * 180}°, ` +
        //     `midAngle: ${midAngle_rad / Math.PI * 180}° (${midAngle_rad / Math.PI * 180 + 360}°).`);

        out_result.circularAngle_rad.setStartEnd(startAngle_rad, endAngle_rad);
    }

    /**
     * Projects an ellipse with a zero semi-minor, or semi-major axis (or both).
     */
    private calcDegenerateProjection(
        parameters: EllipticalArcParameters<3>,
        cameraTransform: CameraTransform<3>,
        out_result: MutableEllipticalArcParameters<3>,
        eps: number
    ) {
        const vertexCalculator = new EllipticalArcVertexCalculator(parameters, this._vector3);

        const xDiameterStart = this._vector3;

        vertexCalculator.calculateVertex(0, xDiameterStart);
        cameraTransform.project(xDiameterStart);

        const xDiameterEnd: ColumnVector<3> = this._vector as any;

        vertexCalculator.calculateVertex(Math.PI, xDiameterEnd);
        cameraTransform.project(xDiameterEnd);

        const origin = out_result.origin.copy(xDiameterStart).add(xDiameterEnd).multiplyScalar(0.5);

        // console.log(`calcDegenerateProjection: xDiameterStart^T: ${xDiameterStart.transposed().repr()}, ` +
        //     `xDiameterEnd^T: ${xDiameterEnd.transposed().repr()}, origin^T: ${origin.transposed().repr()}`);

        out_result.semiXAxis = xDiameterEnd.distanceTo(origin);

        const yDiameterStart = xDiameterEnd;

        vertexCalculator.calculateVertex(Math.PI / 2, yDiameterStart);
        cameraTransform.project(yDiameterStart);

        out_result.semiYAxis = yDiameterStart.distanceTo(origin);

        // console.log(`  yDiameterStart^T: ${yDiameterStart.transposed().repr()}, ` +
        //     `semiXAxis: ${out_result.semiXAxis}, semiYAxis: ${out_result.semiYAxis}`);

        if (Math.abs(out_result.semiXAxis) >= eps) {
            const xHat = out_result.plane.xHat.copy(xDiameterStart).subtract(origin).normalizeColumnVectors();
            out_result.plane.yHat.
                setComponent(0, -xHat.getComponent(1)).
                setComponent(1, xHat.getComponent(0)).
                setComponent(2, xHat.getComponent(2));
        } else if (Math.abs(out_result.semiYAxis) >= eps) {
            const yHat = out_result.plane.yHat.copy(yDiameterStart).subtract(origin).normalizeColumnVectors();
            out_result.plane.xHat.
                setComponent(0, -yHat.getComponent(1)).
                setComponent(1, yHat.getComponent(0)).
                setComponent(2, yHat.getComponent(2));
        } else {
            // Both axes are 0.  Axis directions are indeterminate.
            cameraTransform.getProjectionPlaneXHat(out_result.plane.xHat);
            cameraTransform.getProjectionPlaneYHat(out_result.plane.yHat);
        }

        this.projectCircularAngle(parameters, cameraTransform, out_result, vertexCalculator);
    }

    private projectNonPerspective(
        parameters: EllipticalArcParameters<Dim>,
        cameraTransform: CameraTransform<Dim>,
        out_result: MutableEllipticalArcParameters<Dim>
    ): typeof out_result {
        const unprojectedOrigin = parameters.origin;
        const projectedOrigin = cameraTransform.project(
            out_result.origin.copy(unprojectedOrigin));

        const scaledXHatEnd = this._vector.copy(unprojectedOrigin).
            addScaled(parameters.plane.xHat, parameters.semiXAxis);
        cameraTransform.project(scaledXHatEnd);

        out_result.semiXAxis = projectedOrigin.distanceTo(scaledXHatEnd);

        const scaledYHatEnd = this._vector.copy(unprojectedOrigin).
            addScaled(parameters.plane.yHat, parameters.semiYAxis);
        cameraTransform.project(scaledYHatEnd);

        out_result.semiYAxis = projectedOrigin.distanceTo(scaledYHatEnd);

        parameters.plane.projectToCamera(
            cameraTransform, unprojectedOrigin, projectedOrigin, out_result.plane);

        out_result.circularAngle_rad = parameters.circularAngle_rad.cloneAsMutable();

        return out_result;
    }

    debug_projectToCamera(
        parameters: EllipticalArcParameters<Dim>,
        cameraTransform: CameraTransform<Dim>,
        out_result: MutableEllipticalArcParameters<Dim>,
        eps = this.eps
    ) {
        this.projectToCamera(parameters, cameraTransform, out_result, eps);

        return {
            skewedConeInInputEllipseFrame: {
                ellipseBasis: this.ellipseBasis,
                eyePoint: this.eyePoint_c,
                coneVertex: this.ellipticalConeVertex_c,
                ellipseCenter: this.ellipseCenter_c,
                eqA: this.conicEqA_c,
                eqB: this.conicEqB_c,
                eqC: this.conicEqC_c,
            },
            coneInWorldFrame: {
                eqA: this.conicEqA_s,
                eqB: this.conicEqB_s,
                eqC: this.conicEqC_s,
            },
            projectedEllipseConicEq: {
                projectionPlaneBasis2: this.projectionPlaneBasis2,
                eqA: this.conicEqA_p,
                eqB: this.conicEqB_p,
                eqC: this.conicEqC_p,
            },
            projectedEllipseMatrixEq: {
                eqK: this.ellipseEqK_p,
                eqM: this.ellipseEqM_p,
            },
        };
    }
}

/** Calculates coordinates of points along an elliptical curve. */
export class EllipticalArcVertexCalculator<Dim extends 3 | 2> extends
    ParametricVertexCalculator<ColumnVector<Dim>> implements
    VertexCalculator<ColumnVector<Dim>> {

    private readonly scaledXHat: ColumnVector<Dim>;
    private readonly scaledYHat: ColumnVector<Dim>;

    constructor(
        readonly config: EllipticalArcParameters<Dim>,
        calcualtedVertexStorage: ColumnVector<Dim> = config.origin.clone()
    ) {
        super(config.circularAngle_rad, calcualtedVertexStorage);

        this.scaledXHat = config.plane.xHat.clone();
        this.scaledYHat = config.plane.yHat.clone();
        this.updateConfig();
    }

    updateConfig() {
        this.scaledXHat.copy(this.config.plane.xHat);
        this.scaledXHat.multiplyScalar(this.config.semiXAxis);

        this.scaledYHat.copy(this.config.plane.yHat);
        this.scaledYHat.multiplyScalar(this.config.semiYAxis);
    }

    calculateVertex(circularAngle_rad: number, out_vertex: ColumnVector<Dim>): void {
        const origin = this.config.origin;
        const xHat = this.scaledXHat;
        const yHat = this.scaledYHat;

        out_vertex.copy(origin);
        out_vertex.addScaled(xHat, Math.cos(circularAngle_rad));
        out_vertex.addScaled(yHat, Math.sin(circularAngle_rad));
    }

    xAtCircularAngle_rad(circularAngle_rad: number) {
        this.calculateVertex(circularAngle_rad, this.calculatedVertexStorage);

        return this.calculatedVertexStorage.getComponent(0);
    }

    yAtCircularAngle_rad(circularAngle_rad: number) {
        this.calculateVertex(circularAngle_rad, this.calculatedVertexStorage);

        return this.calculatedVertexStorage.getComponent(1);
    }

    circularAngleForEllipsePoint(pointFromEllipseCenter: ColumnVector<Dim>): number {
        const params = this.config;

        return Math.atan2(
            // Project the point to the circle with radius = semiXAxis:
            pointFromEllipseCenter.vectorDot(params.plane.yHat) / params.semiYAxis * params.semiXAxis,
            pointFromEllipseCenter.vectorDot(params.plane.xHat));
    }
}

/**
 * Calculates vertices, and tangents at a given series of points on an ellipse.
 */
export class EllipticalArcVertexAndTangentCalculator<Dim extends 2 | 3> extends
    ParametricVertexCalculator<VertexAndTangent<ColumnVector<Dim>>>
{
    private readonly scaledXHat: ColumnVector<Dim>;
    private readonly scaledYHat: ColumnVector<Dim>;

    constructor(
        readonly config: EllipticalArcParameters<Dim>,
        calcualtedVertexInfoStorage: VertexAndTangent<ColumnVector<Dim>>
    ) {
        super(config.circularAngle_rad, calcualtedVertexInfoStorage);
        this.scaledXHat = config.origin.clone();
        this.scaledYHat = config.origin.clone();
        this.updateConfig();
    }

    updateConfig() {
        this.scaledXHat.copy(this.config.plane.xHat)
            .multiplyScalar(this.config.semiXAxis);

        this.scaledYHat.copy(this.config.plane.yHat).
            multiplyScalar(this.config.semiYAxis);
    }

    get vertexCount() {
        // We want to include the upper boundary of the angle:
        return this.config.circularAngle_rad.stepCount + 1;
    }

    calculateVertex(
        circularAngle_rad: number,
        out_result: VertexAndTangent<ColumnVector<Dim>>
    ) {
        const origin = this.config.origin;
        const vertex = out_result.vertex;

        vertex.copy(origin).
            addScaled(this.scaledXHat, Math.cos(circularAngle_rad)).
            addScaled(this.scaledYHat, Math.sin(circularAngle_rad));

        const tangent = out_result.tangent;

        tangent.copy(this.config.plane.xHat).
            multiplyScalar(
                -this.config.semiXAxis * Math.sin(circularAngle_rad)).
            addScaled(
                this.config.plane.yHat,
                this.config.semiYAxis * Math.cos(circularAngle_rad));

        return this;
    }
}
