import { InterfaceA } from "./mockTypes";

export class A<T, K> {
    v1?: T;
    v2?: K;
}

export class B<U = number> extends A<InterfaceA, U> {
    ov!: number;
}