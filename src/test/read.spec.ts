import { read, getCode } from '..';
import path from 'path';

function mockFile(p: string) {
    return path.resolve(__dirname, '..', p.endsWith('.ts') ? p : `${p}.ts`);
}

describe('read function files', () => {
    it('read function only file', async () => {
        const res = await read(mockFile('./mock/mockFuncOnly'));
        //         expect(res.length).toBe(2);
        //         expect(res[0].name).toBe('funcOnly');
        //         expect(getCode(res[0])).toBe(`declare module './mockTypes' {
        // interface InterfaceA {func:(...args: any[]) => void;foo:(a: number, c: InterfaceAny) => Promise<boolean>;bar()=>void;bar2?()=>void;t:InterfaceT<string>;}
        // interface InterfaceAny {}
        //  enum EnumA {A='1',B='2'}
        // }
        // declare const innerVar:{ a: { b: number; }; c: number; d: ({ aa: number; bb: number; } | { aa: number; bb?: undefined; })[]; };
        // declare function innerFunc():string;
        // export function funcOnly(input: InterfaceA): InterfaceAny {
        //     const { func } = input;
        //     func(innerVar.a.b);
        //     return {
        //         [EnumA.A]: innerFunc()
        //     };
        // }`);

        expect(res[1].name).toBe('funcOnly2');
        expect(getCode(res[1])).toBe(`declare module './mockTypes' {
interface InterfaceB {val:string;optionalVal?:number[];otherInterface:InterfaceA;}
interface InterfaceA {func:(...args: any[]) => void;foo:(a: number, c: InterfaceAny) => Promise<boolean>;bar()=>void;bar2?()=>void;t:InterfaceT<string>;}
interface InterfaceAny {}
 enum EnumA {A='1',B='2'}
 const enum EnumB {C=1,D=2}
}
export interface InterfaceT<T> {
    v: T;
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
export default  () => variableA`);
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
        expect(getCode(res[0])).toBe(`export interface InterfaceT<T> {
    v: T;
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
        expect(getCode(res[0])).toBe(`declare module './mockTypes' {
interface InterfaceA {func:(...args: any[]) => void;foo:(a: number, c: InterfaceAny) => Promise<boolean>;bar()=>void;bar2?()=>void;t:InterfaceT<string>;}
interface InterfaceAny {}
const variableA:number;
}
export interface InterfaceT<T> {
    v: T;
}
declare class A {
constructor(public e: number, private f?: number, g?: boolean);
public a:number;
public b:boolean;
private c?:string;
protected d:number;
static Val:number;
static Foo():number;
get FFF():number;
set FFF(v:any):void;
public foooo(v:InterfaceA):void;
private barrrr(input:InterfaceAny):void;
protected protectedBar(val:number):void;
}`);
        expect(res[0].classFunctions?.length).toBe(4);
        expect(res[0].classFunctions?.[0]).toEqual({
            name: 'Foo',
            scope: 'public',
            body: `static Foo() {
        return A.Val;
    }`,
            isProp: false,
            isStatic: true,
            externalIdentifiers: new Map(),
            linesRange: [16, 18]
        });
        expect(res[0].classFunctions?.[1]).toEqual({
            name: 'foooo',
            scope: 'public',
            body: `public foooo(v: InterfaceA) {
        this.barrrr(v);
        return v.func(this.a);
    }`,
            isProp: false,
            isStatic: false,
            externalIdentifiers: new Map([
                ['InterfaceA', `export interface InterfaceA {
    func: (...args: any[]) => void;
    foo: (a: number, c: InterfaceAny) => Promise<boolean>;
    bar(): void;
    bar2?(): void;
    t: InterfaceT<string>;
}`],
                ['InterfaceAny', `export interface InterfaceAny {
    [key: string]: any;
}`],
                ['InterfaceT', `export interface InterfaceT<T> {
    v: T;
}`]]),
            linesRange: [28, 31]
        });

        expect(res[1].name).toBe('B');
        expect(res[1].classFunctions?.length).toBe(10);
        expect(res[1].classFunctions?.[0]).toEqual({
            name: 'func',
            scope: 'public',
            body: `func(...args: any[]) {
        console.log(args);
    }`,
            isProp: false,
            isStatic: false,
            externalIdentifiers: new Map(),
            linesRange: [49, 51]
        });
        expect(res[1].classFunctions?.[1]).toEqual({
            name: 'foo',
            scope: 'public',
            body: `foo = async (a: number, c: InterfaceAny): Promise<boolean> => {
        return a > c.a;
    }`,
            isProp: true,
            isStatic: false,
            externalIdentifiers: new Map([['InterfaceAny', `export interface InterfaceAny {
    [key: string]: any;
}`]]),
            linesRange: [53, 55]
        });
        expect(res[1].classFunctions?.[5]).toEqual({
            name: 'bar',
            scope: 'public',
            body: `bar() {
        super.foooo(this);
        this.protectedBar(this.d);
    }`,
            isProp: false,
            isStatic: false,
            externalIdentifiers: new Map(),
            linesRange: [70, 73]
        });

        expect(getCode(res[1])).toBe(`declare module './mockTypes' {
interface InterfaceA {func:(...args: any[]) => void;foo:(a: number, c: InterfaceAny) => Promise<boolean>;bar()=>void;bar2?()=>void;t:InterfaceT<string>;}
interface InterfaceAny {}
const variableA:number;
}
declare class A {
constructor(public e: number, private f?: number, g?: boolean);
public a:number;
public b:boolean;
private c?:string;
protected d:number;
static Val:number;
static Foo():number;
get FFF():number;
set FFF(v:any):void;
public foooo(v:InterfaceA):void;
private barrrr(input:InterfaceAny):void;
protected protectedBar(val:number):void;
}
export interface InterfaceT<T> {
    v: T;
}
declare function attr(value:any):any;
declare class B extends A implements InterfaceA, InterfaceAny {
readonly v0:123;
readonly v1:number;
@attr v2:number;
func(...args:any[]):void;
foo: (a: number,c: InterfaceAny) => Promise<boolean>;
fooA: (a: number) => boolean;
fooB: (a: number) => Promise<boolean>;
@attr fooC: (a: number) => number;
bar():void;
barA():boolean;
@attr barB():boolean;
barC?:() => void;
barD!:() => void;
}`);
    });

    it('read template class file', async () => {
        const res = await read(mockFile('./mock/templateClass.ts'));
        expect(res.length).toBe(2);
        expect(res[0].name).toBe('A');
        expect(getCode(res[0])).toBe(`declare class A<T,K> {
v1?:T;
v2?:K;
}`);
        expect(res[1].name).toBe('B');
        expect(getCode(res[1])).toBe(`declare module './mockTypes' {
interface InterfaceA {func:(...args: any[]) => void;foo:(a: number, c: InterfaceAny) => Promise<boolean>;bar()=>void;bar2?()=>void;t:InterfaceT<string>;}
}
declare class A<T,K> {
v1?:T;
v2?:K;
}
export interface InterfaceAny {
    [key: string]: any;
}
export interface InterfaceT<T> {
    v: T;
}
declare class B<U = number> extends A<InterfaceA, U> {
ov!:number;
}`)
    });
});