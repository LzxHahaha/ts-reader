import { ClassDeclaration, ExportedDeclarations, SyntaxKind } from "ts-morph";
import { ExportData, ExportType } from "./index.type";
import { getClassDeclaration } from "./declares";

export function extractClass(name: string, declaration: ExportedDeclarations): ExportData | undefined {
    const kind = declaration.getKind();
    if (kind !== SyntaxKind.ClassDeclaration) {
        return;
    }
    const decalreString = getClassDeclaration(declaration as ClassDeclaration);
    const res = {
        type: ExportType.Class,
        name: name,
        body: `declare ${decalreString}`,
        functions: [],
        externalIdentifiers: []
    };
    return res;
}
