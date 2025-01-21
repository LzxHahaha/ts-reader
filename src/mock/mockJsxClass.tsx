// @ts-ignore
import React from 'react';

// for test
class Component<P> {
    props: P;
}

interface FooPropsBase {
    a?: number;
    b?: string;
}

type FooProps = FooPropsBase & {
    c?: boolean;
}

export class FooA extends Component<FooProps> {
    render() {
        return (
            <div id="1">
                <h1>MockJsxClass</h1>
            </div>
        );
    }
}

export class FooB extends Component<{ a?: number, b?: string }> {
    render() {
        return (
            <div id="1">
                <h1>MockJsxClass</h1>
            </div>
        );
    }
}
