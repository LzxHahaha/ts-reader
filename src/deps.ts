import { ClassDeclaration, InterfaceDeclaration, MethodDeclaration, Node, PropertyAccessExpression, SyntaxKind, VariableDeclaration, TypeAliasDeclaration, FunctionDeclaration, PropertyAssignment, PropertySignature, JsxAttribute, Identifier, MethodSignature, TypeReferenceNode } from "ts-morph";
import { isTsSymbol } from "./utils/global";

const SkipType = new Set([
    SyntaxKind.JsxClosingElement,
    SyntaxKind.QualifiedName
]);

interface SearchOptions {
    deepTypesCheck?: boolean;
}

export function searchExternalIdentifiers(declaration: Node | undefined, options?: SearchOptions, parentScopeVar = new Set<string>()): Map<string, string> {
    const opts: SearchOptions = {
        deepTypesCheck: true,
        ...options
    };
    return search(declaration, opts, new Map(), parentScopeVar);
}

function search(declaration: Node | undefined, options?: SearchOptions, res = new Map<string, string>(), parentScopeVar = new Set<string>()): Map<string, string> {
    if (!declaration) {
        return new Map();
    }
    const scopeVariableNames = new Set<string>(parentScopeVar);
    const declarartionKind = declaration.getKind();
    const isTypeDefine = declarartionKind === SyntaxKind.TypeAliasDeclaration || declarartionKind === SyntaxKind.InterfaceDeclaration;

    // add current function name
    if (declarartionKind === SyntaxKind.FunctionDeclaration || isTypeDefine) {
        if (isTypeDefine && options?.deepTypesCheck) {
            return searchTypeReference(declaration as TypeAliasDeclaration | InterfaceDeclaration, options, res);
        }
        const name = (declaration as FunctionDeclaration | InterfaceDeclaration | TypeAliasDeclaration).getName();
        name && scopeVariableNames.add(name);
    }
    // add member names
    if (declarartionKind === SyntaxKind.ClassDeclaration) {
        const members = getClassMemberNames(declaration as ClassDeclaration);
        members.size && members.forEach(name => scopeVariableNames.add(name));
    }

    const debugText = declaration.getText();
    declaration.forEachDescendant((node, traversal) => {
        const kind = node.getKind();
        if (SkipType.has(kind)) {
            traversal.skip();
            return;
        }

        let checkName = '';
        const debugText = node.getText();

        if (kind === SyntaxKind.TypeAliasDeclaration || kind === SyntaxKind.InterfaceDeclaration) {
            traversal.skip();
            options?.deepTypesCheck && searchTypeReference(node as TypeAliasDeclaration | InterfaceDeclaration, options, res);
            return;
        }

        if (kind === SyntaxKind.TypeReference && options?.deepTypesCheck) {
            traversal.skip();
            const name = node.getType().getSymbol()?.getName();
            if (!name || res.has(name) || scopeVariableNames.has(name) || isTsSymbol(name)) {
                return;
            }
            const decl = (node as TypeReferenceNode).getType().getSymbol()?.getDeclarations();
            if (decl?.[0] && isValidDeclaration(decl[0])) {
                res.set(node.getText(), decl[0].getText(false));
                search(decl[0], options, res);
            }
            return;
        }

        if (kind === SyntaxKind.VariableDeclaration) {
            const nameNode = (node as VariableDeclaration | InterfaceDeclaration | TypeAliasDeclaration).getNameNode();
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
            search(node, options, res, scopeVariableNames);
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

        if (kind === SyntaxKind.PropertyAssignment || kind === SyntaxKind.PropertySignature || kind === SyntaxKind.MethodSignature) {
            const name = (node as PropertyAssignment | PropertySignature | MethodSignature).getName();
            scopeVariableNames.add(name);
        }
        if (kind === SyntaxKind.JsxAttribute) {
            checkName = (node as JsxAttribute).getNameNode().getText();
            traversal.skip();
            search(node, options, res, new Set([...scopeVariableNames, checkName]));
            return;
        }

        let needDeepCheck = false;
        if (kind === SyntaxKind.Identifier) {
            const parentKind = node.getParent()?.getKind();
            if (parentKind === SyntaxKind.JsxClosingElement) {
                return;
            }
            if ((parentKind === SyntaxKind.JsxOpeningElement || parentKind === SyntaxKind.JsxSelfClosingElement) && !/A-Z/.test(checkName[0])) {
                return;
            }
            checkName = node.getText();
            const type = node.getType();
            const symbol = type?.getSymbol();
            if (symbol && !scopeVariableNames.has(checkName) && !isTsSymbol(checkName)) {
                needDeepCheck = true;
            }
        }

        if (!checkName || scopeVariableNames.has(checkName) || isTsSymbol(checkName)) {
            return;
        }

        if (needDeepCheck && !res.has(checkName)) {
            const depDeclaration = (node as Identifier).getSymbol()?.getDeclarations() ?? [];
            for (const decl of depDeclaration) {
                if (!isValidDeclaration(decl)) {
                    continue;
                }
                res.set(checkName, decl.getText(false));
                search(decl, options, res);
            }
        }

        res.set(checkName, '');
    });
    return res;
}

function searchTypeReference(node: TypeAliasDeclaration | InterfaceDeclaration, options?: SearchOptions, res = new Map<string, string>()): Map<string, string> {
    const name = node.getName();
    const scopeVariableNames = new Set<string>([name]);
    const typeParams = node.getTypeParameters();
    typeParams.forEach(param => {
        scopeVariableNames.add(param.getName());
    });
    node.forEachDescendant((node, traversal) => {
        const kind = node.getKind();
        if (kind === SyntaxKind.TypeParameter) {
            scopeVariableNames.add(node.asKind(SyntaxKind.TypeParameter)!.getName());
            traversal.skip();
            return;
        }
        if (kind !== SyntaxKind.TypeReference && kind !== SyntaxKind.ExpressionWithTypeArguments) {
            return;
        }
        const debugText = node.getText();
        const typeName = node.getType().getSymbol()?.getName();
        if (!typeName || res.has(typeName) || scopeVariableNames.has(typeName) || isTsSymbol(typeName)) {
            return;
        }
        const decl = (node as TypeReferenceNode).getType().getSymbol()?.getDeclarations();
        if (decl?.[0] && isValidDeclaration(decl[0])) {
            traversal.skip();
            const debugText = decl[0].getText();
            res.set(typeName, decl[0].getText(false));
            search(decl[0], options, res);
        }
    });
    return res;
}

function isValidDeclaration(node: Node): boolean {
    if (!node) {
        return false;
    }
    const filepath = node.getSourceFile()?.getFilePath();
    if (!filepath || filepath.includes('node_modules') || filepath.includes('libs.')) {
        return false;
    }
    return true;
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