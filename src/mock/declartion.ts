function fooA() {}

export function fooB() {}

const fooC = () => {};

export const fooD = () => {};

class clsA {}

export class clsB {}

const varA = 1;

export const varB = 2;

const clsC = class {};

function wrapClx(cls: any, v: any) {
    return class extends cls {
        v = v;
    }
}

export const clsD = wrapClx(clsC, 'd');

export const clsEF = wrapClx(wrapClx(clsC, 'e'), 'f');

export default () => {};

interface IA {}

export interface IB<T> {}

type TA = string;

export type TB = number;

export type TC = IB<TA>;

