import {
    EnumDeclaration,
    FunctionDeclaration,
    InterfaceDeclaration,
    Project,
    SyntaxKind,
    TypeAliasDeclaration,
    VariableDeclaration,
    Node,
    ExportedDeclarations,
    QualifiedName,
    VariableDeclarationList,
    ImportDeclaration,
    ArrowFunction,
    SourceFile
} from "ts-morph";
import { FunctionData, DependData } from "./index.type";

interface FunctionCode {
    name: string;
    code: string;
}

export async function read(fileName: string): Promise<FunctionCode[]> {
    const project = new Project();

    const sourceFile = project.addSourceFileAtPath(fileName);

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const imports = sourceFile.getImportDeclarations();
    const importDeclarations = getImportDeclarations(imports);

    const localDeclarations = getLocalDeclarations(sourceFile) as any;

    const exportFuncs: Record<string, FunctionData> = {};
    exportedDeclarations.forEach((declarations, name) => {
        declarations.forEach((declaration) => {
            const func = extractFunction(name, declaration);
            if (func) {
                exportFuncs[name] = func;
            }
        });
    });

    const res: FunctionCode[] = [];
    for (const funcName in exportFuncs) {
        const { name, body, externalIdentifiers } = exportFuncs[funcName];
        const dependedModules: Record<string, string[]> = {};
        let localDeclares = '';
        for (const externalIdentifier of externalIdentifiers) {
            const dep = importDeclarations[externalIdentifier] || localDeclarations[externalIdentifier];
            if (!dep) {
                console.warn(`Cannot find declaration for '${externalIdentifier}' in '${name}'`);
                continue;
            }
            if (dep.module) {
                if (!dependedModules[dep.module]) {
                    dependedModules[dep.module] = [];
                }
                dependedModules[dep.module].push(dep.text);
            } else {
                localDeclares += `declare ${dep.text}\n`;
            }
        }

        let declarationStr = '';
        for (const module in dependedModules) {
            declarationStr += `declare module '${module}' {\n${dependedModules[module].join('\n')}\n}\n`;
        }
        res.push({
            name,
            code: `${declarationStr}${localDeclares}${body}`
        });
    }

    return res;
}

function getImportDeclarations(imports: ImportDeclaration[]): Record<string, DependData> {
    const res: Record<string, DependData> = {};
    for (const importDeclaration of imports) {
        const importModuleName = importDeclaration.getModuleSpecifierValue();
        for (const namedImport of importDeclaration.getNamedImports()) {
            const name = namedImport.getName();
            const alias = namedImport.getAliasNode()?.getText() || name;

            const importSymbol = namedImport.getNameNode().getSymbol();
            const declarations = importSymbol?.getAliasedSymbol()?.getDeclarations() || importSymbol?.getDeclarations();
            res[alias] = {
                text: getDeclareString(declarations?.[0], alias) || `declare const ${alias}: any;`,
                module: importModuleName
            };
        }
    }
    return res;
}

function getDeclareString(declaration?: Node, name?: string): string | undefined {
    if (!declaration) {
        return;
    }

    let declareStatement: string | undefined;

    const kind = declaration.getKind();
    switch (kind) {
        case SyntaxKind.TypeAliasDeclaration:
            const typeAlias = declaration as TypeAliasDeclaration;
            declareStatement = `type ${typeAlias.getName()} = ${typeAlias.getTypeNode()?.getText()};`;
            break;
        case SyntaxKind.InterfaceDeclaration:
            const interfaceDecl = declaration as InterfaceDeclaration;
            const extendsText = interfaceDecl.getExtends().length > 0
                ? `extends ${interfaceDecl.getExtends().map(e => e.getText()).join(", ")} `
                : '';
            const interfaceMembers = interfaceDecl.getMembers().map(member => {
                const memberKind = member.getKind();
                const isOptional = (member as any).hasQuestionToken?.() ? '?' : '';
                if (memberKind === SyntaxKind.MethodSignature) {
                    const methodMember = member.asKind(SyntaxKind.MethodSignature);
                    return `${methodMember?.getName()}${isOptional}:(${methodMember?.getParameters().map(p => `${p.getName()}:${p.getType().getText()}`).join(", ")})=>${methodMember?.getReturnType() || 'any'};`;
                }
                const memberType = member.getType().getBaseTypeOfLiteralType().getText() || 'any';
                if ((member as any).getName) {
                    return `${(member as any).getName()}${isOptional}:${memberType};`;
                }
                return '';
            });
            declareStatement = `interface ${interfaceDecl.getName()} ${extendsText}{${interfaceMembers.join('')}};`;
            break;
        case SyntaxKind.EnumDeclaration:
            const enumDecl = declaration as EnumDeclaration;
            declareStatement = `${enumDecl.getConstKeyword()?.getText() ? ' const' : ''} enum ${enumDecl.getName()} {${enumDecl.getMembers().map(member => member.getName()).join(",")}}`;
            break;
        case SyntaxKind.VariableStatement:
            const variableStatement = declaration as VariableDeclarationList;
            const declarationKind = variableStatement.getDeclarationKind();
            const varDeclaration = variableStatement.getDeclarations()[0];
            declareStatement = `${declarationKind} ${varDeclaration.getName()}:${varDeclaration.getType().getBaseTypeOfLiteralType().getText() || 'any'};`;
            break;
        case SyntaxKind.VariableDeclaration:
            const variableDecl = declaration as VariableDeclaration;
            const variableTypeText = variableDecl.getTypeNode()?.getText() || 'any';
            declareStatement = `const ${variableDecl.getName()}:${variableTypeText};`;
            break;
        case SyntaxKind.FunctionDeclaration:
            // Fetch the full function signature with types
            const funcDecl = declaration as FunctionDeclaration;
            declareStatement = `function ${funcDecl.getName()}(${(funcDecl.getStructure().parameters || []).map(p => `${p.name}:${p.type}`).join(", ")
                }):${funcDecl.getSignature().getReturnType().getText() || 'any'};`;
            break;
        default:
            console.warn(`Unsupported or non-type kind '${kind}' for '${name || (declaration as any).getName?.() || declaration.getText()}'.`);
            break;
    }

    return declareStatement;
}

function extractFunction(name: string, declaration: ExportedDeclarations): FunctionData | undefined {
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

function getLocalDeclarations(sourceFile: SourceFile): Record<string, DependData> {
    const res: Record<string, DependData> = {};
    for (const statement of sourceFile.getStatements()) {
        const kind = statement.getKind();
        const isDeclartoin = kind === SyntaxKind.VariableStatement
            || kind === SyntaxKind.FunctionDeclaration
            || kind === SyntaxKind.TypeAliasDeclaration
            || kind === SyntaxKind.InterfaceDeclaration
            || kind === SyntaxKind.EnumDeclaration
            || kind === SyntaxKind.ClassDeclaration;
        if (!isDeclartoin || statement.asKind(kind)?.isExported()) {
            continue;
        }
        const declareStr = getDeclareString(statement);
        if (!declareStr) {
            continue;
        }

        let name = (statement as any).getName?.() || (statement.asKind(SyntaxKind.VariableStatement))?.getDeclarations()?.[0]?.getName();
        res[name] = {
            text: declareStr,
            module: ''
        }
    }
    return res;
}
