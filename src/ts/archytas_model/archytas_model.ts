import * as THREE from 'three';

import { ArchytasBaseCircle, BaseCircleAngleRange, BaseCircleConfiguration } from './archytas_base_circle';
import { ArchytasTransverseCircle, TransverseCircleAngleRange, TransverseCircleConfiguration } from './archytas_transverse_circle';
import { ArchytasTorus, TorusConfiguration } from './archytas_torus';
import { ArchytasCone, ConeConfiguration } from './archytas_cone';
import { ArchytasCylinder, CylinderConfiguration } from './archytas_cylinder';
import { ConstStepRange, PlaneDirections } from '../geometry/parameters';
import { Color, Style } from '../style';
import { Label, ThreeSceneRenderer } from '../three_scene_renderer';
import { Line } from './tesselation_base';
import { ColumnVector, ColumnVector3 } from '../geometry/vectors_and_matrices';

export interface ArchytasModelLabels {
    readonly ptA: Label;
    readonly ptO: Label;
    readonly ptP: Label;
    readonly ptQ: Label;
    readonly ptR: Label;
    readonly ptS: Label;
    readonly ptT: Label;
}

class ArchytasModelMaterials {
    private static readonly dashSize = 0.15;
    private static readonly gapSize = 0.075;

    readonly background: THREE.Color;
    readonly torusSurface: THREE.MeshPhysicalMaterial;
    readonly torusWire: THREE.LineBasicMaterial;
    readonly cylinderSurface: THREE.MeshPhysicalMaterial;
    readonly cylinderWire: THREE.LineBasicMaterial;
    readonly coneSurface: THREE.MeshPhysicalMaterial;
    readonly coneWire: THREE.LineBasicMaterial;
    readonly baseCircle: THREE.LineDashedMaterial;
    readonly baseCircleDiameter: THREE.LineDashedMaterial;
    readonly lineAp: THREE.LineDashedMaterial;
    readonly linePq: THREE.LineDashedMaterial;
    readonly linePo: THREE.LineDashedMaterial;
    readonly transverseCircle: THREE.LineDashedMaterial;
    readonly transverseCircleDiameter: THREE.LineDashedMaterial;
    readonly lineRa: THREE.LineDashedMaterial;
    readonly lineRp: THREE.LineDashedMaterial;
    readonly lineRs: THREE.LineDashedMaterial;
    readonly lineRq: THREE.LineDashedMaterial;
    readonly lineQt: THREE.LineDashedMaterial;
    readonly lineAt: THREE.LineDashedMaterial;
    readonly debug: THREE.Color;

    constructor(style: Style) {
        this.background = style.colors.secondaryBg.toThreeJsColor();
        const surfaceOpacity = 0.5;

        this.torusSurface = new THREE.MeshPhysicalMaterial({
            color: style.colors.primary.toCssHex(),
            transparent: true,
            opacity: surfaceOpacity,
            side: THREE.DoubleSide
        });
        this.torusWire = new THREE.LineBasicMaterial({
            color: style.colors.primary.toCssHex(),
            transparent: true
        });
        this.cylinderSurface = new THREE.MeshPhysicalMaterial({
            color: style.colors.primaryVariant.toCssHex(),
            transparent: true,
            opacity: surfaceOpacity,
            side: THREE.DoubleSide
        });
        this.cylinderWire = new THREE.LineBasicMaterial({
            color: style.colors.primaryVariant.toCssHex(),
            transparent: true
        });
        this.coneSurface = new THREE.MeshPhysicalMaterial({
            color: style.colors.secondary.toCssHex(),
            transparent: true,
            opacity: surfaceOpacity,
            side: THREE.DoubleSide
        });
        this.coneWire = new THREE.LineBasicMaterial({
            color: style.colors.secondary.toCssHex(),
            transparent: true
        });
        this.baseCircle = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.mainThickness_px,
            style.lineStyles.mainIsDashed
        );
        this.baseCircleDiameter = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        this.lineAp = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        this.linePq = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        this.linePo = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        this.transverseCircle = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.mainThickness_px,
            style.lineStyles.mainIsDashed
        );
        this.transverseCircleDiameter = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        this.lineRa = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );

        this.lineRp = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        this.lineRs = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        this.lineRq = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        this.lineQt = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        this.lineAt = ArchytasModelMaterials.toLineMaterial(
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        this.debug = style.colors.error.toThreeJsColor();
    }

    update(style: Style) {
        this.background.set(style.colors.secondaryBg.toThreeJsColor());

        this.torusSurface.color.set(style.colors.primary.rgbInt);
        this.torusSurface.needsUpdate = true;
        this.torusWire.color.set(style.colors.primary.rgbInt);
        this.torusWire.needsUpdate = true;
        this.cylinderSurface.color.set(style.colors.primaryVariant.rgbInt);
        this.cylinderSurface.needsUpdate = true;
        this.cylinderWire.color.set(style.colors.primaryVariant.rgbInt);
        this.cylinderWire.needsUpdate = true;
        this.coneSurface.color.set(style.colors.secondary.rgbInt);
        this.coneSurface.needsUpdate = true;
        this.coneWire.color.set(style.colors.secondary.rgbInt);
        this.coneWire.needsUpdate = true;
        ArchytasModelMaterials.updateLineMaterial(
            this.baseCircle,
            style.colors.primaryFg,
            style.lineStyles.mainThickness_px,
            style.lineStyles.mainIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.baseCircleDiameter,
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.lineAp,
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.linePq,
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.linePo,
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.transverseCircle,
            style.colors.primaryFg,
            style.lineStyles.mainThickness_px,
            style.lineStyles.mainIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.transverseCircleDiameter,
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.lineRa,
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.lineRp,
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.lineRs,
            style.colors.primaryFg,
            style.lineStyles.auxiliaryThicknes_px,
            style.lineStyles.auxiliaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.lineRq,
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.lineQt,
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        ArchytasModelMaterials.updateLineMaterial(
            this.lineAt,
            style.colors.primaryFg,
            style.lineStyles.secondaryThickness_px,
            style.lineStyles.secondaryIsDashed
        );
        this.debug.set(style.colors.error.rgbInt);
    }

    private static toLineMaterial(
        color: Color, thickness_px: number, isDashed: boolean
    ): THREE.LineDashedMaterial {
        const params = {
            color: color.toCssHex(),
            linewidth: thickness_px,
        };
        return isDashed ?
            new THREE.LineDashedMaterial({
                ...params, dashSize: ArchytasModelMaterials.dashSize, gapSize: ArchytasModelMaterials.gapSize
            }) :
            new THREE.LineDashedMaterial({
                ...params, dashSize: 1, gapSize: 0
            });
    }

    private static updateLineMaterial(
        material: THREE.LineDashedMaterial, color: Color, thickness_px: number, isDashed: boolean
    ) {
        material.color.set(color.rgbInt);
        material.linewidth = thickness_px;
        if (isDashed) {
            material.dashSize = ArchytasModelMaterials.dashSize;
            material.gapSize = ArchytasModelMaterials.gapSize;
        } else {
            material.dashSize = 1;
            material.gapSize = 0;
        }
        material.needsUpdate = true;
    }
}

export class ArchytasModel {
    readonly origin: ColumnVector<3>;
    readonly circleR: number;
    readonly torus: ArchytasTorus;
    readonly cylinder: ArchytasCylinder;
    readonly cone: ArchytasCone;
    readonly baseCircle: ArchytasBaseCircle;
    readonly transverseCircle: ArchytasTransverseCircle;
    readonly lineRq: Line;
    readonly materials: ArchytasModelMaterials;
    private axesHelper: THREE.AxesHelper;

    constructor(
        readonly sceneRenderer: ThreeSceneRenderer,
        style: Style,
        readonly labels: ArchytasModelLabels
    ) {
        this.origin = new ColumnVector3(0, 0, 0);
        this.circleR = 2.0;

        // Colors, and materials:
        this.materials = new ArchytasModelMaterials(style);
        this.scene.background = this.materials.background;

        const angleOapComplimentRange = ConstStepRange.radRangeFromStartEndDegStepCount(0, 90, 90 / 5);
        const flipX = new THREE.Matrix4().makeScale(-1, 1, 1);
        const ptC = this.origin.clone().add(new ColumnVector3(this.circleR, 0, 0));

        this.torus = new ArchytasTorus(new TorusConfiguration(
            this.materials.torusSurface,
            this.materials.torusWire,
            this.origin,
            this.circleR,
            new PlaneDirections<3>(new ColumnVector3(0, 0, -1), new ColumnVector3(-1, 0, 0)),
            angleOapComplimentRange));
        this.torus.sceneObject.applyMatrix4(flipX);
        this.scene.add(this.torus.sceneObject);

        this.cylinder = new ArchytasCylinder(new CylinderConfiguration(
            this.materials.cylinderSurface,
            this.materials.cylinderWire,
            ptC,
            this.circleR,
            new PlaneDirections<3>(new ColumnVector3(1, 0, 0), new ColumnVector3(0, 0, -1)),
            angleOapComplimentRange));
        this.scene.add(this.cylinder.sceneObject);

        const apexAngle_rad = 120.0 / 180 * Math.PI;
        this.cone = new ArchytasCone(new ConeConfiguration(
            this.materials.coneSurface,
            this.materials.coneWire,
            this.materials.lineQt,
            this.materials.lineAt,
            labels.ptT,
            sceneRenderer.labelPositioner,
            this.origin,
            new PlaneDirections<3>(new ColumnVector3(0, 0, -1), new ColumnVector3(0, 1, 0)),
            true,
            apexAngle_rad,
            this.circleR / Math.cos(apexAngle_rad / 2),
            this.circleR
        ));
        this.scene.add(this.cone.sceneObject);

        this.baseCircle = new ArchytasBaseCircle(new BaseCircleConfiguration(
            this.materials.baseCircle,
            this.materials.baseCircleDiameter,
            this.materials.lineAp,
            this.materials.linePq,
            this.materials.linePo,
            labels.ptA,
            labels.ptO,
            labels.ptP,
            labels.ptQ,
            sceneRenderer.labelPositioner,
            this.origin,
            new PlaneDirections<3>(new ColumnVector3(-1, 0, 0), new ColumnVector3(0, 0, -1)),
            new BaseCircleAngleRange(angleOapComplimentRange),
            this.circleR
        ));
        this.scene.add(this.baseCircle.sceneObject);

        this.transverseCircle = new ArchytasTransverseCircle(new TransverseCircleConfiguration(
            this.materials.transverseCircle,
            this.materials.transverseCircleDiameter,
            this.materials.lineRa,
            this.materials.lineRp,
            this.materials.lineRs,
            labels.ptR,
            labels.ptS,
            sceneRenderer.labelPositioner,
            this.origin,
            this.baseCircle.config.plane,
            new TransverseCircleAngleRange(angleOapComplimentRange),
            this.circleR));
        this.scene.add(this.transverseCircle.sceneObject);

        this.lineRq = new Line(
            this.materials.lineRq,
            [this.transverseCircle.ptR, this.baseCircle.ptQ]);
        this.scene.add(this.lineRq.sceneObject);

        sceneRenderer.labels.push(
            labels.ptA, labels.ptO, labels.ptP, labels.ptQ, labels.ptR,
            labels.ptS, labels.ptT);
    }

    get scene() {
        return this.sceneRenderer.scene;
    }

    set angleOapCompliment_rad(value: number) {
        this.torus.toroidalAngle_rad = value;
        this.cylinder.secantAngle_rad = value;
        this.cone.oapAngleCompliment_rad = value;
        this.baseCircle.angleOapCompliment_rad = value;
        this.transverseCircle.angleOapCompliment_rad = value;

        this.lineRq.updateVertex(0, this.transverseCircle.ptR).
            updateVertex(1, this.baseCircle.ptQ).
            commitUpdates();
        this.updateLabelPositions(value);
    }

    updateLabelPositions(angleOapCompliment_rad: number) {
        // Unit parameter:
        const t = angleOapCompliment_rad / Math.PI * 2;

        this.labels.ptP.relativeOffset.setComponent(0, (1 - t) * (-0.85) + t * (+0.85));
        this.labels.ptQ.relativeOffset.setComponent(0, (1 - t) * (+0.50) + t * (-0.50));
        this.labels.ptR.relativeOffset.setComponent(0,
            (0.5 - t) * (1.0 - t) * (+0.85) * 2 +
            (0.0 - t) * (1.0 - t) * (+0.50) * (-4) +
            (0.0 - t) * (0.5 - t) * (+0.00) * 2);
        this.labels.ptS.relativeOffset.setComponent(0, (1 - t) * (+0.00) + t * (-0.85));
        this.labels.ptT.relativeOffset.setComponent(0,
            (0.5 - t) * (1.0 - t) * (+0.00) * 2 +
            (0.0 - t) * (1.0 - t) * (-0.50) * (-4) +
            (0.0 - t) * (0.5 - t) * (+0.00) * 2);

        return this;
    }

    setStyle(style: Style) {
        this.materials.update(style);

        this.scene.background = this.materials.background;
    }

    /** For debugging. */
    addArrow(
        destinationVec: ColumnVector<3>,
        originVec = this.origin,
        colorSpec = this.materials.debug
    ) {
        const deltaVec = destinationVec.clone().subtract(originVec);
        const dirVec = deltaVec.clone().normalizeColumnVectors();
        const arrow = new THREE.ArrowHelper(
            dirVec.toThreeJs(), originVec.toThreeJs(), deltaVec.vectorLength, colorSpec);

        this.scene.add(arrow);
    }
}
