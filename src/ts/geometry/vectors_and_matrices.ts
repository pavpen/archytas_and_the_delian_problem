import * as THREE from 'three';
import type { Add, And, Extends, If, Is, Or } from 'meta-types';
import { throwIf } from '../throw_if';


// From https://github.com/microsoft/TypeScript/pull/40002:
export type TupleOf<T, N extends number> =
    N extends N ?
    number extends N ?
    T[] :
    _TupleOf<T, N, []>
    : never;
type _TupleOf<T, N extends number, R extends unknown[]> =
    R['length'] extends N ?
    R :
    _TupleOf<T, N, [T, ...R]>;


interface MatrixBase<RowDim extends number, ColumnDim extends number> {
    readonly rowCount: RowDim;
    readonly columnCount: ColumnDim;

    getElement(rowIndex: number, columnIndex: number): number;

    setElement(rowIndex: number, columnIndex: number, value: number): this;
}

export interface MatrixReprConfig {
    rowPrefix: string;
}

export interface Matrix<RowDim extends number, ColumnDim extends number> extends
    MatrixBase<RowDim, ColumnDim> {

    add(addend: Matrix<RowDim, ColumnDim>): this;

    addScaled(addend: Matrix<RowDim, ColumnDim>, scalar: number): this;

    clone(): this;

    copy(source: Matrix<RowDim, ColumnDim>): this;

    dot<ResColDim extends number>(
        multiplicand: Matrix<ColumnDim, ResColDim>,
        out_result: Matrix<RowDim, ResColDim>): typeof out_result;

    multiply<ResColDim extends number>(
        rightHandMultiplicand: Matrix<ColumnDim, ResColDim>,
        out_result: Matrix<RowDim, ResColDim>): typeof out_result;

    multiplyScalar(scalar: number): this;

    /**
     * Normalizes each column, as though it was a vector.
     * 
     * You must ensure you don't have columns with zero magnitude.  Otherwise,
     * you can expect undefined values in the result.
     */
    normalizeColumnVectors(): this;

    /**
     * Normalizes each column, as though it was a vector.
     * 
     * You must ensure you don't have columns with zero magnitude.  Otherwise,
     * you can expect undefined values in the result.
     */
    normalizeRowVectors(): this;

    repr(config?: MatrixReprConfig): string;

    setFromColumnVectors(
        ...columnVectors: TupleOf<Matrix<RowDim, 1>,
            ColumnDim>
    ): this;

    setToSum(...addends: Array<Matrix<RowDim, ColumnDim>>): this;

    subtract(subtrahend: Matrix<RowDim, ColumnDim>): this;

    transposed(): Matrix<ColumnDim, RowDim>;
}

export interface VectorBase<RowDim extends number, ColumnDim extends number> extends
    MatrixBase<RowDim, ColumnDim> {

    getComponent(componentIndex: number): number;
    setComponent(componentIndex: number, value: number): this;
    toThreeJs(): If<
        Or<Is<RowDim, 2>, Is<ColumnDim, 2>>,
        THREE.Vector2,
        If<
            Or<Is<RowDim, 3>, Is<ColumnDim, 3>>,
            THREE.Vector3,
            unknown>>;
}

export interface ColumnVectorBase<Dim extends number> extends VectorBase<Dim, 1> {
    readonly componentCount: Dim;
}

export interface RowVectorBase<Dim extends number> extends VectorBase<1, Dim> {
    readonly componentCount: Dim;
}

export interface RowOrColumnVector<
    RowDim extends number, ColumnDim extends If<Is<RowDim, 1>, number, 1>
> extends Matrix<RowDim, ColumnDim>, VectorBase<RowDim, ColumnDim> {
    distanceTo(point: Matrix<RowDim, ColumnDim> | Matrix<ColumnDim, RowDim>): number;
    vectorCross(
        multiplicand: ColumnVectorBase<RowDim | ColumnDim> | RowVectorBase<RowDim | ColumnDim>
    ): RowDim extends 3 ? this : ColumnDim extends 3 ? this : never;
    vectorDot(multiplicand: Matrix<RowDim, ColumnDim> | Matrix<ColumnDim, RowDim>): number;
    vectorLength: number;
}

export interface ColumnVector<Dim extends number> extends
    RowOrColumnVector<Dim, 1>, ColumnVectorBase<Dim> {

    applyAffine(
        affineTransform: Matrix<Add<Dim, 1>, Add<Dim, 1>>): this;
    setComponents(...components: TupleOf<number, Dim>): this;
    setFromMatrixColumn<ColumnDim extends number>(
        source: Matrix<Dim, ColumnDim>, columnIndex: number): this;
    setFromMatrixRow<RowDim extends number>(
        source: Matrix<RowDim, Dim>, rowIndex: number): this;
}

export interface RowVector<Dim extends number> extends
    RowOrColumnVector<1, Dim>, RowVectorBase<Dim> {

    applyAffine(
        affineTransform: Matrix<Add<Dim, 1>, Add<Dim, 1>>): this;
    setComponents(...components: TupleOf<number, Dim>): this;
    setFromMatrixColumn<ColumnDim extends number>(
        source: Matrix<Dim, ColumnDim>, columnIndex: number): this;
    setFromMatrixRow<RowDim extends number>(
        source: Matrix<RowDim, Dim>, rowIndex: number): this;
}

interface MatrixWithBaseMethods<RowDim extends number, ColumnDim extends number> extends
    MatrixBase<RowDim, ColumnDim> {

    add(addend: Matrix<RowDim, ColumnDim>): this;

    addScaled(addend: Matrix<RowDim, ColumnDim>, scalar: number): this;

    copy(source: Matrix<RowDim, ColumnDim>): this;

    dot<ResColDim extends number>(
        multiplicand: Matrix<ColumnDim, ResColDim>,
        out_result: Matrix<RowDim, ResColDim>
    ): typeof out_result;

    multiply<ResColDim extends number>(
        rightHandMultiplicand: Matrix<ColumnDim, ResColDim>,
        out_result: Matrix<RowDim, ResColDim>): typeof out_result;

    multiplyScalar(scalar: number): this;

    normalizeColumnVectors(): this;

    normalizeRowVectors(): this;

    repr(config?: MatrixReprConfig): string;

    setFromColumnVectors(
        ...columnVectors: TupleOf<Matrix<RowDim, 1>,
            ColumnDim>
    ): this;

    subtract(subtrahend: Matrix<RowDim, ColumnDim>): this;
}

type Constructable<T> = new (...args: any[]) => T;

function AddBaseMatrixMethods<
    RowDim extends number, ColumnDim extends number, MatrixT extends Constructable<MatrixBase<RowDim, ColumnDim>>
>(baseClass: MatrixT) {
    return class MatrixWithOps extends baseClass implements MatrixWithBaseMethods<RowDim, ColumnDim> {
        add(addend: Matrix<RowDim, ColumnDim>): this {
            const rowCount = this.rowCount;
            const columnCount = this.columnCount;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                for (let colI = 0; colI < columnCount; ++colI) {
                    this.setElement(
                        rowI,
                        colI,
                        this.getElement(rowI, colI) + addend.getElement(rowI, colI));
                }
            }

            return this;
        }

        addScaled(addend: Matrix<RowDim, ColumnDim>, scalar: number): this {
            const rowCount = this.rowCount;
            const columnCount = this.columnCount;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                for (let colI = 0; colI < columnCount; ++colI) {
                    this.setElement(
                        rowI,
                        colI,
                        this.getElement(rowI, colI) + scalar * addend.getElement(rowI, colI));
                }
            }
            return this;
        }

        copy(source: Matrix<RowDim, ColumnDim>): this {
            const rowCount = this.rowCount;
            const columnCount = this.columnCount;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                for (let colI = 0; colI < columnCount; ++colI) {
                    this.setElement(
                        rowI, colI, source.getElement(rowI, colI));
                }
            }

            return this;
        }

        dot<ResColDim extends number>(
            multiplicand: Matrix<ColumnDim, ResColDim>,
            out_result: Matrix<RowDim, ResColDim>
        ): typeof out_result {
            const rowCount = this.rowCount;
            const columnCount = multiplicand.columnCount;
            const innerDim = this.columnCount;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                for (let colI = 0; colI < columnCount; ++colI) {
                    let sum = 0;

                    for (let innerI = 0; innerI < innerDim; ++innerI) {
                        sum += this.getElement(rowI, innerI) *
                            multiplicand.getElement(innerI, colI);
                    }

                    out_result.setElement(rowI, colI, sum);
                }
            }

            return out_result;
        }

        multiply<ResColDim extends number>(
            rightHandMultiplicand: Matrix<ColumnDim, ResColDim>,
            out_result: Matrix<RowDim, ResColDim>
        ): typeof out_result {
            const rowCount = this.rowCount;
            const columnCount = rightHandMultiplicand.columnCount;
            const innerDim = this.columnCount;

            throwIf(this.columnCount == rightHandMultiplicand.rowCount);
            throwIf(this.rowCount == out_result.rowCount);
            throwIf(rightHandMultiplicand.columnCount == out_result.columnCount);

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                for (let colI = 0; colI < columnCount; ++colI) {
                    let sum = 0;

                    for (let innerI = 0; innerI < innerDim; ++innerI) {
                        sum += this.getElement(rowI, innerI) *
                            rightHandMultiplicand.getElement(innerI, colI);
                    }

                    out_result.setElement(rowI, colI, sum);
                }
            }

            return out_result;
        }

        multiplyScalar(scalar: number): this {
            const rowCount = this.rowCount;
            const columnCount = this.columnCount;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                for (let colI = 0; colI < columnCount; ++colI) {
                    this.setElement(
                        rowI, colI, scalar * this.getElement(rowI, colI));
                }
            }

            return this;
        }

        normalizeColumnVectors(): this {
            const columnCount = this.columnCount;
            const rowCount = this.rowCount;

            for (let colI = 0; colI < columnCount; ++colI) {
                let vecLength = 0;
                for (let rowI = 0; rowI < rowCount; ++rowI) {
                    const element = this.getElement(rowI, colI);

                    vecLength += element * element;
                }
                vecLength = Math.sqrt(vecLength);

                for (let rowI = 0; rowI < rowCount; ++rowI) {
                    this.setElement(rowI, colI, this.getElement(rowI, colI) / vecLength);
                }
            }

            return this;
        }

        normalizeRowVectors(): this {
            const columnCount = this.columnCount;
            const rowCount = this.rowCount;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                let vecLength = 0;
                for (let colI = 0; colI < columnCount; ++colI) {
                    const element = this.getElement(rowI, colI);

                    vecLength += element * element;
                }
                vecLength = Math.sqrt(vecLength);

                for (let colI = 0; colI < columnCount; ++colI) {
                    this.setElement(rowI, colI, this.getElement(rowI, colI) / vecLength);
                }
            }

            return this;
        }

        repr(config?: MatrixReprConfig): string {
            const rowCount = this.rowCount;
            const columnCount = this.columnCount;

            let columnWidths = new Int16Array(columnCount);

            for (let colI = 0; colI < columnCount; ++colI) {
                let width = 0;
                for (let rowI = 0; rowI < rowCount; ++rowI) {
                    width = Math.max(width, this.getElement(rowI, colI).toString().length);
                }
                columnWidths[colI] = width;
            }

            let result = '';
            const rowPrefix = `${config?.rowPrefix || ''}[`;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                if (result.length > 0) {
                    result += '\n';
                }
                result += rowPrefix;
                for (let colI = 0; colI < columnCount; ++colI) {
                    if (colI > 0) {
                        result += ', ';
                    }
                    result += this.getElement(rowI, colI).toString().
                        padStart(columnWidths[colI], ' ');
                }
                result += ']';
            }

            return result;
        }

        setFromColumnVectors(
            ...columnVectors: TupleOf<Matrix<RowDim, 1>, ColumnDim>
        ): this {
            const vecCount = columnVectors.length;
            const rowCount = this.rowCount;

            for (let vecI = 0; vecI < vecCount; ++vecI) {
                const vector = columnVectors[vecI];

                for (let rowI = 0; rowI < rowCount; ++rowI) {
                    this.setElement(rowI, vecI, vector.getElement(rowI, 0));
                }
            }

            return this;
        }

        setToSum(...addends: Array<Matrix<RowDim, ColumnDim>>): this {
            const addendCount = addends.length;
            const rowCount = this.rowCount;
            const colCount = this.columnCount;

            for (let r = 0; r < rowCount; ++r) {
                for (let c = 0; c < colCount; ++c) {
                    let sum = 0;
                    for (let a = 0; a < addendCount; ++a) {
                        sum += addends[a].getElement(r, c);
                    }
                    this.setElement(r, c, sum);
                }
            }

            return this;
        }

        subtract(subtrahend: Matrix<RowDim, ColumnDim>): this {
            const rowCount = this.rowCount;
            const columnCount = this.columnCount;

            for (let rowI = 0; rowI < rowCount; ++rowI) {
                for (let colI = 0; colI < columnCount; ++colI) {
                    this.setElement(
                        rowI,
                        colI,
                        this.getElement(rowI, colI) - subtrahend.getElement(rowI, colI));
                }
            }

            return this;
        }
    };
}


interface VectorWithBaseMethods<
    RowDim extends number,
    ColumnDim extends RowDim extends 1 ? number : 1,
    Dim extends RowDim extends 1 ? ColumnDim : 1
> extends
    VectorBase<RowDim, ColumnDim> {

    applyAffine(
        affineTransform: Matrix<
            Add<RowDim extends 1 ? ColumnDim : RowDim, 1>,
            Add<RowDim extends 1 ? ColumnDim : RowDim, 1>
        >): this;
    distanceTo(point: Matrix<RowDim, ColumnDim> | Matrix<ColumnDim, RowDim>): number;
    setComponents(...components: TupleOf<number, Dim>): this;
    setFromMatrixColumn<ColumnDim extends number>(
        source: Matrix<Dim, ColumnDim>, columnIndex: number): this;
    setFromMatrixRow<RowDim extends number>(
        source: Matrix<RowDim, Dim>, rowIndex: number): this;
    vectorCross(
        multiplicand: ColumnVectorBase<RowDim | ColumnDim> | RowVectorBase<RowDim | ColumnDim>
    ): RowDim extends 3 ? this : ColumnDim extends 3 ? this : never;
    vectorDot(multiplicand: Matrix<RowDim, ColumnDim> | Matrix<ColumnDim, RowDim>): number;
    vectorLength: number;
}

function AddBaseVectorMethods<
    RowDim extends number,
    ColumnDim extends RowDim extends 1 ? number : 1,
    Dim extends RowDim extends 1 ? ColumnDim : 1,
    MatrixT extends Constructable<VectorBase<RowDim, ColumnDim> & { componentCount: number }>
>(baseClass: MatrixT) {
    return class VectorWithOps extends baseClass implements VectorWithBaseMethods<RowDim, ColumnDim, Dim> {
        applyAffine(
            affineTransform: Matrix<
                Add<RowDim extends 1 ? ColumnDim : RowDim, 1>,
                Add<RowDim extends 1 ? ColumnDim : RowDim, 1>>
        ): this {
            const endRowI = affineTransform.rowCount - 1;
            const endColumnI = affineTransform.columnCount - 1;

            // Homogenous coordinate:
            let w = 0;
            for (let colI = 0; colI < endColumnI; ++colI) {
                w += this.getComponent(colI) *
                    affineTransform.getElement(endRowI, colI);
            }
            // Our vector has an implicit 1 coordinate in the extra homogenous
            // dimension:
            w += affineTransform.getElement(endRowI, endColumnI);

            // Calculate the coordinates in the non-extra dimension:
            for (let rowI = 0; rowI < endRowI; ++rowI) {
                let c = 0;
                for (let colI = 0; colI < endColumnI; ++colI) {
                    c += this.getComponent(colI) *
                        affineTransform.getElement(rowI, colI);
                }
                // Use the implicit 1 coordinate:
                c += affineTransform.getElement(rowI, endColumnI);

                this.setComponent(rowI, c / w);
            }

            return this;
        }

        distanceTo(point: Matrix<RowDim, ColumnDim> | Matrix<ColumnDim, RowDim>): number {
            const rowIndexUnit = point.rowCount == 1 ? 0 : 1;
            const columnIndexUnit = point.columnCount == 1 && rowIndexUnit > 0 ? 0 : 1;
            const endI = Math.max(point.rowCount, point.columnCount);

            let result = 0;
            for (let i = 0; i < endI; ++i) {
                const deltaC = this.getComponent(i) -
                    point.getElement(i * rowIndexUnit, i * columnIndexUnit);

                result += deltaC * deltaC;
            }

            return Math.sqrt(result);
        }

        setComponents(...components: TupleOf<number, Dim>): this {
            const componentCount = this.componentCount;

            for (let i = 0; i < componentCount; ++i) {
                this.setComponent(i, components[i]);
            }

            return this;
        }

        setFromMatrixColumn<ColumnDim extends number>(
            source: Matrix<Dim, ColumnDim>,
            columnIndex: number
        ): this {
            const endI = this.componentCount;

            for (let i = 0; i < endI; ++i) {
                this.setComponent(i, source.getElement(i, columnIndex));
            }

            return this;
        }

        setFromMatrixRow<RowDim extends number>(
            source: Matrix<RowDim, Dim>,
            rowIndex: number
        ): this {
            const endI = this.componentCount;

            for (let i = 0; i < endI; ++i) {
                this.setComponent(i, source.getElement(rowIndex, i));
            }

            return this;

        }

        vectorCross(
            multiplicand: ColumnVectorBase<RowDim | ColumnDim> | RowVectorBase<RowDim | ColumnDim>
        ): RowDim extends 3 ? this : ColumnDim extends 3 ? this : never {
            const dim = this.componentCount;
            const result = new Array<number>(dim);

            throwIf(dim == multiplicand.componentCount);

            for (let i = 0; i < dim; ++i) {
                result[i] = this.getComponent((i + 1) % dim) * multiplicand.getComponent((i + 2) % dim) -
                    this.getComponent((i + 2) % dim) * multiplicand.getComponent((i + 1) % dim);
            }

            for (let i = 0; i < dim; ++i) {
                this.setComponent(i, result[i]);
            }

            return this as RowDim extends 3 ? this : ColumnDim extends 3 ? this : never;
        }

        vectorDot(multiplicand: Matrix<RowDim, ColumnDim> | Matrix<ColumnDim, RowDim> | this): number {
            const rowIndexUnit = multiplicand.rowCount == 1 ? 0 : 1;
            const columnIndexUnit = multiplicand.columnCount == 1 && rowIndexUnit > 0 ? 0 : 1;
            const endI = this.componentCount;

            if (multiplicand.rowCount != 1 && multiplicand.columnCount != 1) {
                throw new Error(
                    `The vector multiplicand must be either a row-, or a column-matrix. ` +
                    `rowCount: ${multiplicand.rowCount}, columnCount: ${multiplicand.columnCount}`);
            }
            throwIf(Math.max(multiplicand.rowCount, multiplicand.columnCount) == endI);

            let result = 0;
            for (let i = 0; i < endI; ++i) {
                result += this.getComponent(i) *
                    multiplicand.getElement(i * rowIndexUnit, i * columnIndexUnit);
            }

            return result;
        }

        get vectorLength(): number {
            return Math.sqrt(this.vectorDot(this));
        }
    };
}

class Matrix3Base extends THREE.Matrix3 implements MatrixBase<3, 3> {
    readonly rowCount = 3;
    readonly columnCount = 3;

    constructor() {
        super();
    }

    copyThreeJs(source: THREE.Matrix3): this {
        super.copy(source);
        return this;
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return this.elements[columnIndex * this.rowCount + rowIndex];
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        this.elements[columnIndex * this.rowCount + rowIndex] = value;

        return this;
    }

    transposed(): Matrix<3, 3> {
        return this.clone().transpose() as any;
    }
}

export type Matrix3 = Matrix<3, 3> & Matrix3Base;
export const Matrix3: Constructable<Matrix3> = AddBaseMatrixMethods(Matrix3Base);


class Matrix4Base extends THREE.Matrix4 implements MatrixBase<4, 4> {
    readonly rowCount = 4;
    readonly columnCount = 4;

    constructor(copySource?: THREE.Matrix4) {
        super();
        if (copySource) {
            super.copy(copySource);
        }
    }

    copyThreeJs(source: THREE.Matrix4): this {
        super.copy(source);
        return this;
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return this.elements[columnIndex * this.rowCount + rowIndex];
    }

    multiplyThreeJs(rightHandMultiplicand: THREE.Matrix4): this {
        super.multiply(rightHandMultiplicand);
        return this;
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        this.elements[columnIndex * this.rowCount + rowIndex] = value;

        return this;
    }

    transposed(): Matrix<4, 4> {
        return this.clone().transpose() as any;
    }
}

export type Matrix4 = Matrix<4, 4> & Matrix4Base;
export const Matrix4: Constructable<Matrix4> = AddBaseMatrixMethods(Matrix4Base) as any;


class ColumnVector2Base extends THREE.Vector2 implements ColumnVectorBase<2> {
    readonly componentCount = 2;
    readonly rowCount = 2;
    readonly columnCount = 1;

    getElement(rowIndex: number, columnIndex: number): number {
        return super.getComponent(rowIndex);
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        super.setComponent(rowIndex, value);

        return this;
    }

    transposed(): Matrix<1, 2> {
        return new RowVector2().setElement(0, 0, this.x).setElement(0, 1, this.y);
    }

    toThreeJs(): THREE.Vector2 {
        return this;
    }
}

export type ColumnVector2 = ColumnVector<2> & THREE.Vector2;
export const ColumnVector2: Constructable<ColumnVector2> =
    AddBaseVectorMethods(AddBaseMatrixMethods(ColumnVector2Base));


class RowVector2Base extends THREE.Vector2 implements RowVectorBase<2> {
    readonly componentCount = 2;
    readonly rowCount = 1;
    readonly columnCount = 2;

    constructor() {
        super();
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return super.getComponent(columnIndex);
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        super.setComponent(columnIndex, value);

        return this;
    }

    transposed(): Matrix<2, 1> {
        return new ColumnVector2().setElement(0, 0, this.x).setElement(1, 0, this.y);
    }

    toThreeJs(): THREE.Vector2 {
        return this;
    }
}

export type RowVector2 = RowVector<2> | THREE.Vector2;
export const RowVector2: Constructable<RowVector<2>> =
    AddBaseVectorMethods(AddBaseMatrixMethods(RowVector2Base));



class ColumnVector3Base extends THREE.Vector3 implements ColumnVectorBase<3> {
    readonly componentCount = 3;
    readonly rowCount = 3;
    readonly columnCount = 1;

    copyThreeJs(source: THREE.Vector3): this {
        super.copy(source);
        return this;
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return super.getComponent(rowIndex);
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        super.setComponent(rowIndex, value);

        return this;
    }

    transposed(): Matrix<1, 3> {
        return new RowVector3().
            setElement(0, 0, this.x).setElement(0, 1, this.y).setElement(0, 2, this.z);
    }

    toThreeJs(): THREE.Vector3 {
        return this;
    }
}

export type ColumnVector3 = ColumnVector<3> & ColumnVector3Base;
export const ColumnVector3: Constructable<ColumnVector3> =
    AddBaseVectorMethods(AddBaseMatrixMethods(ColumnVector3Base));


class RowVector3Base extends THREE.Vector3 implements RowVectorBase<3> {
    readonly componentCount = 3;
    readonly rowCount = 1;
    readonly columnCount = 3;

    constructor() {
        super();
    }

    copyThreeJs(source: THREE.Vector3): this {
        super.copy(source);
        return this;
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return super.getComponent(columnIndex);
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        super.setComponent(columnIndex, value);

        return this;
    }

    transposed(): Matrix<3, 1> {
        return new ColumnVector3().
            setElement(0, 0, this.x).setElement(1, 0, this.y).setElement(2, 0, this.z);
    }

    toThreeJs(): THREE.Vector3 {
        return this;
    }
}

export type RowVector3 = RowVector<3> & RowVector3Base;
export const RowVector3: Constructable<RowVector3> =
    AddBaseVectorMethods(AddBaseMatrixMethods(RowVector3Base));



export class Matrix2Base implements MatrixBase<2, 2> {
    // I_M<i><j> = index of matrix component at row i, column j in
    // the `components` array.
    private static readonly I_M00 = 0;
    private static readonly I_M01 = 2;
    private static readonly I_M10 = 1;
    private static readonly I_M11 = 3;
    // I_ROW[i][j] = index of matrix component at row i, column j in
    // the `coponents` array:
    private static readonly I_ROW_COL = [
        [this.I_M00, this.I_M01],
        [this.I_M10, this.I_M11]];

    readonly rowCount = 2;
    readonly columnCount = 2;

    private readonly components: Array<number>;

    constructor(m00: number, m01: number, m10: number, m11: number) {
        this.components = [
            // Column 0:
            m00, m10,
            // Column 1:
            m01, m11
        ];
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return this.components[columnIndex * this.rowCount + rowIndex];
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        this.components[columnIndex * this.rowCount + rowIndex] = value;

        return this;
    }

    clone() {
        const m = this.components;

        return new Matrix2(
            m[Matrix2Base.I_M00], m[Matrix2Base.I_M01], m[Matrix2Base.I_M10], m[Matrix2Base.I_M11]);
    }

    getEigenvaluesAndVectors(
        out_eigenvalues: ColumnVector<2>,
        out_eigenvectors: Matrix<2, 2>
    ): void {
        this.getEigenValues(out_eigenvalues);

        // v_0 (in column 0 of `out_eigenvectors`):
        this.getEigenvectorForEigenvalue(
            out_eigenvalues.getComponent(0), out_eigenvectors, 0);

        // v_1 (in column 1 of `out_eigenvectors`):
        this.getEigenvectorForEigenvalue(
            out_eigenvalues.getComponent(1), out_eigenvectors, 1);
    }

    private getEigenvectorForEigenvalue(
        eigenvalue: number,
        out_result: Matrix<2, 2>,
        outputColumnIdx: number
    ): void {
        //        [ m00 m01 ]
        // this = [ m10 m11 ]
        // Eigenvalues = lambda_i, i = {0, 1}
        // Eigenvectors = v_i
        // this * v_i = lambda_i * v_i =>
        // (m00 - lambda_i) * v_i[0] + m01 * v_i[1] = 0 =>
        // v_i = [-m01, m00 - lambda_i] (times any constant) is a solution, if
        //     m01 ≠ 0, or m00 - lambda_i ≠ 0
        // Also:
        // m10 * v_i[0] + (m11 - lambda_i) * v_i[1] = 0 =>
        // v_i = [m11 - lambda_i, -m10] (times any constant) is a solution we
        //     can use if both m01 = 0, and m00 - lambda_i = 0 above.

        const m = this.components;
        const first_v_x = -m[Matrix2Base.I_M01];
        const first_v_y = m[Matrix2Base.I_M00] - eigenvalue;
        const second_v_x = m[Matrix2Base.I_M11] - eigenvalue;
        const second_v_y = -m[Matrix2Base.I_M10];

        if (
            Math.max(Math.abs(first_v_x), Math.abs(first_v_y)) >
            Math.max(Math.abs(second_v_x), Math.abs(second_v_y))
        ) {
            out_result.setElement(0, outputColumnIdx, first_v_x).
                setElement(1, outputColumnIdx, first_v_y);
        } else {
            out_result.setElement(0, outputColumnIdx, second_v_x).
                setElement(1, outputColumnIdx, second_v_y);
        }
    }

    private getEigenValues(out_eigenvalues: ColumnVector<2>) {
        //        [ m00 m01 ]
        // this = [ m10 m11 ]
        // Eigenvalues = lambda_i, i = {0, 1}
        // Eigenvectors = v_i
        // I = identity matrix
        // From the definition of eigenvalues (this * v_i = lambda_i * v_i):
        // det(this - lambda_i * I) = 0
        // (m00 - lambda_i) * (m11 - lambda_i) - m10 * m01 = 0
        // lambda_i^2 - (m00 + m11) * lambda_i + m00 * m11 - m10 * m01 = 0
        //
        // Quadratic equation coefficients (lambda_i^2 + b * lambda_i + c = 0):
        const m = this.components;
        const b = -m[Matrix2Base.I_M00] - m[Matrix2Base.I_M11];
        const c = m[Matrix2Base.I_M00] * m[Matrix2Base.I_M11] - m[Matrix2Base.I_M10] * m[Matrix2Base.I_M01];

        // lambda_i = [-b ± sqrt(b^2 - 4 * c)] / 2
        const s = Math.sqrt(b * b - 4 * c);

        out_eigenvalues.setComponent(0, (-b - s) / 2).
            setComponent(1, (-b + s) / 2);
    }

    invert(): this {
        const m = this.components;
        const det = m[Matrix2Base.I_M00] * m[Matrix2Base.I_M11] - m[Matrix2Base.I_M01] * m[Matrix2Base.I_M10];

        // Main diagonal:
        let a = m[Matrix2Base.I_M00];
        let b = m[Matrix2Base.I_M11];

        m[Matrix2Base.I_M00] = b / det;
        m[Matrix2Base.I_M11] = a / det;

        // Non-main diagonal:
        a = m[Matrix2Base.I_M01];
        b = m[Matrix2Base.I_M10];
        m[Matrix2Base.I_M01] = -b / det;
        m[Matrix2Base.I_M10] = -a / det;

        return this;
    }

    transposed(): Matrix<2, 2> {
        const m = this.components;

        return new Matrix2(
            m[Matrix2Base.I_M00], m[Matrix2Base.I_M10], m[Matrix2Base.I_M01], m[Matrix2Base.I_M11]);
    }
}

export type Matrix2 = Matrix<2, 2> & Matrix2Base;
export const Matrix2: Constructable<Matrix2> = AddBaseMatrixMethods(Matrix2Base);


class MatrixImplBase<RowDim extends number, ColumnDim extends number> implements
    MatrixBase<RowDim, ColumnDim> {

    private readonly components: Array<number>;

    constructor(
        readonly rowCount: RowDim,
        readonly columnCount: ColumnDim
    ) {
        this.components = new Array<number>(rowCount * columnCount);
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return this.components[columnIndex * this.rowCount + rowIndex];
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        this.components[columnIndex * this.rowCount + rowIndex] = value;

        return this;
    }

    clone(): this {
        const result = MatrixFactory.create(this.rowCount, this.columnCount);

        Object.assign(result.components, this.components);

        return result as any;
    }

    transposed(): Matrix<ColumnDim, RowDim> {
        const result = MatrixFactory.create(this.columnCount, this.rowCount);

        const rowCount = this.columnCount;
        const columnCount = this.rowCount;

        for (let rowI = 0; rowI < rowCount; ++rowI) {
            for (let colI = 0; colI < columnCount; ++colI) {
                result.setElement(rowI, colI, this.getElement(colI, rowI));
            }
        }

        return result;
    }
}


type MatrixImplT<RowDim extends number, ColumnDim extends number> = Matrix<RowDim, ColumnDim> & MatrixImplBase<RowDim, ColumnDim>;
const MatrixImplC: Constructable<Matrix<number, number> & MatrixImplBase<number, number>> = AddBaseMatrixMethods(MatrixImplBase);

export namespace MatrixFactory {
    export function create<RowDim extends number, ColumnDim extends number>(
        rowCount: RowDim, columnCount: ColumnDim
    ): MatrixImplT<RowDim, ColumnDim> {
        return new MatrixImplC(rowCount, columnCount) as any;
    }
}



class ColumnVectorImplBase<Dim extends number> implements
    ColumnVectorBase<Dim> {

    readonly columnCount = 1;
    readonly componentCount: Dim;
    private readonly components: Array<number>;

    constructor(
        readonly rowCount: Dim,
    ) {
        this.componentCount = rowCount;
        this.components = new Array<number>(rowCount);
    }

    getComponent(componentIndex: number): number {
        return this.components[componentIndex];
    }

    setComponent(componentIndex: number, value: number): this {
        this.components[componentIndex] = value;

        return this;
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return this.components[rowIndex];
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        this.components[rowIndex] = value;

        return this;
    }

    clone(): this {
        const result = ColumnVectorFactory.create(this.componentCount);

        Object.assign(result.components, this.components);

        return result as any;
    }

    transposed(): RowVector<Dim> {
        const componentCount = this.componentCount;
        const result = RowVectorFactory.create(componentCount);

        for (let i = 0; i < componentCount; ++i) {
            result.setComponent(i, this.getComponent(i));
        }

        return result;
    }

    toThreeJs():
        // Unfortunately, the typecheker doesn't accept a more human-readable form of this:
        If<
            Or<And<Extends<Dim, 2>, Extends<2, Dim>>, false>,
            THREE.Vector2,
            If<
                Or<And<Extends<Dim, 3>,
                    Extends<3, Dim>>, false>,
                THREE.Vector3,
                unknown>> {

        if (this.componentCount == 2) {
            return new THREE.Vector2(this.getComponent(0), this.getComponent(1)) as any;
        } else if (this.componentCount == 3) {
            return new THREE.Vector3(
                this.getComponent(0), this.getComponent(1), this.getComponent(2)) as any;
        } else {
            throw new Error(
                `We can convert only 2-, or 3-D vectors to Three.js objects.  ` +
                `This.componentCount: ${this.componentCount}!`);
        };
    }
}


type ColumnVectorImplT<Dim extends number> = ColumnVector<Dim> & ColumnVectorImplBase<Dim>;
const ColumnVectorImplC: Constructable<ColumnVectorImplT<number>> =
    AddBaseVectorMethods(AddBaseMatrixMethods(ColumnVectorImplBase));

export namespace ColumnVectorFactory {
    export function create<Dim extends number>(
        rowCount: Dim
    ): ColumnVectorImplT<Dim> {
        return new ColumnVectorImplC(rowCount) as any;
    }
}


class RowVectorImplBase<Dim extends number> implements
    RowVectorBase<Dim> {

    readonly rowCount = 1;
    readonly componentCount: Dim;
    private readonly components: Array<number>;

    constructor(
        readonly columnCount: Dim,
    ) {
        this.componentCount = columnCount;
        this.components = new Array<number>(columnCount);
    }

    getComponent(componentIndex: number): number {
        return this.components[componentIndex];
    }

    setComponent(componentIndex: number, value: number): this {
        this.components[componentIndex] = value;

        return this;
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return this.components[columnIndex];
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        this.components[columnIndex] = value;

        return this;
    }

    clone(): this {
        const result = RowVectorFactory.create(this.componentCount);

        Object.assign(result.components, this.components);

        return result as any;
    }

    transposed(): ColumnVector<Dim> {
        const componentCount = this.componentCount;
        const result = ColumnVectorFactory.create(componentCount);

        for (let i = 0; i < componentCount; ++i) {
            result.setComponent(i, this.getComponent(i));
        }

        return result;
    }


    toThreeJs():
        // Unfortunately, the typecheker doesn't accept a more human-readable form of this:
        If<
            Or<And<Extends<Dim, 2>, Extends<2, Dim>>, false>,
            THREE.Vector2,
            If<
                Or<And<Extends<Dim, 3>,
                    Extends<3, Dim>>, false>,
                THREE.Vector3,
                unknown>> {

        if (this.componentCount == 2) {
            return new THREE.Vector2(this.getComponent(0), this.getComponent(1)) as any;
        } else if (this.componentCount == 3) {
            return new THREE.Vector3(
                this.getComponent(0), this.getComponent(1), this.getComponent(2)) as any;
        } else {
            throw new Error(
                `We can convert only 2-, or 3-D vectors to Three.js objects.  ` +
                `This.componentCount: ${this.componentCount}!`);
        };
    }
}


type RowVectorImplT<Dim extends number> = RowVector<Dim> & RowVectorImplBase<Dim>;
const RowVectorImplC: Constructable<RowVectorImplT<number>> =
    AddBaseVectorMethods(AddBaseMatrixMethods(RowVectorImplBase)) as any;

export namespace RowVectorFactory {
    export function create<Dim extends number>(
        columnCount: Dim
    ): RowVectorImplT<Dim> {
        return new RowVectorImplC(columnCount) as any;
    }
}


class MatrixColumnAsVectorBase<Dim extends number> implements ColumnVectorBase<Dim> {
    readonly componentCount: Dim;
    readonly rowCount: Dim;
    readonly columnCount = 1;
    private _matrix: Matrix<Dim, number>;
    private _columnIdx: number;

    constructor(
        matrix: Matrix<Dim, number>,
        columnIdx: number
    ) {
        this._matrix = matrix;
        this._columnIdx = columnIdx;
        this.componentCount = matrix.rowCount;
        this.rowCount = matrix.rowCount;
    }

    setSource(matrix: Matrix<Dim, number>, columnIdx: number): this {
        this._matrix = matrix;
        this._columnIdx = columnIdx;

        return this;
    }

    clone(): this {
        const componentCount = this.componentCount;
        const result = ColumnVectorFactory.create(componentCount);

        for (let i = 0; i < componentCount; ++i) {
            result.setComponent(i, this.getComponent(i));
        }

        return result as any;
    }

    getComponent(componentIndex: number): number {
        return this._matrix.getElement(componentIndex, this._columnIdx);
    }

    setComponent(componentIndex: number, value: number): this {
        this._matrix.setElement(componentIndex, this.columnCount, value);

        return this;
    }

    getElement(rowIndex: number, columnIndex: number): number {
        return this.getComponent(rowIndex);
    }

    setElement(rowIndex: number, columnIndex: number, value: number): this {
        this.setComponent(rowIndex, value);

        return this;
    }

    transposed(): RowVector<Dim> {
        const componentCount = this.componentCount;
        const result = RowVectorFactory.create(componentCount);

        for (let i = 0; i < componentCount; ++i) {
            result.setComponent(i, this.getComponent(i));
        }

        return result;
    }

    toThreeJs():
        // Unfortunately, the typecheker doesn't accept a more human-readable form of this:
        If<
            Or<And<Extends<Dim, 2>, Extends<2, Dim>>, false>,
            THREE.Vector2,
            If<
                Or<And<Extends<Dim, 3>,
                    Extends<3, Dim>>, false>,
                THREE.Vector3,
                unknown>> {

        if (this.componentCount == 2) {
            return new THREE.Vector2(this.getComponent(0), this.getComponent(1)) as any;
        } else if (this.componentCount == 3) {
            return new THREE.Vector3(
                this.getComponent(0), this.getComponent(1), this.getComponent(2)) as any;
        } else {
            throw new Error(
                `We can convert only 2-, or 3-D vectors to Three.js objects.  ` +
                `This.componentCount: ${this.componentCount}!`);
        };
    }
}

export type MatrixColumnAsVector<Dim extends number> =
    ColumnVector<Dim> & MatrixColumnAsVectorBase<Dim>;
const MatrixColumnAsVector =
    AddBaseVectorMethods(AddBaseMatrixMethods(MatrixColumnAsVectorBase));


export namespace MatrixColumnAsVectorFactory {
    export function create<RowDim extends number, ColumnDim extends number>(
        matrix: Matrix<RowDim, ColumnDim>,
        columnIdx: number
    ): MatrixColumnAsVector<RowDim> {
        return new MatrixColumnAsVector(matrix, columnIdx) as any;
    }
}

