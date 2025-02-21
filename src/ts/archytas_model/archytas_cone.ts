import * as THREE from 'three';

import { ConstStepRange, PlaneDirections, ValueRange } from '../geometry/parameters';
import { Line, SurfaceVertexCoords, VertexAndNormal } from './tesselation_base';
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
import { Label, LabelPositioner } from '../three_scene_renderer';
import { VertexWriter } from '../geometry/vertices';
import { ColumnVector, ColumnVector3 } from '../geometry/vectors_and_matrices';

export class ConeConfiguration {
    readonly oapAngleCompliment_rad: ValueRange;

    constructor(
        readonly surfaceMaterial: THREE.Material,
        readonly wireframeMaterial: THREE.Material,
        readonly lineQtMaterial: THREE.Material,
        readonly lineAtMaterial: THREE.Material,
        readonly ptTLabel: Label,
        readonly labelPositioner: LabelPositioner,
        readonly origin: ColumnVector<3>,
        readonly transversePlane: PlaneDirections<3>,
        readonly invertZ: boolean,
        readonly apexAngle_rad: number,
        readonly height: number,
        readonly cylinderRadius: number,
        aopAngleStepCount: number = 90 / 5
    ) {
        this.oapAngleCompliment_rad =
            ConstStepRange.radRangeFromStartEndDegStepCount(0, 90, aopAngleStepCount / 2);
    }
}

/**
 * Calculates locations of vertices, and directions of normals.
 */
class GeneratrixVertexCalculator implements SliceVertexCalculator {
    readonly config: ConeConfiguration;

    // In the transverse plane. We allocate these once, rather than on every
    // slice calculation.
    private readonly _xHat = new ColumnVector3();
    private readonly _zHat: ColumnVector<3>;
    private readonly _baseCenterVec: ColumnVector<3>;
    private readonly _vertex = new ColumnVector3();
    private readonly _baseRadius: number;
    private readonly _vertexAndNormal = new VertexAndNormal();

    constructor(config: ConeConfiguration) {
        this.config = config;
        this._zHat = this.config.transversePlane.zHat.clone();
        if (this.config.invertZ) {
            this._zHat.multiplyScalar(-1);
        }
        this._baseCenterVec = this._zHat.clone().
            multiplyScalar(-this.config.height);
        this._baseRadius =
            this.config.height * Math.tan(this.config.apexAngle_rad / 2);
    }

    get sliceParameterRange() {
        return this.config.oapAngleCompliment_rad;
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

    /**
     * Angle around the cone's axis corresponding to a given angle between a
     * projection of the generatrix on the plane at central angle = 0, and the
     * cone's axis.
     * 
     * @remarks
     * 
     * The limit of PR / PQ as oapAngle -> 0 = 1 / sqrt(2), and both PR, and
     * PQ -> 0.
     * 
     * The JavaScript floats start to lose reliable precision somewhere around
     * the defaut value for {@link eps}.
     */
    centralAngleForAngleOAP_rad(oapAngle_rad: number, eps = 1e-8) {
        if (oapAngle_rad < eps) {
            return Math.atan2(1, Math.sqrt(2));
        }

        // (AP/AR)^2 = AP/AO = cos(∢OAP) => AR^2 = AP^2 / cos(∢OAP)
        // AP = AO * cos(∢OAP)
        // PR^2 = AR^2 - AP^2 = AP^2 * [1 / cos(∢OAP) - 1]
        // PQ = AP * sin(∢OAP)
        // PR / PQ = tan(centralAngle) = sqrt[1 / cos(∢OAP) - 1] / sin(∢OAP)
        return Math.atan2(
            Math.sqrt(1.0 / Math.cos(oapAngle_rad) - 1),
            Math.sin(oapAngle_rad));
    }

    calculateVertices(
        oapAngleCompliment_rad: number,
        vertexWriter: VertexWriter<VertexAndNormal>,
        vertexStartIdx: number,
        oapAngleComplimentStepSize_rad: number =
            this.config.oapAngleCompliment_rad.stepSize(
                this.config.oapAngleCompliment_rad.lastIncludedStepIdx(
                    oapAngleCompliment_rad))
    ) {
        const zHat = this._zHat;
        const origin = this.config.origin;
        const vertexAndNormal = this._vertexAndNormal;

        let vertex = this._vertex;
        let vertexIdx = vertexStartIdx;
        const oapAngle_rad = Math.PI / 2 - oapAngleCompliment_rad;

        // The apex vertex. We store a separate vertex for each generantrix,
        // because it has a different normal direction, even though the vertex
        // position stays the same.

        // The vertex at the apex is used for a triangle that goes from this
        // generatrix to the next. There are two different central angles for
        // the two generatrices, with two different corresponding normal
        // directions.  So, we calculate the normal at the shared vertex,
        // using a central angle that's a mean between the central angles for
        // the two generatrices.
        //
        // In the transverse plane:
        let centralAngle_rad = this.centralAngleForAngleOAP_rad(
            oapAngle_rad - oapAngleComplimentStepSize_rad / 2);
        // The normal direction is the radius vector rotated by half the
        // apex angle:
        vertexAndNormal.normal.copy(
            this.config.transversePlane.unitVecAtAngle(centralAngle_rad, vertex)).
            multiplyScalar(Math.cos(centralAngle_rad)).
            addScaled(zHat, Math.sin(centralAngle_rad));
        vertexAndNormal.vertex.copy(origin);
        vertexWriter.writeVertex(vertexIdx++, vertexAndNormal);

        // The bottom vertex:
        // Normal direction:
        centralAngle_rad = this.centralAngleForAngleOAP_rad(oapAngle_rad);

        const xHat = this.config.transversePlane.
            unitVecAtAngle(centralAngle_rad, this._xHat);
        vertexAndNormal.normal.copy(xHat).
            multiplyScalar(Math.cos(centralAngle_rad)).
            addScaled(zHat, Math.sin(centralAngle_rad));
        vertexAndNormal.vertex.copy(this.config.origin)
            .add(this._baseCenterVec)
            .addScaled(xHat, this._baseRadius);

        vertexWriter.writeVertex(vertexIdx, vertexAndNormal);
    }

    vertexAtCentralAngleAndHeight(
        centralAngle_rad: number, height: number, out_result: ColumnVector<3>
    ) {
        // Unit vector perpendicular to the axis:
        const xHat = this.config.transversePlane.unitVecAtAngle(
            centralAngle_rad, this._xHat);
        const baseRadius = height * Math.tan(this.config.apexAngle_rad / 2);

        out_result.copy(xHat).multiplyScalar(baseRadius).
            add(this.config.origin).
            addScaled(this._zHat, -height);

        return out_result;
    }

    vertexOnAxisAtHeight(height: number, out_result: ColumnVector<3>) {
        out_result.copy(this._zHat).multiplyScalar(-height).
            add(this.config.origin);

        return out_result;
    }
}

/**
 * Calculates locations of vertices, and directions of normals.
 */
class ConeVertexCalculator extends VertexCalculator<GeneratrixVertexCalculator> { }

class ConeCoords extends SurfaceVertexCoords<VertexCalculator<GeneratrixVertexCalculator>> {
    constructor(config: ConeConfiguration) {
        super(new ConeVertexCalculator(
            new GeneratrixVertexCalculator(config)));
    }
}

/** 
 * Calculates information about each tesselation slice along the angle.
 */
class SurfaceAngleStepCalculator implements IndexedGeometrySliceVertexCalculator {
    private readonly vertexCalculator: ConeVertexCalculator;

    constructor(vertexCalculator: ConeVertexCalculator) {
        this.vertexCalculator = vertexCalculator;
    }

    /** Number of tesselation triangles per angle step. */
    get triangleCount() {
        return 1;
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

        out_vertexIndices[outIdx++] = startSliceVertexIdx;
        out_vertexIndices[outIdx++] = endSliceVertexIdx + 1;
        out_vertexIndices[outIdx++] = startSliceVertexIdx + 1;
    }
}

class ConeSurface extends
    IndexedSurface<GeneratrixVertexCalculator, SurfaceAngleStepCalculator>
{
    constructor(vertexCoords: ConeCoords) {
        super(
            vertexCoords,
            new SurfaceAngleStepCalculator(
                vertexCoords.vertexCalculator),
            vertexCoords.vertexCalculator.slice.config.surfaceMaterial);
    }
}

/** Calculates information about each generatrix line along the angle. */
class WireframeAngleStepCalculator implements IndexedGeometrySliceVertexCalculator {
    private readonly vertexCalculator: ConeVertexCalculator;

    constructor(vertexCalculator: ConeVertexCalculator) {
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

class ConeWireframe extends
    IndexedLineSegments<GeneratrixVertexCalculator, WireframeAngleStepCalculator>
{
    constructor(vertexCoords: ConeCoords) {
        super(
            vertexCoords,
            new WireframeAngleStepCalculator(
                vertexCoords.vertexCalculator),
            vertexCoords.vertexCalculator.slice.config.wireframeMaterial);
    }
}

/**
 * Calculates coordinates for connecting the end of a slice that terminates at
 * an integer step of the `sliceParameter`, and the boundary of the 3D object
 * at a `sliceParameter` which doesn't correspond to an integer step.
 *
 * For the cone, a connecting slice is one triangle.
 */
export class ConeConnectingSliceVertexCalculator extends
    ConnectingSliceVertexCalculator<GeneratrixVertexCalculator>
{
    readonly slice: null;

    constructor(
        readonly vertexCoords: SurfaceVertexCoords<VertexCalculator<GeneratrixVertexCalculator>>,
    ) {
        super(null);
    }

    get sliceCount(): number {
        return 1;
    }

    get sharedVertexCount() {
        return 0;
    }

    get vertexCount() {
        return 4;
    }

    /**
     * We calculate vertices, and normals only when the sliceIdx, and
     * sliceParameter are updated.
     */
    calculateVertices(
        vertexWriter: VertexWriter<VertexAndNormal>
    ) { }

    updateVertices(
        sliceIdx: number,
        sliceParameter: number,
        vertexWriter: VertexWriter<VertexAndNormal>,
        vertexStartIdx = this.sharedVertexCount
    ) {
        const slice = this.vertexCoords.vertexCalculator.slice;
        const parameterAtSlice =
            this.vertexCoords.vertexCalculator.slice.sliceParameterRange.atStep(sliceIdx);

        // We need to recalculate the first vertex of the generatrix at
        // sliceIdx to get a correct normal direction for the vertex at the
        // apex (using the correct slice parameter step). Instead of
        // implementing separate calculation for that vertex, we recalculate
        // the whole generatrix, as well as the terminating generatrix.
        //
        // We're unnecessarily calculating 1 vertex here. This should have
        // minimal impact on performance.

        // We arrange the vertices in the same way they would be arranged in
        // the complete solid's vertices array.
        slice.calculateVertices(
            sliceParameter, vertexWriter, vertexStartIdx);
        slice.calculateVertices(
            parameterAtSlice,
            vertexWriter,
            vertexStartIdx + 2,
            sliceParameter - parameterAtSlice);
    }
}

class ConnectingSliceConeCoords extends
    ConnectingSliceVertexCoords<GeneratrixVertexCalculator>
{
    constructor(vertexCoords: ConeCoords) {
        super(new ConeConnectingSliceVertexCalculator(vertexCoords));
    }
}

class ConnectingSliceSurface extends
    IndexedConnectingSliceSurface<GeneratrixVertexCalculator, SurfaceAngleStepCalculator>
{
    constructor(
        connectingSliceCoords: ConnectingSliceConeCoords,
        surfaceToroidalStepCalculator: SurfaceAngleStepCalculator
    ) {
        super(
            connectingSliceCoords,
            surfaceToroidalStepCalculator,
            connectingSliceCoords.vertexCalculator.vertexCoords.vertexCalculator.slice.config.surfaceMaterial);
    }
}

class ConnectingSliceWireframe extends
    IndexedConnectingSliceLineSegments<GeneratrixVertexCalculator, WireframeAngleStepCalculator>
{
    constructor(
        connectingSliceCoords: ConnectingSliceConeCoords,
        wireframeToroidalStepCalculator: WireframeAngleStepCalculator
    ) {
        super(
            connectingSliceCoords,
            wireframeToroidalStepCalculator,
            connectingSliceCoords.vertexCalculator.vertexCoords.vertexCalculator.slice.config.wireframeMaterial);
    }
}

export class ArchytasCone {
    readonly surface: ConeSurface;
    readonly wireframe: ConeWireframe;
    readonly connectingSliceSurface: ConnectingSliceSurface;
    readonly lineQt: Line;
    readonly lineAt: Line;
    readonly ptQ = new ColumnVector3();
    readonly ptT = new ColumnVector3();
    private readonly coords: ConeCoords;
    private readonly connectingSliceCoords: ConnectingSliceConeCoords;
    private readonly connectingSliceWireframe: ConnectingSliceWireframe;
    readonly sceneObject: THREE.Object3D;
    private _oapAngleCompliment_rad = Math.PI / 4;

    constructor(private readonly config: ConeConfiguration) {
        this.coords = new ConeCoords(config);
        this.surface = new ConeSurface(this.coords);
        this.wireframe = new ConeWireframe(this.coords);
        this.connectingSliceCoords = new ConnectingSliceConeCoords(
            this.coords);
        this.connectingSliceSurface = new ConnectingSliceSurface(
            this.connectingSliceCoords, this.surface.slice);
        this.connectingSliceWireframe = new ConnectingSliceWireframe(
            this.connectingSliceCoords, this.wireframe.slice);
        this.updatePts(this._oapAngleCompliment_rad);
        this.lineQt = new Line(
            config.lineQtMaterial,
            [this.ptQ, this.ptT]);
        this.lineAt = new Line(
            config.lineAtMaterial,
            [config.origin, this.ptT]);

        config.ptTLabel.localPosition = this.ptT;
        config.ptTLabel.sceneObjectWithMatrixWorld = this.lineAt.sceneObject;

        this.sceneObject = new THREE.Group().
            add(this.surface.mesh,
                this.connectingSliceSurface.mesh,
                this.wireframe.line,
                this.connectingSliceWireframe.line,
                this.lineQt.sceneObject,
                this.lineAt.sceneObject);
    }

    set oapAngleCompliment_rad(value: number) {
        if (value == this._oapAngleCompliment_rad) {
            return;
        }
        if (this.config.oapAngleCompliment_rad.includes(value)) {
            const stepIdx = this.config.oapAngleCompliment_rad.lastIncludedStepIdx(value);

            this.surface.drawEndSliceIndex = stepIdx;
            this.wireframe.drawEndSliceIndex = stepIdx > 0 ? stepIdx + 1 : stepIdx;
            this.connectingSliceCoords.sliceParameter = value;
            this.updatePts(value);
            this.lineQt.updateVertex(0, this.ptQ).
                updateVertex(1, this.ptT).
                commitUpdates();
            this.lineAt.updateVertex(1, this.ptT).
                commitUpdates();
            this.updateLabelPositions();
            this._oapAngleCompliment_rad = value;
        } else {
            console.error(
                `Angle ${value} rad out of bounds [${this.config.oapAngleCompliment_rad.start} rad; ${this.config.oapAngleCompliment_rad.end} rad]`);
        }
    }

    private updatePts(oapAngleCompliment_rad: number) {
        const oapAngle_rad = Math.PI / 2 - oapAngleCompliment_rad;
        const slice = this.coords.vertexCalculator.slice;
        const centralAngle_rad =
            slice.centralAngleForAngleOAP_rad(oapAngle_rad);
        const lenAq =
            this.config.cylinderRadius * (1.0 + Math.cos(2.0 * oapAngle_rad));

        slice.vertexOnAxisAtHeight(lenAq, this.ptQ);
        slice.vertexAtCentralAngleAndHeight(centralAngle_rad, lenAq, this.ptT);
    }

    private updateLabelPositions() {
        this.config.labelPositioner.
            positionLabel(this.config.ptTLabel);
    }
}
