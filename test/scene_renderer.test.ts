/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { Label, LabelPositioner } from '../src/ts/three_scene_renderer';
import { ColumnVector2, ColumnVector3 } from '../src/ts/geometry/vectors_and_matrices';


describe('scene_renderer module', () => {
    describe('LabelPositioner class', () => {
        test('positionLabel sets expected HTML element position', () => {
            // Setup:
            const fieldOfView_deg = 45;
            const viewportWidth_px = 200;
            const viewportHeight_px = 100;
            const renderMinDistanceFromCamera = 0.1;
            const renderMaxDistanceFromCamera = 1000;
            const camera = new THREE.PerspectiveCamera(
                fieldOfView_deg,
                viewportWidth_px / viewportHeight_px,
                renderMinDistanceFromCamera,
                renderMaxDistanceFromCamera);
            // Set the camera projection plane to be parallel to the x-y plane,
            // and set the camera view center point to the origin:
            camera.position.set(0, 0, -1);
            camera.lookAt(0, 0, 0);
            const labelPositioner = new LabelPositioner(camera, viewportWidth_px, viewportHeight_px);

            const labelElement = document.createElement('div');
            labelElement.style.width = '30px';
            labelElement.style.height = '10px';
            const labelRelativeOffset = new ColumnVector2(-0.5, -1.5);
            const labelPositionInScene = new ColumnVector3(1, 2, 0);
            const labelReferenceObject = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-1, -1, 0),
                    new THREE.Vector3(1, 1, 0),
                ])
            );
            const testLabel = new Label(
                labelElement, labelRelativeOffset, labelPositionInScene,
                labelReferenceObject);

            // Act:
            labelPositioner.positionLabel(testLabel);

            // Assert:
            const style = window.getComputedStyle(labelElement);

            expect(style.left).toBe('-21px');
            expect(style.top).toBe('291px');
        });
    });
});