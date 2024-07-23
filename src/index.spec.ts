import { read, getCode } from '.';
import path from 'path';

function mockFile(p: string) {
    return path.resolve(__dirname, p.endsWith('.ts') ? p : `${p}.ts`);
}

describe('read function files', () => {
    it('read function only file', async () => {
        const res = await read(mockFile('./mock/mockFuncOnly'));
        expect(res.length).toBe(2);
        expect(res[0].name).toBe('funcOnly');
        expect(getCode(res[0])).toBe(`declare module './mockTypes' {
interface InterfaceA {func:(...args: any[]) => void;foo:(a: number, c: InterfaceAny) => Promise<boolean>;bar()=>void;bar2?()=>void;}
interface InterfaceAny {}
 enum EnumA {A='1',B='2'}
}
declare const innerVar:{ a: { b: number; }; c: number; d: ({ aa: number; bb: number; } | { aa: number; bb?: undefined; })[]; };
declare function innerFunc():string;
export function funcOnly(input: InterfaceA): InterfaceAny {
    const { func } = input;
    func(innerVar.a.b);
    return {
        [EnumA.A]: innerFunc()
    };
}`);

        expect(res[1].name).toBe('funcOnly2');
        expect(getCode(res[1])).toBe(`declare module './mockTypes' {
interface InterfaceB {val:string;optionalVal?:number[];otherInterface:InterfaceA;}
interface InterfaceAny {}
 enum EnumA {A='1',B='2'}
 const enum EnumB {C=1,D=2}
}
const funcOnly2 = (input: InterfaceB): InterfaceAny => {
    function funcInFunc(v: number) {
        return 'funcInFunc' + v;
    }

    input.optionalVal?.forEach((el, index) => {
        funcInFunc(el + index);
    });

    if (input.optionalVal?.some(el => el > 0)) {
        const bbb = 123;
        return {
            [EnumA.B]: bbb + EnumB.C
        };
    }

    return {
        a: 1
    };
}`);
    });

    it('read export default function', async () => {
        const funcs = await read(mockFile('./mock/defaultFunc'));
        expect(funcs.length).toBe(1);
        expect(getCode(funcs[0])).toBe(`export default function () {
    console.log('123')
}`);
    });

    it('read export default arrow function', async () => {
        const funcs = await read(mockFile('./mock/defaultArrowFunc'));
        expect(funcs.length).toBe(1);
        expect(getCode(funcs[0])).toBe(`declare module './mockTypes' {
const variableA:number;
}
export default () => variableA`);
    });

    it('read export default named function', async () => {
        const funcs = await read(mockFile('./mock/defaultNamedFunc'));
        expect(funcs.length).toBe(1);
        expect(getCode(funcs[0])).toBe(`export default function Foo() {
    console.log(123);
}`);
    });

    it('read export default named arrow function', async () => {
        const funcs = await read(mockFile('./mock/defaultNamedArrowFunc'));
        expect(funcs.length).toBe(1);
        expect(getCode(funcs[0])).toBe(`const foo = () => {
    console.log(123);
}`);
    });

    it('read template function', async () => {
        const res = await read(mockFile('./mock/templateFunc'));
        expect(getCode(res[0])).toBe(`declare module './mockTypes' {
interface InterfaceT {v:T;}
}
export function Tmpl<T>(v: T): InterfaceT<T> {
    return { v };
}`);
    });
});

describe('read class files', () => {
    it('read class only file', async () => {
        const res = await read(mockFile('./mock/mockClass.ts'));
        expect(res.length).toBe(2);
        expect(res[0].name).toBe('A');
        expect(getCode(res[0])).toBe(`declare class A {
constructor(public e: number, private f?: number, g?: boolean);
public a: number = 1;
public b: boolean;
private c?: string;
protected d: number;
static Val = 123;
static Foo():number;
get FFF():number;
set FFF(v:any):void;
public foooo(v:InterfaceA):void;
private barrrr(input:InterfaceAny):void;
protected protectedBar():void;
}`);

        expect(res[1].name).toBe('B');
        expect(getCode(res[1])).toBe(`declare class B extends A implements InterfaceA, InterfaceAny {
readonly v = 123;
func(...args:any[]):void;
foo = async (a: number, c: InterfaceAny): Promise<boolean> => {
        return a > c.a;
    }
bar():void;
}`);
    });

    it('read template class file', async () => {
        const res = await read(mockFile('./mock/templateClass.ts'));
        expect(res.length).toBe(2);
        expect(res[0].name).toBe('A');
        expect(getCode(res[0])).toBe(`declare class A<T,K> {
v1?: T;
v2?: K;
}`);
        expect(res[1].name).toBe('B');
        expect(getCode(res[1])).toBe(`declare class B<U = number> extends A<InterfaceA, U> {
ov!: number;
}`)
    });
});