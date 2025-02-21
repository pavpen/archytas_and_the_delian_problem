import { ValueRange } from "./parameters";

/**
 * Stores calculated vertices.
 *
 * @remarks
 *
 * When a curve, or a surface is approximated, e.g. by line segments or
 * triangles, vertices are calculated for the approximation (e.g., end points
 * of the line segments, or vertices of the triangles).  This interface
 * decouples the vertex calculator from the storage of calculated vertices.
 *
 * E.g., if we approximate a curve for an WebGL canvas, we may want to store
 * vertices in an array for transfer to a graphics card.  If we approximate
 * a curve for storing in a file format, we may want the vertices as an array
 * of vector objects that we can pass to a file format writer.
 */
export interface VertexWriter<VertexInfoT> {
    /**
     * Stores a calculated vertex.
     *
     * This method mustn't keep a reference to `vertex`.  That object may be
     * modified after this method is called.
     */
    writeVertex(vertexIdx: number, vertex: VertexInfoT): void;
}

/**
 * Calculates vertex coordinates for approximating an object, such as curve by
 * sequence of line segments, or a surface by series of triangles.
 *
 * @typeParam VertexInfoT - Type of an object used to represent a vertex.
 *     E.g., if a vertex calculator is calculating vertices to be connected
 *     by line segments, each vertex could be represented as a
 *     {@link Vector3}.  If a vertex calculator is calculating vertices to be
 *     connected by Bézier curves, each vertex may be represented by a
 *     {@link Vector3} for the vertex location, and by a {@link Vector3} for
 *     the control point that defines the tangent of the curve at the vertex.
 */
export interface VertexCalculator<VertexInfoT> {
    /** The number of vertices this calculator outputs. */
    get vertexCount(): number;

    /** Calculates, and writes vertices. */
    calculateVertices(vertexWriter: VertexWriter<VertexInfoT>): void;

    updateConfig(): void;
}

export abstract class ParametricVertexCalculator<VertexInfoT> implements
    VertexCalculator<VertexInfoT>
{
    constructor(
        readonly parameterRange: ValueRange,
        readonly calculatedVertexStorage: VertexInfoT
    ) { }

    get vertexCount(): number {
        return this.parameterRange.stepCount + 1;
    }

    abstract calculateVertex(parameterValue: number, out_vertex: VertexInfoT): void;

    abstract updateConfig(): void;

    calculateVertices(vertexWriter: VertexWriter<VertexInfoT>): void {
        const parameterRange = this.parameterRange;
        const vertex = this.calculatedVertexStorage;

        // We want to include the upper boundary of the angle:
        const endStepIdx = parameterRange.stepCount;
        for (let stepIdx = 0; stepIdx <= endStepIdx; ++stepIdx) {
            this.calculateVertex(parameterRange.atStep(stepIdx), vertex);
            vertexWriter.writeVertex(stepIdx, vertex);
        }
    }
}

export interface VertexAndTangent<VectorT> {
    readonly vertex: VectorT;

    /**
     * Tangent vector relative to the vertex vector.
     *
     * I.e., the origin for this vector is {@link vertex}, not `(0; 0; 0)`.
     */
    readonly tangent: VectorT;
}