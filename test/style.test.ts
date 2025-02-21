import { describe, expect, test } from '@jest/globals';
import { Color } from '../src/ts/style';
import * as THREE from 'three';

describe('style module', () => {
    describe('Color class', () => {
        describe('fromCssColor', () => {
            test('parses \'#RGB\'', () => {
                const testColor = Color.fromCssColor('#123');

                expect(testColor.r).toBe(0x11);
                expect(testColor.g).toBe(0x22);
                expect(testColor.b).toBe(0x33);
                expect(testColor.a).toBe(255);
            });
            test('parses \'#RGBA\'', () => {
                const testColor = Color.fromCssColor('#1234');

                expect(testColor.r).toBe(0x11);
                expect(testColor.g).toBe(0x22);
                expect(testColor.b).toBe(0x33);
                expect(testColor.a).toBe(0x44);
            });
            test('parses \'#RRGGBB\'', () => {
                const testColor = Color.fromCssColor('#102a3b');

                expect(testColor.r).toBe(0x10);
                expect(testColor.g).toBe(0x2a);
                expect(testColor.b).toBe(0x3b);
                expect(testColor.a).toBe(255);
            });
            test('parses \'#RRGGBBAA\'', () => {
                const testColor = Color.fromCssColor('#102a3b4c');

                expect(testColor.r).toBe(0x10);
                expect(testColor.g).toBe(0x2a);
                expect(testColor.b).toBe(0x3b);
                expect(testColor.a).toBe(0x4c);
            });
            test('throws on invalid \'#value\'', () => {
                expect(() => Color.fromCssColor('#ghi')).toThrowError(Error);
                expect(() => Color.fromCssColor('#12g')).toThrowError(Error);
                expect(() => Color.fromCssColor('#12')).toThrowError(Error);
                expect(() => Color.fromCssColor('#')).toThrowError(Error);
            });
            test('throws on empty input', () => {
                expect(() => Color.fromCssColor('')).toThrowError(Error);
            });
            test('throws on unsupported \'rgba(...)\' input', () => {
                // Not supported:
                expect(() => Color.fromCssColor('rgba(1,2,3,4)')).toThrowError(Error);
            });
        });
        describe('rgbInt', () => {
            test('Returns a hex triplet', () => {
                expect(Color.fromCssColor('#aabbcc').rgbInt).toBe(0xaabbcc);
            });
        });
        describe('rgbaInt', () => {
            test('Returns a hex quadruplet', () => {
                expect(Color.fromCssColor('#aabbccdd').rgbaInt).toBe(0xaabbccdd);
            });
        });
        describe('toThreeJsColor', () => {
            test('Returns a THREE.Color', () => {
                const testColor = Color.fromCssColor('#112233').toThreeJsColor();
                const expected = new THREE.Color(0x112233);

                expect(testColor.r).toBe(expected.r);
                expect(testColor.g).toBe(expected.g);
                expect(testColor.b).toBe(expected.b);
            });
        });
        describe('toCssHex', () => {
            test('Returns an \'#RRGGBB\' color', () => {
                expect(Color.fromCssColor('#aabbcc').toCssHex()).toEqual('#aabbcc');
            });
            test('Returns an \'#RRGGBBAA\' color', () => {
                expect(Color.fromCssColor('#aabbccdd').toCssHex()).toEqual('#aabbccdd');
            });
        });
    });
});