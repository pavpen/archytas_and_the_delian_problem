import * as THREE from 'three';

import { PlaneDirections, ValueRange } from '../geometry/parameters';
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

export class CylinderConfiguration {
    constructor(
        readonly surfaceMaterial: THREE.Material,
        readonly wireframeMaterial: THREE.Material,
        readonly origin: ColumnVector<3>,
        readonly radius: number,
        readonly transversePlane: PlaneDirections<3>,
        readonly angle_rad: ValueRange,
        readonly height: number = 1.5 * radius
    ) { }
}

/**
 * Calculates locations of vertices, and directions of normals.
 */
class GeneratrixVertexCalculator implements SliceVertexCalculator {
    // In the transverse plane. We allocate these once, rather than on every
    // slice calculation.
    private readonly _xHat = new ColumnVector3();
    private readonly _hVec: ColumnVector<3>;
    private readonly _vertexAndNormal = new VertexAndNormal();

    constructor(
        readonly config: CylinderConfiguration
    ) {
        this._hVec = this.config.transversePlane.zHat.clone().
            multiplyScalar(this.config.height);
    }

    get sliceParameterRange() {
        return this.config.angle_rad;
    }

    startVertexIndex(sliceIdx: number) {
        return this.vertexCount * sliceIdx;
    }

    get maxVertexCount() {
        return this.vertexCount;
    }

    get vertexCount() {
        return 2;
    }

    calculateVertices(
        secantAngle_rad: number,
        vertexWriter: VertexWriter<VertexAndNormal>,
        vertexStartIdx: number
    ) {
        const centralAngle_rad = Math.PI - 2 * secantAngle_rad;

        // In the transverse plane:
        const xHat = this.config.transversePlane.unitVecAtAngle(
            centralAngle_rad, this._xHat);

        const vertexAndNormal = this._vertexAndNormal;
        let vertexIdx = vertexStartIdx;

        // The normal is along the radius vector xHat:
        vertexAndNormal.normal.copy(xHat);

        // The bottom vertex:
        vertexAndNormal.vertex.copy(this.config.origin).
            addScaled(xHat, this.config.radius);

        vertexWriter.writeVertex(vertexIdx++, vertexAndNormal);

        // The top normal is the same as the bottom one:
        // vertexAndNormal.normal.copy(xHat);

        // The top vertex:
        vertexAndNormal.vertex.add(this._hVec);

        vertexWriter.writeVertex(vertexIdx, vertexAndNormal);
    }
}

/**
 * Calculates locations of vertices, and directions of normals.
 */
class CylinderVertexCalculator extends VertexCalculator<GeneratrixVertexCalculator> { }

class CylinderCoords extends SurfaceVertexCoords<VertexCalculator<GeneratrixVertexCalculator>> {
    constructor(config: CylinderConfiguration) {
        super(new CylinderVertexCalculator(
            new GeneratrixVertexCalculator(config)));
    }
}

/** 
 * Calculates information about each tesselation slice along the angle.
 */
class SurfaceAngleStepCalculator implements IndexedGeometrySliceVertexCalculator {
    private readonly vertexCalculator: CylinderVertexCalculator;

    constructor(vertexCalculator: CylinderVertexCalculator) {
        this.vertexCalculator = vertexCalculator;
    }

    /** Number of tesselation triangles per angle step. */
    get triangleCount() {
        return 2 * (this.vertexCalculator.slice.vertexCount - 1);
    }

    get vertexIdxCount() {
        return this.triangleCount * 3;
    }

    startVertexIndex(sliceIdx: number) {
        return this.vertexIdxCount * sliceIdx;
    }

    calculateVertexIndices(
        sliceIdx: number, out_vertexIndices: Uint32Array, startIdx: number
    ) {
        let outIdx = startIdx;

        let startSliceVertexIdx =
            this.vertexCalculator.slice.startVertexIndex(sliceIdx);
        let endSliceVertexIdx =
            this.vertexCalculator.slice.startVertexIndex(sliceIdx + 1);
        const endIdx = endSliceVertexIdx - 1;

        for (; startSliceVertexIdx < endIdx; ++startSliceVertexIdx, ++endSliceVertexIdx) {
            out_vertexIndices[outIdx++] = startSliceVertexIdx;
            out_vertexIndices[outIdx++] = endSliceVertexIdx;
            out_vertexIndices[outIdx++] = endSliceVertexIdx + 1;

            out_vertexIndices[outIdx++] = endSliceVertexIdx + 1;
            out_vertexIndices[outIdx++] = startSliceVertexIdx + 1;
            out_vertexIndices[outIdx++] = startSliceVertexIdx;
        }
    }
}

class CylinderSurface extends
    IndexedSurface<GeneratrixVertexCalculator, SurfaceAngleStepCalculator>
{
    constructor(vertexCoords: CylinderCoords) {
        super(
            vertexCoords,
            new SurfaceAngleStepCalculator(
                vertexCoords.vertexCalculator),
            vertexCoords.vertexCalculator.slice.config.surfaceMaterial);
    }
}

/** Calculates information about each generatrix line along the angle. */
class WireframeAngleStepCalculator implements IndexedGeometrySliceVertexCalculator {
    private readonly vertexCalculator: CylinderVertexCalculator;

    constructor(vertexCalculator: CylinderVertexCalculator) {
        this.vertexCalculator = vertexCalculator;
    }

    /** Number of line segments tesselating the generatrix. */
    get lineSegmentCount() {
        return this.vertexCalculator.slice.vertexCount - 1;
    }

    get vertexIdxCount() {
        return this.lineSegmentCount * 2;
    }

    startVertexIndex(sliceIdx: number) {
        return this.vertexIdxCount * sliceIdx;
    }

    calculateVertexIndices(
        sliceIdx: number, out_vertexIndices: Uint32Array, startIdx: number
    ) {
        let outIdx = startIdx;

        let startVertexIdx =
            this.vertexCalculator.slice.startVertexIndex(sliceIdx);
        const endVertexIdx =
            this.vertexCalculator.slice.startVertexIndex(sliceIdx + 1) - 1;

        for (; startVertexIdx < endVertexIdx; ++startVertexIdx) {
            out_vertexIndices[outIdx++] = startVertexIdx;
            out_vertexIndices[outIdx++] = startVertexIdx + 1;
        }
    }
}

class CylinderWireframe extends
    IndexedLineSegments<GeneratrixVertexCalculator, WireframeAngleStepCalculator>
{
    constructor(vertexCoords: CylinderCoords) {
        super(
            vertexCoords,
            new WireframeAngleStepCalculator(
                vertexCoords.vertexCalculator),
            vertexCoords.vertexCalculator.slice.config.wireframeMaterial);
    }
}

class ConnectingSliceCylinderCoords extends ConnectingSliceVertexCoords<GeneratrixVertexCalculator> {
    constructor(vertexCoords: CylinderCoords) {
        super(new ConnectingSliceVertexCalculator<GeneratrixVertexCalculator>(vertexCoords));
    }
}

class ConnectingSliceSurface extends
    IndexedConnectingSliceSurface<GeneratrixVertexCalculator, SurfaceAngleStepCalculator>
{
    constructor(
        connectingSliceCoords: ConnectingSliceCylinderCoords,
        sliceVertexCalculator: SurfaceAngleStepCalculator
    ) {
        super(
            connectingSliceCoords,
            sliceVertexCalculator,
            connectingSliceCoords.vertexCalculator.vertexCoords.vertexCalculator.slice.config.surfaceMaterial);
    }
}

class ConnectingSliceWireframe extends
    IndexedConnectingSliceLineSegments<GeneratrixVertexCalculator, WireframeAngleStepCalculator>
{
    constructor(
        connectingSliceCoords: ConnectingSliceCylinderCoords,
        sliceVertexCalculator: WireframeAngleStepCalculator
    ) {
        super(
            connectingSliceCoords,
            sliceVertexCalculator,
            connectingSliceCoords.vertexCalculator.vertexCoords.vertexCalculator.slice.config.wireframeMaterial);
    }
}

export class ArchytasCylinder {
    readonly surface: CylinderSurface;
    readonly wireframe: CylinderWireframe;
    readonly connectingSliceSurface: ConnectingSliceSurface;
    readonly connectingSliceWireframe: ConnectingSliceWireframe;
    readonly sceneObject: THREE.Object3D;
    private readonly coords: CylinderCoords;
    private readonly connectingSliceCoords: ConnectingSliceCylinderCoords;
    private readonly config: CylinderConfiguration;

    constructor(config: CylinderConfiguration) {
        this.config = config;
        this.coords = new CylinderCoords(config);
        this.surface = new CylinderSurface(this.coords);
        this.wireframe = new CylinderWireframe(this.coords);
        this.connectingSliceCoords = new ConnectingSliceCylinderCoords(
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

    set secantAngle_rad(value: number) {
        if (this.config.angle_rad.includes(value)) {
            const stepIdx = this.config.angle_rad.lastIncludedStepIdx(value);

            this.surface.drawEndSliceIndex = stepIdx;
            this.wireframe.drawEndSliceIndex = stepIdx > 0 ? stepIdx + 1 : stepIdx;
            this.connectingSliceCoords.sliceParameter = value;
        } else {
            console.error(
                `Angle ${value} rad out of bounds [${this.config.angle_rad.start} rad; ${this.config.angle_rad.end} rad]`);
        }
    }
}
