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
}

export interface ExportCode {
    type: ExportType;
    name: string;
    code: string;
    classFunctions?: ClassFunction[];
    importDeclares?: Record<string, string[]>;
    localDeclares?: string;
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
    externalIdentifiers: string[];
};
