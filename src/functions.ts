import { ExportedDeclarations, SyntaxKind, VariableDeclarationList, FunctionDeclaration } from "ts-morph";
import { ExportData } from "./index.type";
import { searchExternalIdentifiers } from "./deps";

export function extractFunction(name: string, declaration: ExportedDeclarations): ExportData | undefined {
    const kind = declaration.getKind();
    if (kind === SyntaxKind.VariableDeclaration) {
        const variableDeclaration = declaration.asKind(SyntaxKind.VariableDeclaration);
        const initializer = variableDeclaration?.getInitializerIfKind(SyntaxKind.ArrowFunction);
        if (!initializer) {
            return;
        }
        let body = declaration.getText().trim();
        const parent = variableDeclaration?.getParent();
        if (parent?.getKind() === SyntaxKind.VariableDeclarationList) {
            const variableDeclarationList = parent as VariableDeclarationList;
            const declarationKind = variableDeclarationList.getDeclarationKind();
            if (!body.startsWith(declarationKind)) {
                body = `${declarationKind} ${body}`;
            }
        }
        return {
            name,
            body: body.replaceAll(';;', ';'),
            externalIdentifiers: searchExternalIdentifiers(initializer)
        }
    }
    if (kind === SyntaxKind.FunctionDeclaration || kind === SyntaxKind.ArrowFunction) {
        const externalIdentifiers = searchExternalIdentifiers(declaration as FunctionDeclaration);
        let body = declaration.getText();
        if (kind === SyntaxKind.ArrowFunction && name === 'default' && !body.startsWith('export default ')) {
            body = `export default ${body}`;
        }
        const res = {
            name: name,
            body,
            externalIdentifiers
        };
        return res;
    }
}
