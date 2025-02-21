import * as THREE from 'three';

/** For debugging. */
export class VertexDisplay {
    private readonly inspectGeometry: THREE.BufferGeometry;
    private readonly wireframeMaterial: THREE.Material;

    readonly sceneObject: THREE.Object3D;
    readonly vertexCount: number;
    private readonly visualizationGeometry: THREE.BufferGeometry;
    private readonly useIndex: boolean;

    constructor(
        inspectGeometry: THREE.BufferGeometry,
        useIndex = false,
        wireframeMaterial = new THREE.LineBasicMaterial({ color: 'red' })
    ) {
        this.inspectGeometry = inspectGeometry;
        this.useIndex = useIndex;
        this.wireframeMaterial = wireframeMaterial;

        this.vertexCount = this.inspectGeometry.getAttribute('position').count;

        this.visualizationGeometry = new THREE.BufferGeometry().
            setAttribute('position', this.inspectGeometry.getAttribute('position'));

        if (this.useIndex) {
            this.visualizationGeometry.setIndex(
                this.inspectGeometry.getIndex());
        }

        this.sceneObject = new THREE.Line(
            this.visualizationGeometry, this.wireframeMaterial);
    }

    get vertexSequenceLength() {
        if (this.useIndex) {
            const indexAttribute = this.inspectGeometry.getIndex();

            if (indexAttribute) {
                return indexAttribute.count;
            }
        }

        return this.inspectGeometry.getAttribute('position').count;
    }

    set endVertexIdx(value: number) {
        console.debug(`Showing vertices up to index ${value}.`);
        this.visualizationGeometry.setDrawRange(0, value + 1);
    }
}