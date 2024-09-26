import { SyntaxKind, TypeAliasDeclaration, InterfaceDeclaration, EnumDeclaration, VariableDeclarationList, VariableDeclaration, FunctionDeclaration, Node, EnumMember, ClassDeclaration, ImportDeclaration, SourceFile, MethodDeclaration, GetAccessorDeclaration, SetAccessorDeclaration, PropertyDeclaration, ClassMemberTypes } from "ts-morph";
import { ClassFunction, ClassStructure, DependData } from "./index.type";
import { getClassMemberNames, searchExternalIdentifiers } from "./deps";

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
                text: getDeclareString(declarations?.[0], alias) || `const ${alias}: any;`,
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
        if (!isDeclartoin) {
            continue;
        }
        const name = (statement as any).getName?.() || (statement.asKind(SyntaxKind.VariableStatement))?.getDeclarations()?.[0]?.getName();
        const declareStr = getDeclareString(statement);
        if (!name || !declareStr) {
            continue;
        }

        res[name] = {
            text: declareStr,
            module: ''
        }
    }
    return res;
}

export function getDeclareString(declaration?: Node, name?: string): string | undefined {
    if (!declaration) {
        return;
    }

    const kind = declaration.getKind();
    switch (kind) {
        case SyntaxKind.TypeAliasDeclaration:
            return getTypeDeclaration(declaration as TypeAliasDeclaration)
        case SyntaxKind.InterfaceDeclaration:
            return getInterfaceDeclaration(declaration as InterfaceDeclaration);
        case SyntaxKind.EnumDeclaration:
            return getEnumDeclaration(declaration as EnumDeclaration);
        case SyntaxKind.VariableStatement:
            return getVariableStatementDeclaration(declaration as VariableDeclarationList);
        case SyntaxKind.VariableDeclaration:
            return getVariableDeclaration(declaration as VariableDeclaration)
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.MethodDeclaration:
            return getFunctionDeclaration(declaration as FunctionDeclaration);
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
            return getGetterSetterDeclaration(declaration as GetAccessorDeclaration);
        case SyntaxKind.ClassDeclaration:
            return getClassDeclaration(getClassStructure(declaration as ClassDeclaration));
        case SyntaxKind.MethodSignature:
        case SyntaxKind.ModuleDeclaration:
            return declaration.getText();
        case SyntaxKind.PropertyDeclaration:
            return getPropDeclaretion(declaration as PropertyDeclaration);
        default:
            console.warn(`Unsupported or non-type kind '${kind}' for '${name || (declaration as any).getName?.() || declaration.getText()}'.`);
            break;
    }

    return;
}

const importReg = /import\(['"].+['"]\)\.?/g;
function formatType(type?: string): string {
    if (!type) {
        return 'any';
    }
    return type.replaceAll(importReg, '');
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
        const questionToken = (member as any).hasQuestionToken?.() ? '?' : '';
        const exclamationToken = (member as any).hasExclamationToken?.() ? '!' : '';
        const mark = questionToken || exclamationToken;

        if (memberKind === SyntaxKind.MethodSignature) {
            const methodMember = member.asKind(SyntaxKind.MethodSignature);
            const name = methodMember?.getName();
            const params = methodMember?.getParameters().map(p => {
                return formatType(p.getText());
            }).join(", ");
            return `${name}${mark}(${params})=>${formatType(methodMember?.getReturnType().getText())};`;
        }
        let memberType = formatType(member.getType().getBaseTypeOfLiteralType().getText());
        if ((member as any).getName) {
            return `${(member as any).getName()}${mark}:${memberType};`;
        }
        return '';
    });
    return `interface ${interfaceDecl.getName()} ${extendsText}{${interfaceMembers.join('')}}`;
}

function getEnumDeclaration(declaration: EnumDeclaration): string {
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
    return `${declarationKind} ${varDeclaration.getName()}:${formatType(varDeclaration.getType().getBaseTypeOfLiteralType().getText())};`;
}

function getVariableDeclaration(variableDecl: VariableDeclaration): string {
    const parent = variableDecl.getParent();
    const declarationKind = parent?.getKind();
    const declarationKindText = declarationKind === SyntaxKind.VariableDeclarationList
        ? (parent as VariableDeclarationList).getDeclarationKind()
        : 'const';
    const variableTypeText = formatType(variableDecl.getType().getBaseTypeOfLiteralType().getText());
    return `${declarationKindText} ${variableDecl.getName()}:${variableTypeText};`;
}

function getFunctionDeclaration(funcDecl: FunctionDeclaration | MethodDeclaration): string {
    const isMember = funcDecl.getKind() === SyntaxKind.MethodDeclaration;
    const prefix = isMember ? '' : 'function ';
    const name = funcDecl.getName();
    const params = (funcDecl.getStructure().parameters || []).map(p => {
        const dot = p.isRestParameter ? '...' : ''
        return `${dot}${p.name}:${formatType(p.type?.toString())}`
    }).join(", ");
    let returnType = formatType(funcDecl.getSignature().getReturnType().getText());
    return `${prefix}${name}(${params}):${returnType};`;
}

function getGetterSetterDeclaration(funcDecl: GetAccessorDeclaration | SetAccessorDeclaration): string {
    const modifiers = funcDecl.getModifiers().map(el => el.getText()).join(' ');
    const isGetter = funcDecl.getKind() === SyntaxKind.GetAccessor;
    const name = funcDecl.getName();
    const params = (funcDecl.getStructure().parameters || []).map(p => `${p.name}:${formatType(p.type?.toString())}`).join(", ");
    let returnType = formatType(funcDecl.getSignature().getReturnType().getText());
    return `${modifiers ? modifiers + ' ' : ''}${isGetter ? 'get' : 'set'} ${name}(${params}):${returnType};`;
}


export function getClassDeclaration(structure: ClassStructure | undefined) {
    if (!structure) {
        return '';
    }
    const { name, type, ext, impl, body } = structure;
    return `class ${name}${type}${ext}${impl} {\n${body.map(([, declareStr]) => `${declareStr}`).join('')}}`;
}

function getPropDeclaretion(prop: PropertyDeclaration) {
    const typeNode = prop.getTypeNode();
    const initializer = prop.getInitializer();

    const questionToken = prop.hasQuestionToken() ? '?' : '';
    const exclamationToken = prop.hasExclamationToken() ? '!' : '';
    const marker = questionToken || exclamationToken;

    if (typeNode?.getKind() === SyntaxKind.FunctionType) {
        return `${prop.getName()}${marker}:${formatType(typeNode.getText())};`;
    }

    const initializerKind = initializer?.getKind();
    if (initializerKind === SyntaxKind.ArrowFunction || initializerKind === SyntaxKind.FunctionExpression) {
        let paramsText = [];
        const func = initializer?.asKind(SyntaxKind.ArrowFunction)!;
        // const func = initializer?.asKind(SyntaxKind.FunctionExpression)!;
        for (const param of func.getParameters()) {
            paramsText.push(param.getText());
        }
        const returnType = formatType(func.getReturnType().getText());
        return `${prop.getName()}${marker}: (${paramsText.join(',')}) => ${returnType};`;
    }
    if (prop.getName() === 'v') {
        console.error('vvv', prop.getType().getText());
    }

    return `${prop.getName()}${marker}:${formatType(prop.getType().getText())};`;
}

export function getClassStructure(classDeclaration: ClassDeclaration, scanFunc = false): ClassStructure | undefined {
    const className = classDeclaration.getName() || '';

    const functions: ClassFunction[] = [];
    const memberNames = getClassMemberNames(classDeclaration);

    const typeParams = classDeclaration.getTypeParameters();
    let typeString = '';
    if (typeParams?.length) {
        typeString += `<${typeParams.map(el => el.getText()).join(',')}>`
    }

    const exts: string[] = [];
    const impls: string[] = [];
    classDeclaration.getHeritageClauses().forEach(el => {
        const debugText = el.getText();
        const types = el.getTypeNodes().map(n => formatType(n.getText()));
        const kind = el.getToken();
        if (kind === SyntaxKind.ExtendsKeyword) {
            exts.push(...types);
        } else {
            impls.push(...types);
        }
    });

    const body: [name: string, declareStr: string][] = [];

    const constructors = classDeclaration.getConstructors();
    if (constructors?.length) {
        const constructorParameters = constructors[0].getParameters().map(p => p.getText()).join(', ');
        body.push(['constructor', `constructor(${constructorParameters});\n`]);
    }

    const members = classDeclaration.getMembers();
    for (const member of members) {
        const memberKind = member.getKind();
        if (memberKind === SyntaxKind.Constructor || memberKind === SyntaxKind.ClassStaticBlockDeclaration) {
            continue;
        }
        const funcData = scanFunc && getClassMemberFunction(member, memberNames);
        if (funcData) {
            functions.push(funcData);
        }

        let propStr = getDeclareString(member as any);
        const modifiers = (member as any).getModifiers().map((modifier: any) => modifier.getText()).join(' ');
        if (propStr) {
            if (modifiers && !propStr.includes(`${modifiers} `)) {
                propStr = `${modifiers} ${propStr}`
            }
            body.push([(member as any).getName(), `${propStr}\n`]);
        }
    }

    return {
        name: className,
        type: typeString,
        ext: exts.length ? ` extends ${exts.join(', ')}` : '',
        impl: impls.length ? ` implements ${impls.join(', ')}` : '',
        body,
        functions
    }
}

function getClassMemberFunction(member: ClassMemberTypes, memberNames: Set<string>): ClassFunction | undefined {
    const memberKind = member.getKind();
    if (memberKind !== SyntaxKind.MethodDeclaration && memberKind !== SyntaxKind.PropertyDeclaration) {
        return;
    }
    const scope = (member as any).getScope?.() || 'public';

    if (memberKind === SyntaxKind.MethodDeclaration) {
        const method = member as MethodDeclaration;
        const name = method.getName();
        const isStatic = method.isStatic();
        return {
            name,
            body: method.getText(),
            isProp: false,
            isStatic,
            scope,
            externalIdentifiers: searchExternalIdentifiers(method, undefined, memberNames),
            linesRange: [method.getStartLineNumber(), method.getEndLineNumber()]
        };
    } else if (memberKind === SyntaxKind.PropertyDeclaration) {
        const prop = member as PropertyDeclaration;
        const typeNode = prop.getTypeNode();
        const initializer = prop.getInitializer();
        const debugText = prop?.getText();
        if (typeNode?.getKind() !== SyntaxKind.FunctionType && initializer?.getKind() !== SyntaxKind.ArrowFunction) {
            return;
        }
        const name = prop.getName();
        const isStatic = prop.isStatic();
        return {
            name,
            body: prop.getText(),
            isProp: true,
            isStatic,
            scope,
            externalIdentifiers: searchExternalIdentifiers(prop.getInitializer(), undefined, memberNames),
            linesRange: [prop.getStartLineNumber(), prop.getEndLineNumber()]
        };
    }
}
