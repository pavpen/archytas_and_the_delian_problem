import * as React from 'react';
import { PlaneDirections, ValueRange } from '../geometry/parameters';
import { EllipticalArcConfigCalculator, EllipticalArcParameters, EllipticalArcVertexCalculator, MutableEllipticalArcParameters } from '../geometry/plane_objects';
import { CameraTransform } from '../geometry/projections';
import { ColumnVector } from '../geometry/vectors_and_matrices';
import * as Components from './components';


/**
 * Calculates the bounding box of an SVG element in user coordinates (e.g.,
 * after it's been rendered, and styled).
 * 
 * @param svgElement - Rendered SVG element for which to calculate the
 *     bounding box. 
 * @returns The bounding box of the SVG element in user coordinates, excluding
 *     stroke width.
 */
export function svgCalculateBoundingBox(svgElement: SVGElement): BoundingBox2 {
    const result = new BoundingBox2(Infinity, Infinity, -Infinity, -Infinity);

    for (let n of svgElement.children) {
        if (n instanceof SVGGraphicsElement) {
            const box = n.getBBox();

            result.addPoint(box.x, box.y);
            result.addPoint(box.x + box.width, box.y + box.height);
        }
    }

    return result;
}

export function sceneToReactElement<Dim extends 2 | 3>(scene: SvgScene<Dim>): React.JSX.Element {
    const handleRender = (node: SVGSVGElement) => {
        if (node) {
            const bbox = svgCalculateBoundingBox(node);
            node.setAttribute('viewbox', scene.calculateViewBox(bbox).toViewBoxStr());
        }
    };
    const bbox = scene.getSkeletonBoundingBox();
    const result = scene.toElement({ ref: handleRender, viewBox: scene.calculateViewBox(bbox).toViewBoxStr() });

    return result;
}

function defaultPlane<Dim extends 2 | 3>(
    clonableVector: ColumnVector<Dim>
): PlaneDirections<Dim> {
    const zeroVec: ColumnVector<Dim> = clonableVector.clone();

    // Zero the z component, if present:
    zeroVec.subtract(zeroVec);

    const yHat: ColumnVector<Dim> = zeroVec.clone();

    yHat.setComponent(0, 0);
    yHat.setComponent(1, 1);

    const xHat = zeroVec;

    xHat.setComponent(0, 1);
    xHat.setComponent(1, 0);

    return new PlaneDirections(xHat, yHat);
}


function cameraProjectedPlane<Dim extends 2 | 3>(
    plane: PlaneDirections<Dim>,
    untransformedOrigin: ColumnVector<Dim>,
    transformedOrigin: ColumnVector<Dim>,
    cameraTransform: CameraTransform<Dim>
): PlaneDirections<Dim> {
    return new PlaneDirections(
        cameraTransform.project(plane.xHat.clone().add(untransformedOrigin)).
            subtract(transformedOrigin),
        cameraTransform.project(plane.yHat.clone().add(untransformedOrigin)).
            subtract(transformedOrigin));
}

/**
 * Returns the value closest to `targetValue` which is in the range
 * [`rangeStart`, `rangeEnd`].
 *
 * @param rangeStart - Lower boundary of the range.
 * @param rangeEnd - Upper boundary of the range.
 * @param targetValue - Value we're trying to get closest to.
 * @returns The closest value to `targetValue` in
 *     [`rangeStart`, `rangeEnd`].
 */
function valueFromRangeClosestTo(
    rangeStart: number, rangeEnd: number, targetValue: number
): number {
    if (targetValue > rangeStart) {
        // Does the range include the target value:
        if (targetValue - rangeStart <= rangeEnd - rangeStart) {
            return targetValue;
        } else {
            return rangeEnd;
        }
    } else {
        return rangeStart;
    }
}


/** A 2-D bounding box. */
export class BoundingBox2 {
    static forPoint(x: number, y: number) {
        return new BoundingBox2(x, y, x, y);
    }

    private _minX: number;
    private _minY: number;
    private _maxX: number;
    private _maxY: number;

    constructor(
        minX: number, minY: number, maxX: number, maxY: number
    ) {
        this._minX = minX;
        this._minY = minY;
        this._maxX = maxX;
        this._maxY = maxY;
    }

    set(minX: number, minY: number, maxX: number, maxY: number) {
        this._minX = minX;
        this._minY = minY;
        this._maxX = maxX;
        this._maxY = maxY;
    }

    setToPoint(x: number, y: number) {
        this._minX = x;
        this._minY = y;
        this._maxX = x;
        this._maxY = y;
    }

    get minX() {
        return this._minX;
    }

    get minY() {
        return this._minY;
    }

    get maxX() {
        return this._maxX;
    }

    get maxY() {
        return this._maxY;
    }

    get width(): number {
        return this.maxX - this.minX;
    }

    get height(): number {
        return this.maxY - this.minY;
    }

    clone(): BoundingBox2 {
        return new BoundingBox2(
            this.minX, this.minY, this.maxX, this.maxY);
    }

    add(addend: BoundingBox2): this {
        this._minX = Math.min(this._minX, addend.minX);
        this._minY = Math.min(this._minY, addend.minY);
        this._maxX = Math.max(this._maxX, addend.maxX);
        this._maxY = Math.max(this._maxY, addend.maxY);

        return this;
    }

    addPoint(x: number, y: number): this {
        this._minX = Math.min(this._minX, x);
        this._minY = Math.min(this._minY, y);
        this._maxX = Math.max(this._maxX, x);
        this._maxY = Math.max(this._maxY, y);

        return this;
    }

    toViewBoxStr() {
        return `${this.minX} ${this.minY} ${this.width} ${this.height}`;
    }
}


export interface SceneObject<Dim extends 2 | 3> {
    toElement(
        props?: React.SVGProps<SVGElement>,
        projection?: CameraTransform<Dim>
    ): React.JSX.Element;

    /**
     * Returns the bounding box the scene would have, if all stroke widths
     * were 0, and there were no labels.
     *
     * @remarks
     * 
     * Stroke widths, and text can be (and usually are) styled by CSS.
     * Therefore, we cannot get an accurate bounding box for these parameters
     * from the information we have in the scene (i.e., before the scene is
     * rendered).
     * 
     * @param cameraTransform - Transform to apply to the scene before
     *     calculating the bounding box. The scene remains unchanged by this
     *     method.
     */
    getSkeletonBoundingBox(cameraTransform?: CameraTransform<Dim>): BoundingBox2;
};


export type SceneTextProps = React.SVGProps<SVGTextElement>;

export class SceneText<Dim extends 2 | 3> implements SceneObject<Dim> {
    static atPoint<Dim extends 2 | 3>(
        location: ColumnVector<Dim>,
        text: string,
        props: SceneTextProps = {}
    ): SceneText<Dim> {
        return new SceneText(location, text, props);
    }

    private readonly _boundingBox: BoundingBox2 | null;

    constructor(
        readonly location: ColumnVector<Dim>,
        readonly text: string,
        readonly props: SceneTextProps
    ) {
        this._boundingBox = new BoundingBox2(
            location.getComponent(0), location.getComponent(1),
            location.getComponent(0), location.getComponent(1));
    }

    toElement(
        props: SceneTextProps = {},
        cameraTransform?: CameraTransform<Dim>
    ): React.JSX.Element {
        const location = cameraTransform ?
            cameraTransform.project(this.location.clone()) :
            this.location;

        return React.createElement(
            'text',
            {
                ...this.props,
                ...props,
                x: location.getComponent(0),
                y: location.getComponent(1)
            },
            this.text);
    }

    getSkeletonBoundingBox(cameraTransform?: CameraTransform<Dim>): BoundingBox2 {
        if (cameraTransform) {
            const location = cameraTransform.project(this.location.clone());

            return BoundingBox2.forPoint(
                location.getComponent(0), location.getComponent(1));
        } else {
            return this._boundingBox;
        }
    }
}


type PointMarkProps<Dim extends 2 | 3> =
    Omit<Components.PointMarkProps<Dim>, 'location'>;

export class PointMark<Dim extends 2 | 3> implements SceneObject<Dim> {
    static fromPoint<Dim extends 2 | 3>(
        location: ColumnVector<Dim>,
        props: PointMarkProps<Dim> = {}
    ): PointMark<Dim> {
        return new PointMark(location, props);
    }

    private readonly _boundingBox: BoundingBox2 | null;

    constructor(
        readonly location: ColumnVector<Dim>,
        readonly props: PointMarkProps<Dim>
    ) {
        this._boundingBox = new BoundingBox2(
            location.getComponent(0), location.getComponent(1),
            location.getComponent(0), location.getComponent(1));
    }

    toElement(
        props: PointMarkProps<Dim> = {},
        cameraTransform?: CameraTransform<Dim>
    ): React.JSX.Element {
        const location = cameraTransform ?
            cameraTransform.project(this.location.clone()) :
            this.location;

        return Components.PointMark({ ...this.props, ...props, location });
    }

    getSkeletonBoundingBox(cameraTransform?: CameraTransform<Dim>): BoundingBox2 {
        if (cameraTransform) {
            const location = cameraTransform.project(this.location.clone());

            return BoundingBox2.forPoint(
                location.getComponent(0), location.getComponent(1));
        } else {
            return this._boundingBox;
        }
    }
}


type LineProps<Dim extends 2 | 3> =
    Omit<Components.LineProps<Dim>, 'vertices'>;

export class Line<Dim extends 2 | 3> implements SceneObject<Dim> {
    static fromVertices<Dim extends 2 | 3>(
        vertices: Array<ColumnVector<Dim>>,
        props: LineProps<Dim> = {}
    ): Line<Dim> {
        return new Line(vertices, props);
    }

    private _boundingBox: BoundingBox2 = null;

    constructor(
        readonly vertices: Array<ColumnVector<Dim>>,
        readonly props: LineProps<Dim>
    ) { }

    toElement(
        props: LineProps<Dim> = {},
        cameraTransform?: CameraTransform<Dim>
    ): React.JSX.Element {
        const vertices = cameraTransform ?
            this.vertices.map(v => cameraTransform.project(v.clone())) :
            this.vertices;

        return Components.Line(
            { ...this.props, ...props, vertices });
    }

    getSkeletonBoundingBox(cameraTransform?: CameraTransform<Dim>) {
        if (cameraTransform) {
            const vertices: Array<ColumnVector<Dim>> =
                this.vertices.map(v => cameraTransform.project(v.clone()));

            return this.boundingBoxForVertices(vertices);
        }

        if (this._boundingBox == null && this.vertices.length > 0) {
            this._boundingBox = this.boundingBoxForVertices(this.vertices);
        }

        return this._boundingBox;
    }

    private boundingBoxForVertices(vertices: Array<ColumnVector<Dim>>): BoundingBox2 {
        let i = 0;
        const vertex = vertices[i];
        const boundingBox = BoundingBox2.forPoint(
            vertex.getComponent(0), vertex.getComponent(1));

        const endI = vertices.length;
        for (i = 1; i < endI; ++i) {
            const vertex = vertices[i];

            boundingBox.addPoint(
                vertex.getComponent(0), vertex.getComponent(1));
        }

        return boundingBox;
    }
}


type EllipticalArcProps<Dim extends 2 | 3> =
    Omit<Components.EllipticalArcProps<Dim>, 'config'>;

export class EllipticalArc<Dim extends 2 | 3> implements SceneObject<Dim> {
    static fromCenterRadiusAngle<Dim extends 2 | 3>(
        center: ColumnVector<Dim>,
        radius: number,
        angle_rad: ValueRange,
        props: EllipticalArcProps<Dim> = {}
    ): EllipticalArc<Dim> {
        return new EllipticalArc(
            {
                origin: center,
                plane: defaultPlane(center),
                circularAngle_rad: angle_rad,
                semiXAxis: radius,
                semiYAxis: radius,
            },
            props);
    }

    static fromConfig<Dim extends 2 | 3>(
        config: EllipticalArcParameters<Dim>,
        props: EllipticalArcProps<Dim> = {}
    ): EllipticalArc<Dim> {
        return new EllipticalArc(config, props);
    }

    private readonly vertexCalculator: EllipticalArcVertexCalculator<Dim>;
    private _boundingBox: BoundingBox2 = null;
    private _calculatedConfig: MutableEllipticalArcParameters<Dim>;

    constructor(
        readonly config: EllipticalArcParameters<Dim>,
        readonly props: EllipticalArcProps<Dim>,
        private configCalculator: EllipticalArcConfigCalculator<Dim> = null
    ) {
        this.vertexCalculator =
            new EllipticalArcVertexCalculator<Dim>(config);
        this._calculatedConfig = {
            origin: config.origin.clone(),
            plane: config.plane.clone(),
            semiXAxis: config.semiXAxis,
            semiYAxis: config.semiYAxis,
            circularAngle_rad: config.circularAngle_rad.cloneAsMutable()
        };
    }

    pointAtCircularAngle_rad(circularAngle_rad: number): ColumnVector<Dim> {
        const vertex = this.vertexCalculator.calculatedVertexStorage;

        this.vertexCalculator.calculateVertex(circularAngle_rad, vertex);

        return vertex.clone();
    }

    pointAtCircularAngle_deg(circularAngle_deg: number): ColumnVector<Dim> {
        return this.pointAtCircularAngle_rad(circularAngle_deg / 180 * Math.PI);
    }

    xAtCircularAngle_rad(circularAngle_rad: number): number {
        return this.vertexCalculator.xAtCircularAngle_rad(circularAngle_rad);
    }

    yAtCircularAngle_rad(circularAngle_rad: number): number {
        return this.vertexCalculator.yAtCircularAngle_rad(circularAngle_rad);
    }

    get center() {
        return this.config.origin;
    }

    toElement(
        props: EllipticalArcProps<Dim> = {},
        cameraTransform?: CameraTransform<Dim>
    ): React.JSX.Element {
        const config: EllipticalArcParameters<Dim> = cameraTransform ?
            this.transformedConfig(this.config, cameraTransform) :
            this.config;

        return Components.EllipticalArc({ ...this.props, ...props, config });
    }

    getSkeletonBoundingBox(cameraTransform?: CameraTransform<Dim>) {
        if (cameraTransform) {
            return this.boundingBoxForConfig(
                this.transformedConfig(this.config, cameraTransform));
        }

        if (this._boundingBox == null) {
            this._boundingBox = this.boundingBoxForConfig(this.config);
        }

        return this._boundingBox;
    }

    private transformedConfig(
        config: EllipticalArcParameters<Dim>,
        cameraTransform: CameraTransform<Dim>
    ): EllipticalArcParameters<Dim> {
        const calculator = this.configCalculator ?
            this.configCalculator :
            new EllipticalArcConfigCalculator<Dim>(config.origin);

        return calculator.projectToCamera(
            config, cameraTransform, this._calculatedConfig);
    }

    private oldTransformedConfig(
        config: EllipticalArcParameters<Dim>,
        cameraTransform: CameraTransform<Dim>
    ): EllipticalArcParameters<Dim> {
        const origin = cameraTransform.project(config.origin.clone());
        const xPoint = origin.clone();

        xPoint.addScaled(config.plane.xHat, config.semiXAxis);
        cameraTransform.project(xPoint);

        const semiXAxis = xPoint.distanceTo(origin);

        const yPoint = origin.clone();

        yPoint.addScaled(config.plane.yHat, config.semiYAxis);
        cameraTransform.project(yPoint);

        const semiYAxis = yPoint.distanceTo(origin);

        const plane = cameraProjectedPlane(
            config.plane, config.origin, origin, cameraTransform);

        return {
            origin,
            plane,
            circularAngle_rad: config.circularAngle_rad,
            semiXAxis,
            semiYAxis
        };
    }

    private boundingBoxForConfig(config: EllipticalArcParameters<Dim>): BoundingBox2 {
        const semiXAxis = config.semiXAxis;
        const semiYAxis = config.semiYAxis;
        const xHatRotation_rad = Math.atan2(
            config.plane.xHat.getComponent(1), config.plane.xHat.getComponent(0));
        const maxXCircularAngle_rad = Math.atan2(
            -semiYAxis * Math.sin(xHatRotation_rad),
            semiXAxis * Math.cos(xHatRotation_rad));
        const minXCircularAngle_rad = (maxXCircularAngle_rad + Math.PI) % Math.PI;
        const maxYCircularAngle_rad = Math.atan2(
            semiYAxis * Math.cos(xHatRotation_rad),
            semiXAxis * Math.sin(xHatRotation_rad));
        const minYCircularAngle_rad = (maxYCircularAngle_rad + Math.PI) % Math.PI;
        const circularAngleStart_rad = config.circularAngle_rad.start % Math.PI;
        const circularAngleEnd_rad = circularAngleStart_rad + config.circularAngle_rad.size;

        const arcMinXCircularAngle_rad = valueFromRangeClosestTo(
            circularAngleStart_rad, circularAngleEnd_rad, minXCircularAngle_rad)
        const arcMinYCircularAngle_rad = valueFromRangeClosestTo(
            circularAngleStart_rad, circularAngleEnd_rad, minYCircularAngle_rad);
        const arcMaxXCircularAngle_rad = valueFromRangeClosestTo(
            circularAngleStart_rad, circularAngleEnd_rad, maxXCircularAngle_rad);
        const arcMaxYCircularAngle_rad = valueFromRangeClosestTo(
            circularAngleStart_rad, circularAngleEnd_rad, maxYCircularAngle_rad);

        const vertexCalculator =
            new EllipticalArcVertexCalculator<Dim>(config);

        return new BoundingBox2(
            vertexCalculator.xAtCircularAngle_rad(arcMinXCircularAngle_rad),
            vertexCalculator.yAtCircularAngle_rad(arcMinYCircularAngle_rad),
            vertexCalculator.xAtCircularAngle_rad(arcMaxXCircularAngle_rad),
            vertexCalculator.yAtCircularAngle_rad(arcMaxYCircularAngle_rad));
    }
}


type SvgSceneProps = Omit<Components.SceneProps, 'children'>;

export class SvgScene<Dim extends 2 | 3> implements SceneObject<Dim> {
    static withViewBox<Dim extends 2 | 3>(
        minX: number, maxY: number, width: number, height: number,
        cameraTransform?: CameraTransform<Dim>
    ) {
        return new SvgScene<Dim>(
            { viewBox: `${minX} ${maxY} ${width} ${height}` },
            cameraTransform);
    }

    static create<Dim extends 2 | 3>(
        props: SvgSceneProps = {},
        cameraTransform?: CameraTransform<Dim>
    ) {
        return new SvgScene<Dim>(props, cameraTransform);
    }

    private readonly exportedChildren = new Array<React.JSX.Element>();
    private readonly children = new Array<SceneObject<Dim>>();
    private _boundingBox: BoundingBox2 = null;

    constructor(
        private props: SvgSceneProps,
        readonly cameraTransform: CameraTransform<Dim>) { }

    add<ObjectT extends SceneObject<Dim>>(sceneObject: ObjectT): ObjectT {
        this.children.push(sceneObject);
        this._boundingBox = null;

        return sceneObject;
    }

    /**
     * Adds a `<link>` to external CSS.
     *
     * @deprecated Warning: This is non-standard SVG.
     *
     * @param cssUrl - URL to the CSS to link.
     */
    linkCss(cssUrl: string): void {
        const result = React.cloneElement(
            Components.CssLink(cssUrl),
            { key: this.exportedChildren.length }
        );

        this.exportedChildren.push(result);
    }

    fitViewBoxToContentWithPadding(
        paddingLeft: number,
        paddingRight: number = paddingLeft,
        paddingTop: number = paddingLeft,
        paddingBottom: number = paddingTop
    ) {
        this.viewBoxToBoxWithPadding(
            this.getSkeletonBoundingBox(this.cameraTransform),
            paddingLeft, paddingRight, paddingTop, paddingBottom);
    }

    viewBoxToBoxWithPadding(
        box: BoundingBox2,
        paddingLeft: number,
        paddingRight: number = paddingLeft,
        paddingTop: number = paddingLeft,
        paddingBottom: number = paddingTop
    ) {
        const minX = box.minX - paddingLeft;
        const minY = box.minY - paddingBottom;
        const maxX = box.maxX + paddingRight;
        const maxY = box.maxY + paddingTop;

        this.props.viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
    }

    setViewBox(value: BoundingBox2): this {
        this.props.viewBox = value.toViewBoxStr();

        return this;
    }

    toElement(
        props: SvgSceneProps = {},
        cameraTransform: CameraTransform<Dim> = this.cameraTransform
    ) {
        let key = this.exportedChildren.length;
        const children = new Array(
            this.exportedChildren,
            this.children.map(
                exportable => exportable.toElement({ key: key++ }, cameraTransform)));

        return Components.Scene({ ...this.props, ...props, children });
    }

    getSkeletonBoundingBox(
        cameraTransform: CameraTransform<Dim> = this.cameraTransform
    ): BoundingBox2 {
        if (cameraTransform || (this._boundingBox == null && this.children.length > 0)) {
            let boundingBox: BoundingBox2 | null;
            for (const child of this.children) {
                const childBox = child.getSkeletonBoundingBox(cameraTransform);

                if (childBox != null) {
                    if (boundingBox == null) {
                        boundingBox = childBox.clone();
                    } else {
                        boundingBox.add(childBox);
                    }
                }
            }

            if (cameraTransform) {
                return boundingBox;
            }

            this._boundingBox = boundingBox;
        }

        return this._boundingBox;
    }

    /**
     * Override this in derived classes to configure SVG element resize
     * handling.
     * 
     * The default view box uses padding which is 10% of the larger dimension
     * of the rendered SVG content.
     * 
     * @param boundingBox - The SVG bounding box for this scene calculated by
     *     the browser.  You can use {@link svgCalculateBoundingBox} to
     *     calculate this after an SVG element's been rendered.
     */
    calculateViewBox(boundingBox: BoundingBox2): BoundingBox2 {
        const largeDim = Math.max(boundingBox.width, boundingBox.height);
        const padding = largeDim * 0.10;

        return boundingBox.clone().
            addPoint(boundingBox.minX - padding, boundingBox.minY - padding).
            addPoint(boundingBox.maxX + padding, boundingBox.maxY + padding);
    }
}
