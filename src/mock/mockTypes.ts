export interface InterfaceA {
    func: (...args: any[]) => void;
    foo: (a: number, c: InterfaceAny) => Promise<boolean>;
    bar(): void;
    bar2?(): void;
}

export interface InterfaceB {
    val: string;
    optionalVal?: number[];
    otherInterface: InterfaceA;
}

export interface InterfaceAny {
    [key: string]: any;
}

export interface InterfaceT<T> {
    v: T;
}

export type TypeA = InterfaceA | number;

export enum EnumA {
    A = '1',
    B = '2',
}

export const enum EnumB {
    C = 1,
    D = 2,
}

export const variableA = 1;