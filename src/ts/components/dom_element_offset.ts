export function getOffsetFromWindowTop(element: Element): number {
    return element.getBoundingClientRect().top + window.scrollY;
}

export function getOffsetFromElementTop(
    element: Element, referenceElement: Element
): number {
    return element.getBoundingClientRect().y -
        referenceElement.getBoundingClientRect().y;
}
