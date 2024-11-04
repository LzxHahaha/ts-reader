import { Node, SyntaxKind, VariableDeclarationList, FunctionDeclaration } from "ts-morph";
import { CodeMeta, CodeType } from "./index.type";
import { searchExternalIdentifiers } from "./deps";

export function extractFunction(name: string, declaration: Node): CodeMeta | undefined {
    const kind = declaration.getKind();
    if (kind === SyntaxKind.VariableDeclaration) {
        const variableDeclaration = declaration.asKind(SyntaxKind.VariableDeclaration);
        const initializer = variableDeclaration?.getInitializerIfKind(SyntaxKind.ArrowFunction);
        if (!initializer) {
            return;
        }
        let body = declaration.getFullText().trim();
        const parent = variableDeclaration?.getParent();
        if (parent?.getKind() === SyntaxKind.VariableDeclarationList) {
            const variableDeclarationList = parent as VariableDeclarationList;
            const declarationKind = variableDeclarationList.getDeclarationKind();
            if (!body.startsWith(declarationKind)) {
                body = `${declarationKind} ${body}`;
            }
        }
        return {
            type: CodeType.Function,
            name,
            body: body.replaceAll(';;', ';'),
            externalIdentifiers: searchExternalIdentifiers(initializer),
            linesRange: [declaration.getStartLineNumber(), declaration.getEndLineNumber()]
        }
    }
    if (kind === SyntaxKind.FunctionDeclaration || kind === SyntaxKind.ArrowFunction) {
        const externalIdentifiers = searchExternalIdentifiers(declaration as FunctionDeclaration);
        let body = declaration.getFullText();
        if (kind === SyntaxKind.ArrowFunction && name === 'default' && !body.startsWith('export default ')) {
            body = `export default ${body}`;
        }
        return {
            type: CodeType.Function,
            name,
            body,
            externalIdentifiers,
            linesRange: [declaration.getStartLineNumber(), declaration.getEndLineNumber()]
        };
    }
}
