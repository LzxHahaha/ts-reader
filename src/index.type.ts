export interface DependData {
    // declare string
    text: string;
    module: string;
}

export interface FunctionData {
    name: string;
    body: string;
    externalIdentifiers: string[];
}