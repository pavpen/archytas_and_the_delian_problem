import * as THREE from 'three';

import { EllipticalArcParameters, EllipticalArcVertexCalculator } from '../geometry/plane_objects';

import {
    LineVertexCoords,
    VerticesAsLine
} from './tesselation_base';


export class EllipseArc extends VerticesAsLine<EllipticalArcVertexCalculator<3>> {
    constructor(
        config: EllipticalArcParameters<3>, material: THREE.Material
    ) {
        super(
            new LineVertexCoords<EllipticalArcVertexCalculator<3>>(
                new EllipticalArcVertexCalculator<3>(
                    config)),
            material
        );
    }
}