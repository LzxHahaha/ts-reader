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
}

export interface ExportCode {
    type: ExportType;
    name: string;
    code: string;
    importDeclares?: Record<string, string[]>;
    localDeclares?: string;
}

export interface ClassStructure {
    name: string;
    type: string;
    ext: string;
    impl: string;
    body: [name: string, declareStr: string][];
}
