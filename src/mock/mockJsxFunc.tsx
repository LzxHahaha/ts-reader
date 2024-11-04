// @ts-nocheck
import React, { useState } from 'react';

export const MockJsx = () => {
    const [count, setCount] = useState(0);
    return (
        <div id="1">
            <h1>MockJsx: {count}</h1>
            <button onClick={() => setCount(c => c + 1)}>Inc</button>
        </div>
    );
};