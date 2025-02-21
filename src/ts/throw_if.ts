export function throwIf(condition: boolean, message?: string): typeof condition extends true ? void : unknown {
    if (!condition) {
        throw new Error(message);
    }
    return;
}
