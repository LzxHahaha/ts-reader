import { SyntaxKind, TypeAliasDeclaration, InterfaceDeclaration, EnumDeclaration, VariableDeclarationList, VariableDeclaration, FunctionDeclaration, Node, EnumMember, ClassDeclaration, ImportDeclaration, SourceFile, MethodDeclaration } from "ts-morph";
import { DependData } from "./index.type";

export function getImportDeclarations(imports: ImportDeclaration[]): Record<string, DependData> {
    const res: Record<string, DependData> = {};
    for (const importDeclaration of imports) {
        const importModuleName = importDeclaration.getModuleSpecifierValue();
        for (const namedImport of importDeclaration.getNamedImports()) {
            const name = namedImport.getName();
            const alias = namedImport.getAliasNode()?.getText() || name;

            const importSymbol = namedImport.getNameNode().getSymbol();
            const declarations = importSymbol?.getAliasedSymbol()?.getDeclarations() || importSymbol?.getDeclarations();
            res[alias] = {
                text: `declare ${getDeclareString(declarations?.[0], alias) || `const ${alias}: any;`}`,
                module: importModuleName
            };
        }
    }
    return res;
}

export function getLocalDeclarations(sourceFile: SourceFile): Record<string, DependData> {
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
        const name = (statement as any).getName?.() || (statement.asKind(SyntaxKind.VariableStatement))?.getDeclarations()?.[0]?.getName();
        const declareStr = getDeclareString(statement);
        if (!name || !declareStr) {
            continue;
        }

        res[name] = {
            text: `declare ${declareStr}`,
            module: ''
        }
    }
    return res;
}

export function getDeclareString(declaration?: Node, name?: string): string | undefined {
    if (!declaration) {
        return;
    }

    let declareStatement: string | undefined;

    const kind = declaration.getKind();
    switch (kind) {
        case SyntaxKind.TypeAliasDeclaration:
            declareStatement = getTypeDeclaration(declaration as TypeAliasDeclaration)
            break;
        case SyntaxKind.InterfaceDeclaration:
            declareStatement = getInterfaceDeclaration(declaration as InterfaceDeclaration);
            break;
        case SyntaxKind.EnumDeclaration:
            declareStatement = getMemeberDeclaration(declaration as EnumDeclaration);
            break;
        case SyntaxKind.VariableStatement:
            declareStatement = getVariableStatementDeclaration(declaration as VariableDeclarationList);
            break;
        case SyntaxKind.VariableDeclaration:
            declareStatement = getVariableDeclaration(declaration as VariableDeclaration)
            break;
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.MethodDeclaration:
            declareStatement = getFunctionDeclaration(declaration as FunctionDeclaration);
            break;
        case SyntaxKind.ClassDeclaration:
            declareStatement = getClassDeclaration(declaration as ClassDeclaration);
            break;
        default:
            console.warn(`Unsupported or non-type kind '${kind}' for '${name || (declaration as any).getName?.() || declaration.getText()}'.`);
            break;
    }

    return declareStatement;
}

function getTypeDeclaration(typeAlias: TypeAliasDeclaration): string {
    return `type ${typeAlias.getName()} = ${typeAlias.getTypeNode()?.getText()};`;
}

function getInterfaceDeclaration(declaration: InterfaceDeclaration): string {
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
        let memberType = member.getType().getBaseTypeOfLiteralType().getText() || 'any';
        // TODO: Handle common types, other than 'any'
        if (memberType.startsWith('import(')) {
            memberType = 'any';
        }
        if ((member as any).getName) {
            return `${(member as any).getName()}${isOptional}:${memberType};`;
        }
        return '';
    });
    return `interface ${interfaceDecl.getName()} ${extendsText}{${interfaceMembers.join('')}}`;
}

function getMemeberDeclaration(declaration: EnumDeclaration): string {
    const enumDecl = declaration as EnumDeclaration;
    return `${enumDecl.getConstKeyword()?.getText() ? ' const' : ''} enum ${enumDecl.getName()} {${getEnumMembers(enumDecl.getMembers())}}`;
}

function getEnumMembers(members: EnumMember[]): string {
    return members.map(member => {
        let res = member.getName();
        const value = member.getInitializer()?.getText();
        if (value) {
            res += `=${value}`;
        }
        return res;
    }).join(',');
}

function getVariableStatementDeclaration(variableStatement: VariableDeclarationList): string {
    const declarationKind = variableStatement.getDeclarationKind();
    const varDeclaration = variableStatement.getDeclarations()[0];
    return `${declarationKind} ${varDeclaration.getName()}:${varDeclaration.getType().getBaseTypeOfLiteralType().getText() || 'any'};`;
}

function getVariableDeclaration(variableDecl: VariableDeclaration): string {
    const parent = variableDecl.getParent();
    const declarationKind = parent?.getKind();
    const declarationKindText = declarationKind === SyntaxKind.VariableDeclarationList
        ? (parent as VariableDeclarationList).getDeclarationKind()
        : 'const';
    const variableTypeText = variableDecl.getType().getBaseTypeOfLiteralType().getText() || 'any';
    return `${declarationKindText} ${variableDecl.getName()}:${variableTypeText};`;
}

function getFunctionDeclaration(funcDecl: FunctionDeclaration | MethodDeclaration): string {
    const isMember = funcDecl.getKind() === SyntaxKind.MethodDeclaration;
    const prefix = isMember ? '' : 'function ';
    const name = funcDecl.getName();
    const params = (funcDecl.getStructure().parameters || []).map(p => `${p.name}:${p.type}`).join(", ");
    let returnType = funcDecl.getSignature().getReturnType().getText() || 'any';
    if (returnType.startsWith('import(')) {
        returnType = 'any';
    }
    return `${prefix}${name}(${params}):${returnType};`;
}

export function getClassDeclaration(classDeclaration: ClassDeclaration): string {
    const className = classDeclaration.getName();
    if (!className) {
        return '';
    }

    const heritageClauses = classDeclaration.getHeritageClauses().map(hc => hc.getText());

    let declarationString = `class ${className}`;
    if (heritageClauses.length > 0) {
        declarationString += ` ${heritageClauses.join(' ')}`
    }
    declarationString += ' {\n';

    const constructors = classDeclaration.getConstructors();
    if (constructors.length > 0) {
        const constructorParameters = constructors[0].getParameters().map(p => p.getText().replace(/(public|protected|private) /, '')).join(', ');
        declarationString += `constructor(${constructorParameters});\n`;
    }

    const members = classDeclaration.getMembers();
    for (const member of members) {
        const memberKind = member.getKind();
        if (memberKind === SyntaxKind.Constructor || memberKind === SyntaxKind.ClassStaticBlockDeclaration) {
            continue;
        }
        const declareStr = getDeclareString(member);
        const modifiers = (member as any).getModifiers().map((modifier: any) => modifier.getText()).join(' ') || 'public';
        if (declareStr) {
            declarationString += `${modifiers} ${declareStr}\n`;
        }
    }

    return declarationString;
}
