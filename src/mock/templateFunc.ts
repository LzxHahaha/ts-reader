import { InterfaceT } from "./mockTypes";

export function Tmpl<T>(v: T): InterfaceT<T> {
    return { v };
}