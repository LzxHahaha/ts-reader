import { ExportedDeclarations, SyntaxKind } from "ts-morph";
import { ExportData } from "./index.type";

export function extractFunction(name: string, declaration: ExportedDeclarations): ExportData | undefined {
    const kind = declaration.getKind();
    if (kind !== SyntaxKind.ClassDeclaration) {
        return;
    }
    // TODO
    const res = {
        name: name,
        body: declaration.getText(),
        externalIdentifiers: []
    };
    return res;
}
