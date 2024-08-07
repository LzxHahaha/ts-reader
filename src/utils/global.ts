let tsSymbols = new Set([
    "Array",
    "ArrayBuffer",
    "Boolean",
    "DataView",
    "Date",
    "Error",
    "EvalError",
    "Float32Array",
    "Float64Array",
    "Function",
    "Infinity",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Map",
    "Number",
    "Object",
    "Promise",
    "RangeError",
    "ReferenceError",
    "RegExp",
    "Set",
    "String",
    "Symbol",
    "SyntaxError",
    "TypeError",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "URIError",
    "WeakMap",
    "WeakSet",
    "document",
    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "console",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape",
    "window",
    "Math",
    "JSON",
    "Reflect",
    "Proxy",
    "Intl",
    "WebAssembly",
    "super",
    "this",
    "global",
    "globalThis",
    "Record",
    "Pick",
    "Omit",
    "Exclude",
    "Extract",
    "NonNullable",
    "Parameters",
    "ConstructorParameters",
    "ReturnType",
    "InstanceType",
    "Required",
    "ThisType",
    "OmitThisParameter",
    "ThisParameterType",
]);

export function isTsSymbol(symbol: string): boolean {
    return !!tsSymbols?.has(symbol);
}

