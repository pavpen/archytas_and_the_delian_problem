import * as THREE from 'three';

import { ConstStepRange, PlaneDirections, ValueRange } from '../geometry/parameters';
import { SurfaceVertexCoords, VertexAndNormal } from './tesselation_base';
import {
    ConnectingSliceVertexCalculator,
    ConnectingSliceVertexCoords,
    IndexedConnectingSliceSurface,
    IndexedConnectingSliceLineSegments,
    IndexedLineSegments,
    IndexedSurface,
    IndexedGeometrySliceVertexCalculator,
    SliceVertexCalculator,
    VertexCalculator
} from './sliced_tesselation';
import { VertexWriter } from '../geometry/vertices';
import { ColumnVector, ColumnVector3 } from '../geometry/vectors_and_matrices';

export class TorusConfiguration {
    readonly poloidalAngle_rad: ValueRange;

    constructor(
        readonly surfaceMaterial: THREE.Material,
        readonly wireframeMaterial: THREE.Material,
        readonly origin: ColumnVector<3>,
        readonly radius: number,
        readonly toroidalPlane: PlaneDirections<3>,
        readonly toroidalAngle_rad: ValueRange,
        poloidalAngleStepCount: number = 180 / 5
    ) {
        this.poloidalAngle_rad = new ConstStepRange(0, Math.PI, poloidalAngleStepCount);
    }
}

/**
 * Calculates locations of vertices, and directions of normals.
 *
 * We're using a section of a horn torus.
 */
class TubeCircleVertexCalculator implements SliceVertexCalculator {
    // In the tube circle plane. We allocate these once, rather than on every
    // tube circle vertex calculation.
    private readonly _xHat = new ColumnVector3();
    private readonly _yHat: ColumnVector<3>;
    private readonly _vertexAndNormal = new VertexAndNormal();

    constructor(
        readonly config: TorusConfiguration
    ) {
        // This doesn't change with the toroidal angle:
        this._yHat = this.config.toroidalPlane.zHat;
    }

    get sliceParameterRange() {
        return this.config.poloidalAngle_rad;
    }

    startVertexIndex(toroidalStepIdx: number) {
        return 1 + this.uniqueVertexCount * toroidalStepIdx;
    }

    get maxVertexCount() {
        return this.uniqueVertexCount;
    }

    get uniqueVertexCount() {
        // The center of symmetry is a common to all tube circles.
        return this.config.poloidalAngle_rad.stepCount;
    }

    calculateVertices(
        toroidalAngle_rad: number,
        vertexWriter: VertexWriter<VertexAndNormal>,
        vertexStartIdx: number
    ) {
        const origin = this.config.origin;
        const radius = this.config.radius;

        // In the tube circle plane:
        const xHat = this.config.toroidalPlane.unitVecAtAngle(
            toroidalAngle_rad, this._xHat);
        const yHat = this._yHat;

        const vertexAndNormal = this._vertexAndNormal;
        let vertexIdx = vertexStartIdx;

        const stepCount = this.sliceParameterRange.stepCount;

        for (let i = 0; i < stepCount; ++i) {
            const poloidalAngle_rad = this.config.poloidalAngle_rad.atStep(i);

            // The normal is along the tube circle radius vector:
            vertexAndNormal.normal.
                setComponent(0, 0).setComponent(1, 0).setComponent(2, 0).
                addScaled(xHat, Math.cos(poloidalAngle_rad)).
                addScaled(yHat, Math.sin(poloidalAngle_rad));

            // The vertex is at: normal * radius + (tube circle center). The
            // tube circle center is at: origin + xHat * radius.
            vertexAndNormal.vertex.setToSum(vertexAndNormal.normal, xHat).
                multiplyScalar(radius).
                add(origin);

            vertexWriter.writeVertex(vertexIdx++, vertexAndNormal);
        }
    }
}

/**
 * Calculates locations of vertices, and directions of normals.
 *
 * We're using a section of a horn torus.
 */
class TorusVertexCalculator extends VertexCalculator<TubeCircleVertexCalculator> {
    private readonly _vertexAndNormal = new VertexAndNormal();

    /** Calculates coordinates of the common horn torus vertex. */
    calculateSharedVertices(
        vertexWriter: VertexWriter<VertexAndNormal>,
        vertexStartIdx: number
    ) {
        const origin = this.slice.config.origin;
        const vertexAndNormal = this._vertexAndNormal;

        // Perpendicular to the toroidal circle plane:
        const zHat = this.slice.config.toroidalPlane.zHat;

        vertexAndNormal.normal.copy(zHat);
        vertexAndNormal.vertex.copy(origin);

        vertexWriter.writeVertex(vertexStartIdx, vertexAndNormal);
    }
}

class TorusCoords extends SurfaceVertexCoords<TorusVertexCalculator> {
    constructor(config: TorusConfiguration) {
        super(new TorusVertexCalculator(
            new TubeCircleVertexCalculator(config)));
    }
}

/** 
 * Calculates information about each tesselation slice along the toroidal angle.
 *
 * I.e., indices of the vertices which form the triangles of each slice.
 */
class SurfaceToroidalStepCalculator implements IndexedGeometrySliceVertexCalculator {
    constructor(
        private readonly torusVertexCalculator: TorusVertexCalculator
    ) { }

    /** Number of tesselation triangles per toroidal angle step. */
    get triangleCount() {
        return 1 + 2 * (this.torusVertexCalculator.slice.uniqueVertexCount - 1);
    }

    get vertexIdxCount() {
        return this.triangleCount * 3;
    }

    startVertexIndex(toroidalStepIdx: number) {
        return this.vertexIdxCount * toroidalStepIdx;
    }

    calculateVertexIndices(
        toroidalStepIdx: number, out_vertexIndices: Uint32Array, startIdx: number
    ) {
        let outIdx = startIdx;

        let startCircleVertexIdx =
            this.torusVertexCalculator.slice.startVertexIndex(toroidalStepIdx);
        let endCircleVertexIdx =
            this.torusVertexCalculator.slice.startVertexIndex(toroidalStepIdx + 1);
        const endIdx = endCircleVertexIdx - 1;

        for (; startCircleVertexIdx < endIdx; ++startCircleVertexIdx, ++endCircleVertexIdx) {
            // Specify vertices with a counter-clockwise winding.
            out_vertexIndices[outIdx++] = startCircleVertexIdx;
            out_vertexIndices[outIdx++] = endCircleVertexIdx;
            out_vertexIndices[outIdx++] = endCircleVertexIdx + 1;

            out_vertexIndices[outIdx++] = endCircleVertexIdx + 1;
            out_vertexIndices[outIdx++] = startCircleVertexIdx + 1;
            out_vertexIndices[outIdx++] = startCircleVertexIdx;
        }

        // Add the triangle with the common center-of-symmetry vertex:
        out_vertexIndices[outIdx++] = 0;
        out_vertexIndices[outIdx++] = endCircleVertexIdx - 1;
        out_vertexIndices[outIdx++] = startCircleVertexIdx - 1;
    }
}

class TorusSurface extends
    IndexedSurface<TubeCircleVertexCalculator, SurfaceToroidalStepCalculator>
{
    constructor(vertexCoords: TorusCoords) {
        super(
            vertexCoords,
            new SurfaceToroidalStepCalculator(
                vertexCoords.vertexCalculator),
            vertexCoords.vertexCalculator.slice.config.surfaceMaterial);
    }
}

/** Calculates information about each tube circrle along the toridal angle. */
class WireframeToroidalStepCalculator implements IndexedGeometrySliceVertexCalculator {
    constructor(
        private readonly torusVertexCalculator: TorusVertexCalculator
    ) { }

    /** Number of line segments tesselating the tube circle. */
    get lineSegmentCount() {
        return this.torusVertexCalculator.slice.uniqueVertexCount;
    }

    get vertexIdxCount() {
        return this.lineSegmentCount * 2;
    }

    startVertexIndex(toroidalStepIdx: number) {
        return this.vertexIdxCount * toroidalStepIdx;
    }

    calculateVertexIndices(
        toroidalStepIdx: number, out_vertexIndices: Uint32Array, startIdx: number
    ) {
        let outIdx = startIdx;

        let startVertexIdx =
            this.torusVertexCalculator.slice.startVertexIndex(toroidalStepIdx);
        const endVertexIdx =
            this.torusVertexCalculator.slice.startVertexIndex(toroidalStepIdx + 1) - 1;

        for (; startVertexIdx < endVertexIdx; ++startVertexIdx) {
            out_vertexIndices[outIdx++] = startVertexIdx;
            out_vertexIndices[outIdx++] = startVertexIdx + 1;
        }

        // Add the line segment to the common center-of-symmetry vertex:
        out_vertexIndices[outIdx++] = endVertexIdx;
        out_vertexIndices[outIdx++] = 0;
    }
}

class TorusWireframe extends
    IndexedLineSegments<TubeCircleVertexCalculator, WireframeToroidalStepCalculator>
{
    constructor(torusCoords: TorusCoords) {
        super(
            torusCoords,
            new WireframeToroidalStepCalculator(
                torusCoords.vertexCalculator),
            torusCoords.vertexCalculator.slice.config.wireframeMaterial);
    }
}

class ConnectingSliceTorusCoords extends ConnectingSliceVertexCoords<TubeCircleVertexCalculator> {
    constructor(torusCoords: TorusCoords) {
        super(new ConnectingSliceVertexCalculator<TubeCircleVertexCalculator>(torusCoords));
    }
}

/**
 * Connects the last toroidal angle slice with the tube circle at the current
 * toroidal angle.
 */
class ConnectingSliceSurface extends
    IndexedConnectingSliceSurface<TubeCircleVertexCalculator, SurfaceToroidalStepCalculator>
{
    constructor(
        connectingSliceTorusCoords: ConnectingSliceTorusCoords,
        surfaceToroidalStepCalculator: SurfaceToroidalStepCalculator
    ) {
        super(
            connectingSliceTorusCoords,
            surfaceToroidalStepCalculator,
            connectingSliceTorusCoords.vertexCalculator.vertexCoords.vertexCalculator.slice.config.surfaceMaterial);
    }
}

class ConnectingSliceWireframe extends
    IndexedConnectingSliceLineSegments<TubeCircleVertexCalculator, WireframeToroidalStepCalculator>
{
    constructor(
        connectingSliceTorusCoords: ConnectingSliceTorusCoords,
        wireframeToroidalStepCalculator: WireframeToroidalStepCalculator
    ) {
        super(
            connectingSliceTorusCoords,
            wireframeToroidalStepCalculator,
            connectingSliceTorusCoords.vertexCalculator.vertexCoords.vertexCalculator.slice.config.wireframeMaterial);
    }
}

export class ArchytasTorus {
    readonly surface: TorusSurface;
    readonly wireframe: TorusWireframe;
    readonly connectingSliceSurface: ConnectingSliceSurface;
    private readonly coords: TorusCoords;
    private readonly connectingSliceCoords: ConnectingSliceTorusCoords;
    private readonly connectingSliceWireframe: ConnectingSliceWireframe;
    readonly sceneObject: THREE.Object3D;
    private readonly config: TorusConfiguration;

    constructor(config: TorusConfiguration) {
        this.config = config;
        this.coords = new TorusCoords(config);
        this.surface = new TorusSurface(this.coords);
        this.wireframe = new TorusWireframe(this.coords);
        this.connectingSliceCoords = new ConnectingSliceTorusCoords(
            this.coords);
        this.connectingSliceSurface = new ConnectingSliceSurface(
            this.connectingSliceCoords, this.surface.slice);
        this.connectingSliceWireframe = new ConnectingSliceWireframe(
            this.connectingSliceCoords, this.wireframe.slice);

        this.sceneObject = new THREE.Group().
            add(this.surface.mesh).
            add(this.connectingSliceSurface.mesh).
            add(this.wireframe.line).
            add(this.connectingSliceWireframe.line);
    }

    set toroidalAngle_rad(value: number) {
        if (this.config.toroidalAngle_rad.includes(value)) {
            const stepIdx = this.config.toroidalAngle_rad.lastIncludedStepIdx(value);

            this.surface.drawEndSliceIndex = stepIdx;
            this.wireframe.drawEndSliceIndex = stepIdx > 0 ? stepIdx + 1 : stepIdx;
            this.connectingSliceCoords.sliceParameter = value;
        } else {
            console.error(
                `Toroidal angle ${value} rad out of bounds ${this.config.toroidalAngle_rad.repr('°', 180 / Math.PI)}`);
        }
    }
}
