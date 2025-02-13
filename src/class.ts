import { ClassDeclaration, Node, SyntaxKind } from "ts-morph";
import { CodeMeta, CodeType, ExtractOptions } from "./index.type";
import { getClassDeclaration, getClassStructure } from "./declares";
import { searchExternalIdentifiers } from "./deps";

export function extractClass(name: string, declaration: Node, options?: ExtractOptions): CodeMeta | undefined {
    const kind = declaration.getKind();
    if (kind !== SyntaxKind.ClassDeclaration) {
        return;
    }
    const classDeclaration = declaration as ClassDeclaration
    const structure = getClassStructure(classDeclaration, {
        ...options,
        scanFunc: true,
    });
    if (!structure) {
        return;
    }
    const decalreString = getClassDeclaration(structure);
    const res: CodeMeta = {
        type: CodeType.Class,
        name: name,
        body: `declare ${decalreString}`,
        classFunctions: structure.functions,
        externalIdentifiers: options?.skipDependencies ? undefined : searchExternalIdentifiers(declaration, options),
        linesRange: [declaration.getStartLineNumber(), declaration.getEndLineNumber()]
    };
    return res;
}
