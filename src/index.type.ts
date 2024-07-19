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

export interface FunctionCode {
    type: 'function' | 'class';
    name: string;
    code: string;
}
