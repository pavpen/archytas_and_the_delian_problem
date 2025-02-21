import * as React from 'react';

export function Accordion(
    props: React.HTMLProps<HTMLDivElement> & {
        id: string,
        label: string,
    }
) {
    const { id, className, label, children, ...mainProps } = props;

    return <div id={id} {...mainProps} className={`${className} accordion-container`}>
        <div className="accordion-item">
            <input type="checkbox" id={`${id}-toggle`} />
            <label className="accordion-item-label" htmlFor={`${id}-toggle`}>{label}</label>
            <div className="accordion-item-content">
                {children}
            </div>
        </div>
    </div>
}
