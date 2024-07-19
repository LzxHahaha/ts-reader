import { MethodDeclaration, Node, PropertyAccessExpression, SyntaxKind, VariableDeclaration } from "ts-morph";
import { isTsSymbol } from "./utils/global";

export function searchExternalIdentifiers(declaration: Node, res = new Set<string>(), parentScopeVar = new Set<string>()) {
    const scopeVariableNames = new Set<string>(parentScopeVar);
    const declarartionKind = declaration.getKind();
    if (declarartionKind === SyntaxKind.FunctionDeclaration) {
        const name = (declaration as any).getName();
        scopeVariableNames.add(name);
    }
    if (declarartionKind === SyntaxKind.ClassDeclaration) {
        const name = (declaration as any).getName();
        scopeVariableNames.add(name);
        declaration.asKind(SyntaxKind.ClassDeclaration)!.getMembers().forEach(member => {
            const memberKind = member.getKind();
            if (memberKind === SyntaxKind.MethodDeclaration
                || memberKind === SyntaxKind.PropertyDeclaration
                || memberKind === SyntaxKind.GetAccessor
                || memberKind === SyntaxKind.SetAccessor
            ) {
                const name = (member as MethodDeclaration).getName();
                scopeVariableNames.add(name);
            }
        });
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

        if (kind === SyntaxKind.FunctionDeclaration || kind === SyntaxKind.ClassDeclaration || kind === SyntaxKind.Parameter || kind === SyntaxKind.TypeParameter) {
            const nodeName = (node as any).getName() as string;
            scopeVariableNames.add(nodeName);
            return;
        }

        // simple binding element or parameter, save and skip current node
        if (kind === SyntaxKind.BindingElement) {
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
