export const moduleVar: string = 'A';

export function moduleFunc(input: ModuleInterface) {
    return input.a ? input.a : `v=${input.b}`;
}

export const enum moduleEnumA {
    A = 'a',
    B = 'b',
}

export enum moduleEnumB {
    AA = '1',
    BB = '2',
}

export interface ModuleInterface {
    a: string;
    b: number;
}


export class BaseClass<T> {
    static baseStaticMethod(): void { }
}

interface MyInterface {
    doSomething(): void;
}

export class MyClass extends BaseClass<number> implements MyInterface {
    private secret?: number;
    protected semiSecret!: number;
    public explicitPublic: number = 1;
    public explicitPublic2?: number;
    public explicitPublic3!: number;

    constructor(public implicitlyPublic: number) {
        super();
    }

    public myMethod(a: string): ModuleInterface {
        return { a, b: 1 };
    }

    static myStaticProperty: string;
    static myStaticMethod(): void { }

    public get readonlyProperty(): string {
        return 'read-only' + this.secret;
    }

    public set writeonlyProperty(value: number) {
        this.secret = value;
    }

    doSomething() {
        console.log('do something');
    }
}

