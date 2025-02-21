import * as React from 'react';
import { FootnoteContext, FootnoteUpdater } from './footnote';

export function Article(props: { children: Iterable<React.ReactNode> }): React.JSX.Element {
    const { children } = props;
    const footnoteUpdater = new FootnoteUpdater();

    return <div className="article-container">
        <div ref={(node) => { footnoteUpdater.setBodyContainer(node); }} className="article" onScroll={() => footnoteUpdater.handleScroll()}>
            <div className="text-body">
                <FootnoteContext.Provider value={footnoteUpdater}>
                    {children}
                </FootnoteContext.Provider>
            </div>
            <div ref={(node) => { footnoteUpdater.setFootnoteContainer(node); }} className="footnote-container">
                <div>
                    <div className="footnotes-start"></div>
                    <div ref={(node) => { footnoteUpdater.setFootnoteList(node); }} className="footnotes">
                        {footnoteUpdater.children}
                    </div>
                </div>
            </div>
        </div>
    </div>;
}
