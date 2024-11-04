import { ClassDeclaration, MethodDeclaration, Node, PropertyAccessExpression, SyntaxKind, VariableDeclaration } from "ts-morph";
import { isTsSymbol } from "./utils/global";

export function searchExternalIdentifiers(declaration: Node | undefined, res = new Set<string>(), parentScopeVar = new Set<string>()): string[] {
    if (!declaration) {
        return [];
    }
    const scopeVariableNames = new Set<string>(parentScopeVar);
    const declarartionKind = declaration.getKind();
    // add current function name
    if (declarartionKind === SyntaxKind.FunctionDeclaration) {
        const name = (declaration as any).getName();
        scopeVariableNames.add(name);
    }
    // add member names
    if (declarartionKind === SyntaxKind.ClassDeclaration) {
        const members = getClassMemberNames(declaration as ClassDeclaration);
        members.size && members.forEach(name => scopeVariableNames.add(name));
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

        if (kind === SyntaxKind.PropertyAccessExpression || kind === SyntaxKind.ElementAccessExpression) {
            const expression = (node as PropertyAccessExpression).getExpression();
            const expressionKind = expression.getKind();
            if (expressionKind === SyntaxKind.SuperKeyword || expressionKind === SyntaxKind.ThisKeyword) {
                traversal.skip();
                return;
            }
            const ids = (node as PropertyAccessExpression).getDescendantsOfKind(SyntaxKind.Identifier);
            if (ids.length > 0) {
                checkName = ids[0].getText();
                traversal.skip();
            }
        }

        if (kind === SyntaxKind.Decorator) {
            checkName = node.getFirstChildByKind(SyntaxKind.Identifier)?.getText() || '';
            traversal.skip();
        }

        if (kind === SyntaxKind.Identifier) {
            checkName = node.getText();
            const parentKind = node.getParent()?.getKind();
            if (parentKind === SyntaxKind.PropertyAssignment
                || parentKind === SyntaxKind.JsxAttribute
                || parentKind === SyntaxKind.JsxClosingElement
            ) {
                return;
            }
            if ((parentKind === SyntaxKind.JsxOpeningElement || parentKind === SyntaxKind.JsxSelfClosingElement) && !/A-Z/.test(checkName[0])) {
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

export function getClassMemberNames(declaration: ClassDeclaration): Set<string> {
    const res = new Set<string>();
    const name = declaration.getName();
    name && res.add(name);
    declaration.getMembers().forEach(member => {
        const memberKind = member.getKind();
        if (memberKind === SyntaxKind.MethodDeclaration
            || memberKind === SyntaxKind.PropertyDeclaration
            || memberKind === SyntaxKind.GetAccessor
            || memberKind === SyntaxKind.SetAccessor
        ) {
            const name = (member as MethodDeclaration).getName();
            res.add(name);
        }
    });
    return res;
}