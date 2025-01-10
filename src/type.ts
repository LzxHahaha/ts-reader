import { Node, SyntaxKind } from "ts-morph";
import { CodeMeta, CodeType, ExtractOptions } from "./index.type";
import { searchExternalIdentifiers } from "./deps";

export function extractType(name: string, declaration: Node, options?: ExtractOptions): CodeMeta | undefined {
    const kind = declaration.getKind();
    if (kind !== SyntaxKind.InterfaceDeclaration && kind !== SyntaxKind.TypeAliasDeclaration) {
        return undefined;
    }

    return {
        type: CodeType.TypeDefine,
        name,
        body: declaration.getFullText().trim(),
        externalIdentifiers: options?.skipDependencies ? [] : searchExternalIdentifiers(declaration),
        linesRange: [declaration.getStartLineNumber(), declaration.getEndLineNumber()]
    };
}
