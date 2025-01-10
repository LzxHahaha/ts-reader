export interface DependData {
    // declare string
    text: string;
    module: string;
}

export interface ExtractOptions {
    skipDependencies?: boolean;
}

export enum CodeType {
    Function,
    Class,
    ClassMember,
    TypeDefine,
}

export interface CodeBaseInfo {
    type: CodeType;
    name: string;
    linesRange: [number, number];
    functions?: { name: string, linesRange: [number, number] }[];
}

export interface CodeMeta {
    type: CodeType;
    name: string;
    body: string;
    externalIdentifiers: string[];
    classFunctions?: ClassFunction[];
    linesRange: [number, number];
}

export interface CodeDetailData {
    type: CodeType;
    name: string;
    code: string;
    classFunctions?: ClassFunction[];
    importDeclares?: Record<string, Declare[]>;
    localDeclares?: string;
    linesRange: [number, number];
}

export interface Declare {
    name: string;
    declare: string;
}

export interface ClassStructure {
    name: string;
    type: string;
    ext: string;
    impl: string;
    body: [name: string, declareStr: string][];
    functions: ClassFunction[];
}

export interface ClassFunction {
    name: string;
    body: string;
    isProp: boolean;
    isStatic: boolean;
    scope: string;
    externalIdentifiers: string[];
    linesRange: [number, number];
};
