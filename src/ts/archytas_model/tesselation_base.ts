import * as THREE from 'three';
import { VertexWriter } from '../geometry/vertices';
import * as Vertices from '../geometry/vertices';
import { ColumnVector, ColumnVector3 } from '../geometry/vectors_and_matrices';

export const COORDS_PER_VERTEX = 3;

// These could, potentially, be, e.g. Float64Array, or even Int32Array types.
// However, we don't have use for these possibilities in our small project.
// We define these types here for clarity.
export type VertexCoordsArray = Float32Array;
// Allow new VertexCoordsArray():
const VertexCoordsArray = Float32Array;
export type NormalCoordsArray = Float32Array;
const NormalCoordsArray = Float32Array;


/**
 * Calculates the vertex, and normal coordinates for a
 * {@link THREE.Object3D}.
 *
 * @remarks
 *
 * The calculated vertices are usually stored in a {@link SurfaceVertexCoords}
 * object. The same coordinates can be used to construct multiple geometries,
 * such as a mesh, a wireframe, only a mesh using only some of the
 * coordinates.
 *
 * The calculator is separated as an interface, because it's the part that
 * implementations of different geometries are expected to implement.  The
 * code in {@link SurfaceVertexCoords} should be able to be shared among different
 * geometry implementations.
 */
export interface SurfaceVertexCalculator {
    get vertexCount(): number;

    calculateVerticesAndNormals(
        out_vertexCoords: VertexCoordsArray,
        out_normalCoords: NormalCoordsArray
    ): void;
}

export class VertexAndNormal {
    constructor(
        readonly vertex: ColumnVector<3> = new ColumnVector3(),
        readonly normal: ColumnVector<3> = new ColumnVector3()
    ) { }
}

export class CoordsArrayVertexWriter implements VertexWriter<ColumnVector<3>> {
    constructor(readonly vertexCoords: VertexCoordsArray) { }

    writeVertex(vertexIdx: number, vertex: ColumnVector<3>): void {
        let coordsIdx = vertexIdx * COORDS_PER_VERTEX;
        const vertexCoords = this.vertexCoords;

        vertexCoords[coordsIdx++] = vertex.getComponent(0);
        vertexCoords[coordsIdx++] = vertex.getComponent(1);
        vertexCoords[coordsIdx] = vertex.getComponent(2);
    }
}

export class CoordsArrayVertexAndNormalWriter implements VertexWriter<VertexAndNormal> {
    constructor(
        readonly outputVertexCoords: VertexCoordsArray,
        readonly outputNormalCoords: VertexCoordsArray
    ) { }

    writeVertex(vertexIdx: number, vertex: VertexAndNormal): void {
        let coordsIdx = vertexIdx * COORDS_PER_VERTEX;
        const vertexCoords = this.outputVertexCoords;
        const normalCoords = this.outputNormalCoords;
        const position = vertex.vertex;
        const normal = vertex.normal;

        normalCoords[coordsIdx] = normal.getComponent(0);
        normalCoords[coordsIdx + 1] = normal.getComponent(1);
        normalCoords[coordsIdx + 2] = normal.getComponent(2);

        vertexCoords[coordsIdx++] = position.getComponent(0);
        vertexCoords[coordsIdx++] = position.getComponent(1);
        vertexCoords[coordsIdx] = position.getComponent(2);
    }
}

/**
 * Calculates, and stores vertex coordinates calculated by a
 * {@link SurfaceVertexCalculator}.
 *
 * @remarks
 *
 * Geometries can use these coordinates to construct meshes, lines, and other
 * {@link THREE.Object3D}s.  Different geometries may use the same
 * `VertexCoords`.  E.g., you could construct a wireframe, and a surface from
 * the same coordinates.
 */
export class SurfaceVertexCoords<
    VertexCalculatorT extends Vertices.VertexCalculator<VertexAndNormal>
> {
    readonly vertexCoords: VertexCoordsArray;
    readonly normalCoords: NormalCoordsArray;
    readonly positionAttribute: THREE.BufferAttribute;
    readonly normalAttribute: THREE.BufferAttribute;
    protected readonly vertexWriter: CoordsArrayVertexAndNormalWriter;

    constructor(
        readonly vertexCalculator: VertexCalculatorT
    ) {
        const vertexCount = this.vertexCalculator.vertexCount;

        this.vertexCoords = new VertexCoordsArray(vertexCount * COORDS_PER_VERTEX);
        this.normalCoords = new NormalCoordsArray(vertexCount * COORDS_PER_VERTEX);
        this.vertexWriter = new CoordsArrayVertexAndNormalWriter(
            this.vertexCoords, this.normalCoords);
        this.vertexCalculator.calculateVertices(this.vertexWriter);

        this.positionAttribute = new THREE.BufferAttribute(
            this.vertexCoords, COORDS_PER_VERTEX);
        this.normalAttribute = new THREE.BufferAttribute(
            this.normalCoords, COORDS_PER_VERTEX);
    }
}

/**
 * Calculates, and stores vertex coordinates calculated by a
 * {@link Vertices.VertexCalculator<THREE.Vector3>} in a
 * {@link THREE.BufferAttribute}.
 *
 * @remarks
 *
 * Like {@link SurfaceVertexCoords} but without normals.
 */
export class LineVertexCoords<
    VertexCalculatorT extends Vertices.VertexCalculator<ColumnVector<3>>
> {
    readonly vertexCoords: VertexCoordsArray;
    readonly positionAttribute: THREE.BufferAttribute;
    private readonly vertexWriter: CoordsArrayVertexWriter;

    constructor(readonly vertexCalculator: VertexCalculatorT) {
        const vertexCount = this.vertexCalculator.vertexCount;

        this.vertexCoords = new VertexCoordsArray(vertexCount * COORDS_PER_VERTEX);
        this.vertexWriter = new CoordsArrayVertexWriter(this.vertexCoords);
        this.vertexCalculator.calculateVertices(this.vertexWriter);

        this.positionAttribute = new THREE.BufferAttribute(
            this.vertexCoords, COORDS_PER_VERTEX);
    }

    recalculateVertices() {
        this.vertexCalculator.updateConfig();
        this.vertexCalculator.calculateVertices(this.vertexWriter);
        this.positionAttribute.needsUpdate = true;
    }
}

/**
 * Connects the vertices in a vertex array with line segments.
 *
 * @remarks
 *
 * This class creates a geometry that does not uses vertex indices.
 */
export class VerticesAsLine<VertexCalculatorT extends Vertices.VertexCalculator<ColumnVector<3>>> {
    readonly geometry: THREE.BufferGeometry;
    readonly sceneObject: THREE.Line;

    constructor(
        readonly vertexCoords: LineVertexCoords<VertexCalculatorT>,
        readonly material: THREE.Material
    ) {
        this.geometry = new THREE.BufferGeometry().
            setAttribute('position', vertexCoords.positionAttribute);
        this.sceneObject = new THREE.Line(this.geometry, material);
    }
}

export class Line {
    readonly coords: VertexCoordsArray;
    readonly positionAttribute: THREE.BufferAttribute;
    readonly geometry: THREE.BufferGeometry;
    readonly sceneObject: THREE.Line;

    constructor(
        readonly material: THREE.Material,
        vertices: Array<ColumnVector<3>>
    ) {
        const coords = new VertexCoordsArray(vertices.length * COORDS_PER_VERTEX);
        this.coords = coords;

        let endI = vertices.length;
        let coordIdx = 0;
        for (let i = 0; i < endI; ++i) {
            const vertex = vertices[i];
            coords[coordIdx++] = vertex.getComponent(0);
            coords[coordIdx++] = vertex.getComponent(1);
            coords[coordIdx++] = vertex.getComponent(2);
        }

        this.positionAttribute = new THREE.BufferAttribute(
            this.coords, COORDS_PER_VERTEX);
        this.geometry = new THREE.BufferGeometry().
            setAttribute('position', this.positionAttribute);
        this.sceneObject = new THREE.Line(this.geometry, material);
        if ((material as THREE.LineDashedMaterial).isLineDashedMaterial) {
            this.sceneObject.computeLineDistances();
        }
    }

    /**
     * Updates the position of a vertex in the sequence of line segments.
     *
     * Call {@link commitUpdates} to render the updated line.
     */
    updateVertex(vertexIdx: number, newVertex: ColumnVector<3>) {
        let coordIdx = vertexIdx * COORDS_PER_VERTEX;

        this.coords[coordIdx++] = newVertex.getComponent(0);
        this.coords[coordIdx++] = newVertex.getComponent(1);
        this.coords[coordIdx++] = newVertex.getComponent(2);

        return this;
    }

    /**
     * Re-renders the line with any vertex updates that have been made to it.
     */
    commitUpdates() {
        this.positionAttribute.needsUpdate = true;
        if ((this.material as THREE.LineDashedMaterial).isLineDashedMaterial) {
            this.sceneObject.computeLineDistances();
        }

        return this;
    }
}