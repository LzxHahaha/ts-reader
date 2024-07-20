export interface DependData {
    // declare string
    text: string;
    module: string;
}

export interface ExportData {
    name: string;
    body: string;
    externalIdentifiers: string[];
}

export interface ExportCode {
    type: 'function' | 'class';
    name: string;
    code: string;
}

export interface ClassStructure {
    name: string;
    type: string;
    ext: string;
    impl: string;
    body: [name: string, declareStr: string][];
}
