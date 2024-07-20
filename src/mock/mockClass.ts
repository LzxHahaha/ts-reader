import { InterfaceA, InterfaceAny, variableA } from './mockTypes';

export class A {
    public a: number = 1;
    public b: boolean;
    private c?: string;
    protected d: number;

    constructor(public e: number, private f?: number, g?: boolean) {
        this.b = e > 5;
        this.d = g ? 1 : 1;
    }

    static Val = 123;

    static Foo() {
        return A.Val;
    }

    get FFF() {
        return this.f;
    }

    set FFF(v) {
        this.f = v;
    }

    public foooo(v: InterfaceA) {
        this.barrrr(v);
        return v.func(this.a);
    }

    private barrrr(input: InterfaceAny) {
        console.log(input);
    }

    protected protectedBar() {
        console.log(Math.max(this.a, variableA));
    }
}

export class B extends A implements InterfaceA, InterfaceAny {
    readonly v = 123;

    func(...args: any[]) {
        console.log(args);
    }

    foo = async (a: number, c: InterfaceAny): Promise<boolean> => {
        return a > c.a;
    }

    bar() {
        super.foooo(this);
    }
}