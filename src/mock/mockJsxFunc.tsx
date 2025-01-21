// @ts-nocheck
import React, { useState, useRef } from 'react';

export const MockJsx = () => {
    const [count, setCount] = useState(0);
    const divRef = useRef<HTMLDivElement>(null);
    return (
        <div id="1">
            <h1>MockJsx: {count}</h1>
            <button onClick={() => setCount(c => c + 1)}>Inc</button>
        </div>
    );
};

interface FooProps {
    a?: number;
    b?: string;
}

export const FooA = (props: FooProps) => {
    const [count, setCount] = useState(0);
    const divRef = useRef<HTMLDivElement>(null);
    return (
        <div id="1">
            <h1>MockJsx: {count}</h1>
            <button onClick={() => setCount(c => c + 1)}>Inc</button>
        </div>
    );
};

export function FooB({ a, b }: { a?: number, b?: string }) {
    return <div>a: {a}; b: {b}</div>
}

export const FooC = ({ c }: { a?: number, b?: string } & FooProps) => {
    return <div>c: {c}</div>
}