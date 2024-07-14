import { ExportedDeclarations, SyntaxKind, VariableDeclarationList, FunctionDeclaration, ArrowFunction, QualifiedName, VariableDeclaration } from "ts-morph";
import { ExportData } from "./index.type";

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
            externalIdentifiers: getFunctionsExternalIdentifiers(name, initializer)
        }
    }
    if (kind === SyntaxKind.FunctionDeclaration) {
        const res = {
            name: name,
            body: declaration.getText(),
            externalIdentifiers: getFunctionsExternalIdentifiers(name, declaration as FunctionDeclaration)
        };
        return res;
    }
}

function getFunctionsExternalIdentifiers(name: string, functionDeclaration: FunctionDeclaration | ArrowFunction): string[] {
    const scopeVariableNames = new Set<string>([name]);
    const externalIdentifiers = new Set<string>();

    // Add function name to scope variables
    scopeVariableNames.add(name);

    // Add parameter names to scope variables
    functionDeclaration.getParameters().forEach(parameter => {
        scopeVariableNames.add(parameter.getName());
    });

    // Recursively collect all identifiers and decide if they are external
    functionDeclaration.forEachDescendant(node => {
        const kind = node.getKind();
        if (kind === SyntaxKind.Identifier) {
            const nodeName = node.getText();

            // Check whether the identifier is one level under PropertyAccessExpression
            // to exclude object property accesses (e.g., `input.a` should not return `a`)
            const parent = node.getParent();
            const parentKind = parent?.getKind();
            if ((parentKind === SyntaxKind.PropertyAccessExpression
                || parentKind === SyntaxKind.ElementAccessExpression
                || parentKind === SyntaxKind.PropertyAssignment
                || parentKind === SyntaxKind.ShorthandPropertyAssignment
                || parentKind === SyntaxKind.ComputedPropertyName
            ) && (parent as any).getNameNode() === node
            ) {
                return;
            }

            // Exclude the right part of Qualified Names (e.g. `Enum.A` should not return `A`)
            if (parentKind === SyntaxKind.QualifiedName && (parent as QualifiedName)?.getRight() === node) return;

            // Collect identifier if it's not in the scope and not yet collected
            if (!scopeVariableNames.has(nodeName) && !externalIdentifiers.has(nodeName)) {
                externalIdentifiers.add(nodeName);
            }
        }

        if ([SyntaxKind.VariableDeclaration, SyntaxKind.FunctionDeclaration, SyntaxKind.ClassDeclaration].includes(kind)) {
            const nodeName = (node as VariableDeclaration | FunctionDeclaration).getName() as string;
            scopeVariableNames.add(nodeName);
        }
    });
    return Array.from(externalIdentifiers);
}
