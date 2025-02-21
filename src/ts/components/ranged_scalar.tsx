import * as React from 'react';

export function RangedScalar(
    props: React.HTMLProps<HTMLDivElement> & {
        id: string,
        min: number,
        max: number,
        step?: number,
        value: number,
        setValue: (newValue: number | ((oldValue: number) => number)) => void
        label: string,
        units?: string,
        invertedDirection?: boolean,
    }
) {
    const {
        id, className, min, max, step, value, setValue, label, units,
        invertedDirection, ...mainProps } = props;
    const stepValue = step ? step : 'any';
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);

        setValue(newValue);
    };

    return <div
        id={id}
        {...mainProps}
        className={`${className} range-control-container ${invertedDirection ? 'inverted-range-direction' : ''}`}
    >
        <label htmlFor={`${id}-value`}>{label}</label>{' '}
        <input id={`${id}-value`} type="number" min={min} max={max} step={stepValue}
            value={value} onInput={handleChange} />
        {units && <span>&thinsp;{units}</span>}
        <input type="range" min={min} max={max} value={value} step={stepValue}
            onInput={handleChange} />
    </div>;
}
