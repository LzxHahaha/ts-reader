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