import * as THREE from 'three';

import { ValueRange } from "../geometry/parameters";
import { COORDS_PER_VERTEX, SurfaceVertexCoords } from './tesselation_base';
import * as TESSELATION_BASE from './tesselation_base';
import * as Vertices from '../geometry/vertices';

/** 
 * Calculates the vertex and normal coordinates for one slice in our
 * tesselation.
 */
export interface SliceVertexCalculator {
    /**
     * The parameter along which the 3D object being tesselated is sliced.
     *
     * E.g., if you're slicing a circle into sectors around the center, this
     * would be the range of the central angle.
     */
    get sliceParameterRange(): ValueRange;

    /**
     * Returns the index of the first vertex in this tesselation slice within
     * the vertices array.
     */
    startVertexIndex(sliceIdx: number): number;

    /** The maximum number of vertices a slice can have. */
    get maxVertexCount(): number;

    /** 
     * Outputs vertex, and normal coordinates for the vertices in a given
     * tesselation slice.
     * 
     * @param sliceParameter - The value of the parameter along which the 3D
     *     object is sliced.
     *
     *     E.g., if you're tesselating a circle by creating one slice for each
     *     central angle value, `slicedParameter` would be the value of the
     *     centeral angle.
     *
     *     This method allows you to calculate vertices for a slice which is
     *     not exactly at an integer step of `slicedParameter`.
     * @param vertexWriter - Stores vertex, and normal coordinates.
     * @param coordStartIdx - Index in `out_vertexCoords`, and
     *     `out_normalCoords`, from which to start storing vertex, and normal
     *     coordinates.
     */
    calculateVertices(
        sliceParameter: number,
        vertexWriter: Vertices.VertexWriter<TESSELATION_BASE.VertexAndNormal>,
        coordStartIdx: number): void;
}

/**
 * Calculates the vertex, and normal coordinates for our tesselation (which
 * consists of 3D-object slices).
 */
export abstract class VertexCalculator<
    SliceVertexCalculatorT extends SliceVertexCalculator
> implements Vertices.VertexCalculator<TESSELATION_BASE.VertexAndNormal> {
    readonly slice;

    constructor(sliceVertexCalculator: SliceVertexCalculatorT) {
        this.slice = sliceVertexCalculator;
    }

    /**
     * Number of slices for which to calculate verices.
     * 
     * Note: Usually the number of slices you need to calculate is one more
     * than the number of slices the 3D object being tesselated is divided
     * into. (There's a start, and end boundary for each slice.)
     */
    get sliceCount(): number {
        return this.slice.sliceParameterRange.stepCount + 1;
    }

    get vertexCount() {
        return this.slice.startVertexIndex(this.sliceCount + 1);
    }

    updateConfig(): void { }

    /**
     * Calculates vertex, and normal coordinates for vertices shared by
     * tesselation slices.
     *
     * If not overridden, no shared vertices are calculated.
     */
    calculateSharedVertices(
        vertexWriter: Vertices.VertexWriter<TESSELATION_BASE.VertexAndNormal>,
        vertexStartIdx: number): void { }

    calculateVertices(
        vertexWriter: Vertices.VertexWriter<TESSELATION_BASE.VertexAndNormal>
    ) {
        this.calculateSharedVertices(vertexWriter, 0);

        const slice = this.slice;
        const sliceParameter = slice.sliceParameterRange;

        // There's a start tube circle, and an end tube circle for each
        // toroidal step.
        const sliceCount = this.sliceCount;
        for (let sliceIdx = 0; sliceIdx < sliceCount; ++sliceIdx) {
            slice.calculateVertices(
                sliceParameter.atStep(sliceIdx), vertexWriter,
                slice.startVertexIndex(sliceIdx));
        }
    }
}

/**
 * Calculates coordinates for connecting the end of a slice that terminates at
 * an integer step of the `sliceParameter`, and the boundary of the 3D object
 * at a `sliceParameter` which doesn't correspond to an integer step.
 */
export class ConnectingSliceVertexCalculator<
    SliceVertexCalculatorT extends SliceVertexCalculator
> extends VertexCalculator<SliceVertexCalculatorT>
{
    readonly slice: null;
    private readonly _vertexAndNormal = new TESSELATION_BASE.VertexAndNormal();

    constructor(
        readonly vertexCoords: SurfaceVertexCoords<VertexCalculator<SliceVertexCalculatorT>>
    ) {
        super(null);
        this.vertexCoords = vertexCoords;
    }

    get sliceCount(): number {
        return 1;
    }

    get sharedVertexCount() {
        return this.vertexCoords.vertexCalculator.slice.startVertexIndex(0);
    }

    get vertexCount() {
        return this.sharedVertexCount +
            2 * this.vertexCoords.vertexCalculator.slice.maxVertexCount;
    }

    /**
     * Calculates vertex, and normal coordinates for vertices shared by
     * tesselation slices.
     *
     * If not overridden, no shared vertices are calculated.
     */
    calculateSharedVertices(
        vertexWriter: Vertices.VertexWriter<TESSELATION_BASE.VertexAndNormal>,
        coordStartIdx: number
    ) {
        this.copyVerticesFromBase(
            0,
            this.sharedVertexCount,
            vertexWriter,
            coordStartIdx
        );
    }

    calculateVertices(
        vertexWriter: Vertices.VertexWriter<TESSELATION_BASE.VertexAndNormal>
    ) {
        this.calculateSharedVertices(vertexWriter, 0);
    }

    /**
     * Recalculates the vertex, and normal coordinates which change when the
     * slice this slice is connecting to changes, or the sliceParameter this
     * slice is connecting to changes.
     *
     * E.g.:
     *     - You sliced a circle in 4 equal parts.
     *     - You are displaying the first two slices of the circle.
     *     - You want to connect the secord slice, which terminates at central
     *       angle 180° to point at angle 210°.
     *
     * Then:
     *     - `sliceIdx` = 1 (second slice).
     *     - `sliceParameter` = 210°.
     *
     * @param sliceIdx - Index of the slice this slice is connecting to.
     * @param sliceParameter - The slice parameter this slice is connecting to.
     * @param vertexWriter - Stores vertex, and normal coordinates.
     * @param vertexStartIdx - Index in `out_vertexCoords`, and in
     *     `out_normalCoords` from which to start writing coordinates.
     * 
     *     Usually, you want to set this to the index after all the shared 
     * vertices (which don't change with the `sliceParameter`).
     */
    updateVertices(
        sliceIdx: number,
        sliceParameter: number,
        vertexWriter: Vertices.VertexWriter<TESSELATION_BASE.VertexAndNormal>,
        vertexStartIdx = this.sharedVertexCount
    ) {
        const slice = this.vertexCoords.vertexCalculator.slice;

        // Copy the coordinates of slice sliceIdx:
        this.copyVerticesFromBase(
            slice.startVertexIndex(sliceIdx),
            slice.startVertexIndex(sliceIdx + 1),
            vertexWriter,
            vertexStartIdx
        );

        // Calculate the coordinates for a slice at sliceParameter:
        slice.calculateVertices(
            sliceParameter,
            vertexWriter,
            vertexStartIdx + slice.maxVertexCount);
    }

    protected copyVerticesFromBase(
        srcStartVertexIdx: number,
        srcEndVertexIdx: number,
        vertexWriter: Vertices.VertexWriter<TESSELATION_BASE.VertexAndNormal>,
        destStartVertexIdx: number
    ) {
        const srcNormalCoords = this.vertexCoords.normalCoords;
        const srcVertexCoords = this.vertexCoords.vertexCoords;
        const vertexAndNormal = this._vertexAndNormal;
        const vertex = vertexAndNormal.vertex;
        const normal = vertexAndNormal.normal;

        const srcEndIdx = srcEndVertexIdx * COORDS_PER_VERTEX;
        let destI = destStartVertexIdx
        let srcI = srcStartVertexIdx * COORDS_PER_VERTEX;
        while (srcI < srcEndIdx) {
            normal.setComponent(0, srcNormalCoords[srcI]);
            normal.setComponent(1, srcNormalCoords[srcI + 1]);
            normal.setComponent(2, srcNormalCoords[srcI + 2]);

            vertex.setComponent(0, srcVertexCoords[srcI++]);
            vertex.setComponent(1, srcVertexCoords[srcI++]);
            vertex.setComponent(2, srcVertexCoords[srcI++]);

            vertexWriter.writeVertex(destI++, vertexAndNormal);
        }
    }
}

/** Calculates, and stores vertices for a connecting slice. */
export class ConnectingSliceVertexCoords<
    SliceVertexCalculatorT extends SliceVertexCalculator
> extends SurfaceVertexCoords<VertexCalculator<SliceVertexCalculatorT>>
{
    readonly vertexCalculator: ConnectingSliceVertexCalculator<SliceVertexCalculatorT>;
    private _sliceParameter: number = NaN;

    constructor(
        vertexCalculator: ConnectingSliceVertexCalculator<SliceVertexCalculatorT>
    ) {
        super(vertexCalculator);
    }

    set sliceParameter(value: number) {
        if (value != this._sliceParameter) {
            const sliceIdx =
                this.vertexCalculator.vertexCoords.vertexCalculator.slice.sliceParameterRange.lastIncludedStepIdx(
                    value);

            this.vertexCalculator.updateVertices(
                sliceIdx,
                value,
                this.vertexWriter,
                this.vertexCalculator.sharedVertexCount);
            this.normalAttribute.needsUpdate = true;
            this.positionAttribute.needsUpdate = true;
            this._sliceParameter = value;
        }
    }
}


/** 
 * Calculates the vertex indices of a tesselation slice.
 */
export interface IndexedGeometrySliceVertexCalculator {
    /**
     * Returns the index of the first vertex in this tesselation slice within
     * the indices array.
     */
    startVertexIndex(sliceIdx: number): number;

    /** 
     * Outputs vertex, and normal coordinates for the vertices in a given
     * tesselation slice.
     * 
     * @param sliceIdx - Which slice to calculate vertex indices for.  Starts
     *    at 0.
     * @param out_vertexIndices - Where to store vertex indices.  Each
     *     vertex is stored an index (in the vertices array).
     * @param startIdx - Index in `out_vertexIndices` from which to start
     *     storing vertex indices.
     */
    calculateVertexIndices(
        sliceIdx: number, out_vertexIndices: Uint32Array, startIdx: number
    ): void;
}

/**
 * An {@link THREE.BufferGeometry} with vertices represented as indices in a vertex
 * array ('position' {@link THREE.BufferAttribute}).
 */
export abstract class IndexedGeometry<
    SliceVertexCalculatorT extends SliceVertexCalculator,
    IndexedGeometrySliceVertexCalculatorT extends IndexedGeometrySliceVertexCalculator
> {
    readonly slice: IndexedGeometrySliceVertexCalculatorT;
    private _startSliceIndex = 0;
    private _endSliceIndex = NaN;
    // TODO(pavelpenev): Restore private:
    /*private*/ readonly triangleVertexIndices: Uint32Array;
    private readonly indexAttribute: THREE.BufferAttribute;
    protected readonly geometry: THREE.BufferGeometry;

    constructor(
        protected readonly vertexCoords: SurfaceVertexCoords<VertexCalculator<SliceVertexCalculatorT>>,
        sliceVertexCalculator: IndexedGeometrySliceVertexCalculatorT
    ) {
        this.slice = sliceVertexCalculator;

        this.triangleVertexIndices = new Uint32Array(this.vertexCount);
        this.calculateVertexIndices(this.triangleVertexIndices);

        this.indexAttribute = new THREE.BufferAttribute(
            this.triangleVertexIndices, 1);

        this.geometry = new THREE.BufferGeometry().
            setAttribute('position', this.vertexCoords.positionAttribute).
            setAttribute('normal', this.vertexCoords.normalAttribute).
            setIndex(this.indexAttribute);
    }

    /**
     * The number of vertices in this geometry.
     *
     * Note: This is not necessarily (or usually) the number of vertices is
     * the vertex array ('position' {@link THREE.BufferAttribute}).
     *
     * E.g., to render a square you may have:
     *   - a 'position' {@link THREE.BufferAttribute} with 4 vertices (one for
     *     each vertex of the square).
     *   - a surface geometry with 2 triangles, each triangle occupying half
     *     of the square.
     *   - `getVertexCount` = 6, because there are 3 vertices for each of the
     *     two triangles. (Each of these 6 vertices would be represented by an
     *     index in the vertex array.)
     */
    get vertexCount() {
        return this.slice.startVertexIndex(this.calculatedSliceCount);
    }

    /**
     * The number of calculated slices.
     * 
     * Note: This is usually one greater than the number of slices a 3D object
     * is sliced into. (Each slice has a start, and an end boundary.)
     */
    get calculatedSliceCount() {
        return this.vertexCoords.vertexCalculator.sliceCount;
    }

    /**
     * The last slice to render.
     * 
     * You can use this to vary which slices are displayed.
     */
    set drawEndSliceIndex(sliceIdx: number) {
        if (sliceIdx >= 0 && sliceIdx <= this.calculatedSliceCount) {
            this.geometry.setDrawRange(
                this.slice.startVertexIndex(this._startSliceIndex),
                this.slice.startVertexIndex(sliceIdx));
            this._endSliceIndex = sliceIdx;
        } else {
            console.error(
                `Slice index ${sliceIdx} out of bounds [0; ${this.calculatedSliceCount}]`);
        }
    }

    /**
     * Writes vertex indices in the right order, so that they can be rendered
     * as squares, or line segments. (There aren't any other drawing
     * primitives implemented.)
     *
     * Each index refers to a vertex in the vertex array ('position'
     * {@link THREE.BufferAttribute}).
     *
     * @param out_vertexIndices - Where to store the vertex indices.
     */
    calculateVertexIndices(out_vertexIndices: Uint32Array) {
        const slice = this.slice;
        const sliceCount = this.calculatedSliceCount;

        for (let sliceIdx = 0; sliceIdx < sliceCount; ++sliceIdx) {
            slice.calculateVertexIndices(
                sliceIdx, out_vertexIndices, slice.startVertexIndex(sliceIdx));
        }
    }
}

export class IndexedSurface<
    SliceVertexCalculatorT extends SliceVertexCalculator,
    IndexedGeometrySliceVertexCalculatorT extends IndexedGeometrySliceVertexCalculator
> extends IndexedGeometry<SliceVertexCalculatorT, IndexedGeometrySliceVertexCalculatorT> {
    readonly mesh: THREE.Mesh;

    constructor(
        vertexCoords: SurfaceVertexCoords<VertexCalculator<SliceVertexCalculatorT>>,
        sliceVertexCalculator: IndexedGeometrySliceVertexCalculatorT,
        surfaceMaterial: THREE.Material
    ) {
        super(vertexCoords, sliceVertexCalculator);

        this.mesh = new THREE.Mesh(
            this.geometry, surfaceMaterial);
    }
}

export class IndexedLineSegments<
    SliceVertexCalculatorT extends SliceVertexCalculator,
    IndexedGeometrySliceVertexCalculatorT extends IndexedGeometrySliceVertexCalculator
> extends IndexedGeometry<SliceVertexCalculatorT, IndexedGeometrySliceVertexCalculatorT> {
    readonly line: THREE.LineSegments;

    constructor(
        vertexCoords: SurfaceVertexCoords<VertexCalculator<SliceVertexCalculatorT>>,
        sliceVertexCalculator: IndexedGeometrySliceVertexCalculatorT,
        lineMaterial: THREE.Material
    ) {
        super(vertexCoords, sliceVertexCalculator);

        this.line = new THREE.LineSegments(
            this.geometry, lineMaterial);
    }
}

export class IndexedConnectingSliceSurface<
    SliceVertexCalculatorT extends SliceVertexCalculator,
    IndexedGeometrySliceVertexCalculatorT extends IndexedGeometrySliceVertexCalculator
> extends IndexedSurface<SliceVertexCalculatorT, IndexedGeometrySliceVertexCalculatorT> {
    protected readonly vertexCoords: ConnectingSliceVertexCoords<SliceVertexCalculatorT>;

    constructor(
        vertexCoords: ConnectingSliceVertexCoords<SliceVertexCalculatorT>,
        sliceVertexCalculator: IndexedGeometrySliceVertexCalculatorT,
        surfaceMaterial: THREE.Material
    ) {
        super(vertexCoords, sliceVertexCalculator, surfaceMaterial);
    }
}

export class IndexedConnectingSliceLineSegments<
    SliceVertexCalculatorT extends SliceVertexCalculator,
    IndexedGeometrySliceVertexCalculatorT extends IndexedGeometrySliceVertexCalculator
> extends IndexedLineSegments<SliceVertexCalculatorT, IndexedGeometrySliceVertexCalculatorT> {
    protected readonly vertexCoords: ConnectingSliceVertexCoords<SliceVertexCalculatorT>;

    constructor(
        vertexCoords: ConnectingSliceVertexCoords<SliceVertexCalculatorT>,
        sliceVertexCalculator: IndexedGeometrySliceVertexCalculatorT,
        surfaceMaterial: THREE.Material
    ) {
        super(vertexCoords, sliceVertexCalculator, surfaceMaterial);
    }
}
