import { describe, expect, test } from '@jest/globals';
import { throwIf } from '../src/ts/throw_if';

describe('assert module', () => {
    test('Continues on true assertion', () => {
        throwIf(true);
    });
    test('Throws on false assertion', () => {
        expect(() => throwIf(false)).toThrow();
    });
});