import * as React from 'react';
import { getOffsetFromElementTop, getOffsetFromWindowTop } from './dom_element_offset';


export const FootnoteContext = React.createContext<FootnoteUpdater>(null);

class FootnoteUpdaterBodyFootmarkRefObject implements React.RefObject<HTMLElement> {
    private index = -1;

    constructor(
        private readonly footnoteUpdater: FootnoteUpdater
    ) { }

    get current(): HTMLElement {
        if (this.index >= 0) {
            return this.footnoteUpdater.bodyFootmarks[this.index];
        } else {
            return null;
        }
    }

    set current(node: HTMLElement) {
        if (node == null) {
            if (this.index >= 0) {
                this.footnoteUpdater.removeBodyFootmark(this.index);
            }
            this.index = -1;
            return;
        }
        if (this.index < 0) {
            this.index = this.footnoteUpdater.addBodyFootmark(node);
        } else {
            this.footnoteUpdater.replaceBodyFootmark(this.index, node);
        }
    }
}

class FootnoteUpdaterFootnoteRefObject implements React.RefObject<HTMLDivElement> {
    private index = -1;

    constructor(
        private readonly footnoteUpdater: FootnoteUpdater
    ) { }

    get current(): HTMLDivElement {
        if (this.index >= 0) {
            return this.footnoteUpdater.footnotes[this.index];
        } else {
            return null;
        }
    }

    set current(node: HTMLDivElement) {
        if (node == null) {
            if (this.index >= 0) {
                this.footnoteUpdater.removeFootnote(this.index);
            }
            this.index = -1;
            return;
        }
        if (this.index < 0) {
            this.index = this.footnoteUpdater.addFootnote(node);
        } else {
            this.footnoteUpdater.replaceFootnote(this.index, node);
        }
    }
}

export class FootnoteUpdater {
    readonly children = new Array<React.JSX.Element>();
    readonly bodyFootmarks = new Array<HTMLElement>();
    readonly footnotes = new Array<HTMLDivElement>();
    private handleWindowScroll: (() => void);
    private bodyContainer: HTMLDivElement = null;
    private footnoteContainer: HTMLElement = null;
    private footnoteList: HTMLElement = null;

    constructor() {
        const self = this;

        this.handleWindowScroll = () => {
            self.handleScroll();
        };
    }

    get footnoteCount(): number {
        return this.children.length;
    }

    setBodyContainer(value: HTMLDivElement): this {
        this.bodyContainer = value;

        if (value == null) {
            window.removeEventListener('scroll', this.handleWindowScroll);
        } else {
            window.addEventListener('scroll', this.handleWindowScroll);
            this.handleScroll();
        }

        return this;
    }

    setFootnoteContainer(value: HTMLElement): this {
        this.footnoteContainer = value;

        return this;
    }

    setFootnoteList(value: HTMLElement): this {
        this.footnoteList = value;

        return this;
    }

    addChild(footnote: React.JSX.Element) {
        this.children.push(footnote);
    }

    addBodyFootmark(footmark: HTMLElement): number {
        const result = this.bodyFootmarks.length;

        this.bodyFootmarks.push(footmark);

        return result;
    }

    replaceBodyFootmark(index: number, footmark: HTMLElement) {
        this.bodyFootmarks[index] = footmark;
    }

    removeBodyFootmark(index: number) {
        this.bodyFootmarks.splice(index, 1);
    }

    addFootnote(footnote: HTMLDivElement): number {
        const result = this.footnotes.length;

        this.footnotes.push(footnote);

        return result;
    }

    replaceFootnote(index: number, footnote: HTMLDivElement) {
        this.footnotes[index] = footnote;
    }

    removeFootnote(index: number) {
        this.footnotes.splice(index, 1);
    }

    getFootmarkInViewStartIdx(viewStartY: number, viewEndY: number): number {
        let startI = 0;
        let endI = this.bodyFootmarks.length;
        let foundInView = false;

        while (startI < endI) {
            const midI = Math.floor((startI + endI) / 2);

            const mark = this.bodyFootmarks[midI];
            const markStartY = getOffsetFromElementTop(mark, this.bodyContainer);
            const markEndY = markStartY + mark.offsetHeight;

            if (markEndY < viewStartY) {
                startI = midI + 1;
            } else if (markStartY > viewEndY) {
                if (midI < endI) {
                    endI = midI;
                } else {
                    break;
                }
            } else {
                // The footnote mark is in view. We want the first such one:
                foundInView = true;
                if (midI + 1 < endI) {
                    endI = midI + 1;
                } else {
                    return midI;
                }
            }
        }

        return startI < endI && foundInView ? startI : -1;
    }

    getFootmarkInViewEndIdx(
        viewStartY: number, viewEndY: number, searchStartIdx: number = 0
    ): number {
        let startI = searchStartIdx;
        let endI = this.bodyFootmarks.length;
        let foundInView = false;

        while (startI < endI) {
            const midI = Math.floor((startI + endI) / 2);

            const mark = this.bodyFootmarks[midI];
            const markStartY = getOffsetFromElementTop(mark, this.bodyContainer);
            const markEndY = markStartY + mark.offsetHeight;

            if (markEndY < viewStartY) {
                startI = midI + 1;
            } else if (markStartY > viewEndY) {
                if (midI < endI) {
                    endI = midI;
                } else {
                    break;
                }
            } else {
                // The footnote mark is in view. We want the last such one:
                foundInView = true;
                if (startI < midI) {
                    startI = midI;
                } else {
                    return midI;
                }
            }
        }

        return startI < endI && foundInView ? startI : -1;
    }

    getFootmarkRangeHeight_px(startIdx: number, endIdx: number): number {
        const startY = this.footnotes[startIdx].offsetTop;
        const endFootnote = this.footnotes[endIdx];
        const endY = endFootnote.offsetTop + endFootnote.offsetHeight;

        // Add 2px to avoid errors due to rounding down:
        return endY - startY + 2;
    }

    getViewStartYEndY(): [number, number] {
        const offsetFromWindowTop = getOffsetFromWindowTop(this.bodyContainer);
        const startYFromWindowTop = offsetFromWindowTop + parseFloat(getComputedStyle(this.bodyContainer).borderTopWidth);
        const startY = Math.max(0, window.scrollY - startYFromWindowTop);
        const endYFromWindowTop = Math.min(
            window.scrollY + window.innerHeight,
            startYFromWindowTop + this.bodyContainer.clientHeight);

        return [startY, endYFromWindowTop - offsetFromWindowTop];
    }

    getFootnotesInViewMinY(footmarkStartIdx: number): number {
        const firstFootmarkInView = this.bodyFootmarks[footmarkStartIdx];
        const computedStyle = getComputedStyle(firstFootmarkInView.parentElement);
        const fontSize = parseFloat(computedStyle.fontSize);
        const lineHeightStr = computedStyle.lineHeight;
        const lineHeight = lineHeightStr.endsWith('px') ? parseFloat(lineHeightStr) : 1.2 * fontSize;
        const footmarkLineCnt = Math.floor((firstFootmarkInView.offsetHeight + lineHeight / 2 + Number.EPSILON) / lineHeight);
        const footmarksMinY =
            getOffsetFromElementTop(firstFootmarkInView, this.bodyContainer) +
            Math.max(lineHeight * footmarkLineCnt, firstFootmarkInView.offsetHeight);

        return footmarksMinY + 1;
    }

    dockFootnotes() {
        this.footnoteContainer.classList.remove('in-view');
        this.footnoteList.style.height = '100%';
        this.footnoteList.style.removeProperty('width');
    }

    handleScroll() {
        if (this.bodyContainer == null || this.footnoteContainer == null) {
            return;
        }

        const [viewStartY, viewEndY] = this.getViewStartYEndY();
        const footmarkStartIdx = this.getFootmarkInViewStartIdx(viewStartY, viewEndY);

        if (footmarkStartIdx < 0) {
            this.dockFootnotes();
            return;
        }

        const footmarkEndIdx = this.getFootmarkInViewEndIdx(
            viewStartY, viewEndY, footmarkStartIdx);

        const footnotesInViewMaxHeightStr = getComputedStyle(this.footnoteContainer).maxHeight;
        const footnotesInViewMaxHeight = parseFloat(footnotesInViewMaxHeightStr) || Infinity;
        const footmarksInViewHeight =
            Math.min(
                this.getFootmarkRangeHeight_px(footmarkStartIdx, footmarkEndIdx),
                footnotesInViewMaxHeight
            );
        const footmarksMinY = this.getFootnotesInViewMinY(footmarkStartIdx);
        const footnoteListTopMargin =
            getOffsetFromElementTop(this.footnoteList, this.footnoteContainer);
        const footmarksY = Math.max(
            footmarksMinY,
            viewEndY - footmarksInViewHeight - footnoteListTopMargin);
        this.footnoteContainer.classList.remove('in-view');
        const footnotesContainerStartY =
            getOffsetFromElementTop(this.footnoteContainer, this.bodyContainer);
        const firstFootnoteInView = this.footnotes[footmarkStartIdx];

        if (footmarksY >= footnotesContainerStartY) {
            this.dockFootnotes();
        } else {
            this.footnoteContainer.classList.add('in-view');

            const foonnoteListHeight = viewEndY - footmarksY - footnoteListTopMargin;

            this.footnoteList.style.height = `${foonnoteListHeight}px`;
            this.footnoteList.scrollTo({ top: firstFootnoteInView.offsetTop, behavior: 'smooth' });
        }
    }
}

export function Footnote(props: { children: Iterable<React.ReactNode> }): React.JSX.Element {
    const { children } = props;
    const footnoteUpdater = React.useContext(FootnoteContext);
    const footnoteRef = new FootnoteUpdaterFootnoteRefObject(footnoteUpdater);
    const bodyFootmarkRef = new FootnoteUpdaterBodyFootmarkRefObject(footnoteUpdater);

    footnoteUpdater.addChild(
        <div ref={(node) => { footnoteRef.current = node; }} className="footnote"
            key={footnoteUpdater.footnoteCount}><span className="footnote-foot-mark"></span>{children}</div>);

    return <BodyFootMark outputRef={(node) => { bodyFootmarkRef.current = node; }} />;
}

export function BodyFootMark(props: { outputRef: React.Ref<HTMLElement> }): React.JSX.Element {
    const { outputRef: ref } = props;

    return <span ref={ref} className="body-foot-mark"></span>;
}