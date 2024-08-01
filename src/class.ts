import { ClassDeclaration, ExportedDeclarations, SyntaxKind } from "ts-morph";
import { ExportData, ExportType } from "./index.type";
import { getClassDeclaration, getClassStructure } from "./declares";
import { searchExternalIdentifiers } from "./deps";

export function extractClass(name: string, declaration: ExportedDeclarations): ExportData | undefined {
    const kind = declaration.getKind();
    if (kind !== SyntaxKind.ClassDeclaration) {
        return;
    }
    const classDeclaration = declaration as ClassDeclaration
    const structure = getClassStructure(classDeclaration, true);
    if (!structure) {
        return;
    }
    const decalreString = getClassDeclaration(structure);
    const res = {
        type: ExportType.Class,
        name: name,
        body: `declare ${decalreString}`,
        classFunctions: structure.functions,
        externalIdentifiers: searchExternalIdentifiers(declaration)
    };
    return res;
}
