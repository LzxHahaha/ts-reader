export interface DependData {
    // declare string
    text: string;
    module: string;
}

export enum ExportType {
    Function,
    Class
}

export interface ExportData {
    type: ExportType;
    name: string;
    body: string;
    externalIdentifiers: string[];
    classFunctions?: ClassFunction[];
    linesRange: [number, number];
}

export interface ExportCode {
    type: ExportType;
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
