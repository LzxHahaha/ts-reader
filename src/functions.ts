import { Node, ExportedDeclarations, SyntaxKind, VariableDeclarationList, FunctionDeclaration, ArrowFunction, QualifiedName, VariableDeclaration, BindingElement, PropertyAccessExpression, PropertyAssignment, ShorthandPropertyAssignment, ParameterDeclaration } from "ts-morph";
import { ExportData } from "./index.type";
import { isTsSymbol } from "./utils/global";

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
    if (kind === SyntaxKind.FunctionDeclaration) {
        const externalIdentifiers = searchExternalIdentifiers(declaration as FunctionDeclaration);
        console.log(name, externalIdentifiers);
        const res = {
            name: name,
            body: declaration.getText(),
            externalIdentifiers
        };
        return res;
    }
}

function searchExternalIdentifiers(declaration: Node, res = new Set<string>(), parentScopeVar = new Set<string>()) {
    const scopeVariableNames = new Set<string>(parentScopeVar);
    const declarartionKind = declaration.getKind();
    if (declarartionKind === SyntaxKind.FunctionDeclaration || declarartionKind === SyntaxKind.ClassDeclaration) {
        const name = (declaration as any).getName();
        scopeVariableNames.add(name);
    }

    declaration.forEachDescendant((node, traversal) => {
        const kind = node.getKind();
        if (kind === SyntaxKind.QualifiedName) {
            traversal.skip();
            return;
        }

        let checkName = '';
        const debugText = node.getText();

        if (kind === SyntaxKind.VariableDeclaration) {
            const nameNode = (node as VariableDeclaration).getNameNode();
            if (nameNode.getKind() === SyntaxKind.Identifier) {
                const nodeName = nameNode.getText();
                scopeVariableNames.add(nodeName);
            }
            return;
        }

        // may be have new scope, save and keep scanning
        if (kind === SyntaxKind.FunctionDeclaration || kind === SyntaxKind.ClassDeclaration) {
            const nodeName = (node as any).getName() as string;
            scopeVariableNames.add(nodeName);
            return;
        }

        // simple binding element or parameter, save and skip current node
        if (kind === SyntaxKind.BindingElement || kind === SyntaxKind.Parameter) {
            const nodeName = (node as any).getName() as string;
            scopeVariableNames.add(nodeName);
            traversal.skip();
            return;
        }

        // create a new scope, use recursion to scan
        if (kind === SyntaxKind.Block) {
            traversal.skip();
            searchExternalIdentifiers(node, res, scopeVariableNames);
            return;
        }

        if (kind === SyntaxKind.PropertyAccessExpression) {
            const expression = (node as PropertyAccessExpression).getExpression();
            const expressionKind = expression.getKind();
            if (expressionKind === SyntaxKind.Identifier) {
                checkName = expression.getText();
            }
            traversal.skip();
        }

        if (kind === SyntaxKind.Identifier) {
            checkName = node.getText();
            const parentKind = node.getParent()?.getKind();
            if (parentKind === SyntaxKind.PropertyAssignment) {
                return;
            }
        }

        if (!checkName || scopeVariableNames.has(checkName) || isTsSymbol(checkName)) {
            return;
        }

        res.add(checkName);
    });
    return Array.from(res);
}