import * as React from 'react';
import { EllipticalArcParameters, EllipticalArcVertexCalculator } from '../geometry/plane_objects';
import { ColumnVector } from '../geometry/vectors_and_matrices';

const EPS = 1e-15;


type SvgPathIntersectEllipseT = React.SVGProps<SVGPathElement> & React.SVGProps<SVGEllipseElement>;
export interface EllipticalArcProps<Dim extends 2 | 3> extends SvgPathIntersectEllipseT {
    config: EllipticalArcParameters<Dim>
}

export function EllipticalArc<Dim extends 2 | 3>(
    props: EllipticalArcProps<Dim>
) {
    const { config, ...pathProps } = props;

    const xAxisAngle_rad = Math.atan2(
        config.plane.xHat.getComponent(1),
        config.plane.xHat.getComponent(0));
    const xAxisAngle_deg = xAxisAngle_rad / Math.PI * 180;

    if (Math.abs(config.circularAngle_rad.size) >= 2.0 * Math.PI - EPS) {
        const cx = config.origin.getComponent(0);
        const cy = config.origin.getComponent(1);
        const transform = `rotate(${xAxisAngle_deg},${cx},${cy})`;

        return <ellipse
            cx={cx} cy={cy} rx={config.semiXAxis} ry={config.semiYAxis}
            transform={transform} {...pathProps} />;
    }

    const vertexCalculator = new EllipticalArcVertexCalculator<Dim>(
        config);
    const vertex = vertexCalculator.calculatedVertexStorage;

    vertexCalculator.calculateVertex(config.circularAngle_rad.start, vertex);

    const startX = vertex.getComponent(0);
    const startY = vertex.getComponent(1);

    vertexCalculator.calculateVertex(config.circularAngle_rad.end, vertex);

    const endX = vertex.getComponent(0);
    const endY = vertex.getComponent(1);

    const largeArcFlag = config.circularAngle_rad.size >= Math.PI ? 1 : 0;

    let sweepInRightDirection = config.circularAngle_rad.end >= config.circularAngle_rad.start;

    if (!config.plane.isXyProjectionInRightDirection()) {
        sweepInRightDirection = !sweepInRightDirection;
    }

    const sweepFlag = sweepInRightDirection ? 1 : 0;

    const d = `M${startX},${startY}` +
        `A${config.semiXAxis},${config.semiYAxis},${xAxisAngle_deg},${largeArcFlag},${sweepFlag},${endX},${endY}`;

    return <path d={d} {...pathProps} />;
}


export interface LineProps<Dim extends 2 | 3> extends
    React.SVGProps<SVGPathElement> {
    vertices: Array<ColumnVector<Dim>>
}

export function Line<Dim extends 2 | 3>(
    props: LineProps<Dim>
) {
    const { vertices, ...pathProps } = props;

    let d = '';
    for (let i = 0; i < vertices.length; ++i) {
        if (i < 1) {
            d += 'M';
        } else if (i == 1) {
            d += 'L';
        } else {
            d += ' ';
        }

        const vertex = vertices[i];

        d += `${vertex.getComponent(0)},${vertex.getComponent(1)}`;
    }

    return <path d={d} {...pathProps} />;
}


export interface PointMarkProps<Dim extends 2 | 3> extends
    React.SVGProps<SVGPathElement> {
    location: ColumnVector<Dim>
}

export function PointMark<Dim extends 2 | 3>(
    props: PointMarkProps<Dim>
) {
    const { location, className, ...pathProps } = props;

    // We make a zero-length line, and use line-cap styling to style it.
    const d = `M${location.getComponent(0)},${location.getComponent(1)}h0`;
    const newClassName = 'point-mark' + (className ? ` ${className}` : '');

    return <path d={d} className={newClassName} {...pathProps} />;
}

/**
 * Creates a `<link>` element to external CSS.
 *
 * @deprecated Warning: This is non-standard SVG. (Although, it can be useful
 * for debugging.)
 *
 * @param cssUrl - URL to the CSS to add.
 * @returns - The `<link>` element.
 */
export function CssLink(cssUrl: string) {
    return <link {...{ xmlns: "http://www.w3.org/1999/xhtml" }} rel="stylesheet" href={cssUrl} type="text/css" />;
}

export interface SceneProps extends React.SVGProps<SVGSVGElement> { }

export function Scene(props: SceneProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
        {props.children}
    </svg>;
}