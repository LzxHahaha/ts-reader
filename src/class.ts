import { ClassDeclaration, ExportedDeclarations, SyntaxKind } from "ts-morph";
import { ExportData } from "./index.type";
import { getClassDeclaration } from "./declares";

export function extractClass(name: string, declaration: ExportedDeclarations): ExportData | undefined {
    const kind = declaration.getKind();
    if (kind !== SyntaxKind.ClassDeclaration) {
        return;
    }
    const decalreString = getClassDeclaration(declaration as ClassDeclaration);
    const res = {
        name: name,
        body: `declare ${decalreString}`,
        functions: [],
        externalIdentifiers: []
    };
    return res;
}
