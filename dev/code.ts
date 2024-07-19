import { moduleVar, moduleFunc, moduleEnumA, moduleEnumB, ModuleInterface, MyClass } from './module';

interface InnerInterface {
    value: string;
    name?: string;
    test?: (name: string) => Promise<string>;
}

const InnerConst = 'InnerConst';

function InnerFunc(v: string) {
    return `v:${v}`;
}

export function ExpFoo(input: ModuleInterface): InnerInterface {
    const val = moduleFunc(input);
    if (val === input.a) {
        return { value: InnerFunc(moduleVar), name: InnerConst };
    }
    return { value: moduleEnumA.A, name: moduleEnumB.AA };
}

function otherFunc() {
    return 'other';
}

export const foo = (mc: MyClass) => {
    mc.doSomething();
    return otherFunc();
};

export type Func = typeof ExpFoo | typeof otherFunc;
