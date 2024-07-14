import { SyntaxKind, TypeAliasDeclaration, InterfaceDeclaration, EnumDeclaration, VariableDeclarationList, VariableDeclaration, FunctionDeclaration, Node, EnumMember, ClassDeclaration } from "ts-morph";

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
    return `declare type ${typeAlias.getName()} = ${typeAlias.getTypeNode()?.getText()};`;
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
        const memberType = member.getType().getBaseTypeOfLiteralType().getText() || 'any';
        if ((member as any).getName) {
            return `${(member as any).getName()}${isOptional}:${memberType};`;
        }
        return '';
    });
    return `declare interface ${interfaceDecl.getName()} ${extendsText}{${interfaceMembers.join('')}}`;
}

function getMemeberDeclaration(declaration: EnumDeclaration): string {
    const enumDecl = declaration as EnumDeclaration;
    return `declare ${enumDecl.getConstKeyword()?.getText() ? ' const' : ''} enum ${enumDecl.getName()} {${getEnumMembers(enumDecl.getMembers())}}`;
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
    return `declare ${declarationKind} ${varDeclaration.getName()}:${varDeclaration.getType().getBaseTypeOfLiteralType().getText() || 'any'};`;
}

function getVariableDeclaration(variableDecl: VariableDeclaration): string {
    const parent = variableDecl.getParent();
    const declarationKind = parent?.getKind();
    const declarationKindText = declarationKind === SyntaxKind.VariableDeclarationList
        ? (parent as VariableDeclarationList).getDeclarationKind()
        : 'const';
    const variableTypeText = variableDecl.getType().getBaseTypeOfLiteralType().getText() || 'any';
    return `declare ${declarationKindText} ${variableDecl.getName()}:${variableTypeText};`;
}

function getFunctionDeclaration(funcDecl: FunctionDeclaration): string {
    return `declare function ${funcDecl.getName()}(${(funcDecl.getStructure().parameters || []).map(p => `${p.name}:${p.type}`).join(", ")}):${funcDecl.getSignature().getReturnType().getText() || 'any'};`;
}

function getClassDeclaration(classDeclaration: ClassDeclaration): string {
    const className = classDeclaration.getName();
    if (!className) {
        return '';
    }
    return `declare class ${className}{[key:string]:any}`;

    // const heritageClauses = classDeclaration.getHeritageClauses().map(hc => hc.getText());

    // let declarationString = `declare class ${className}`;
    // if (heritageClauses.length > 0) {
    //     declarationString += ` ${heritageClauses.join(' ')}`
    // }
    // declarationString += ' {\n';

    // const constructors = classDeclaration.getConstructors();
    // if (constructors.length > 0) {
    //     const constructorParameters = constructors[0].getParameters().map(p => p.getText()).join(', ');
    //     declarationString += `constructor(${constructorParameters});\n`;
    // }

    // classDeclaration.getMethods().forEach(method => {
    //     if (method.hasModifier('private') || method.hasModifier('protected')) {
    //         return;
    //     }
    //     declarationString += `${method.getText()}\n`;
    // });

    // classDeclaration.getProperties().forEach(property => {
    //     if (property.hasModifier('private') || property.hasModifier('protected')) {
    //         return;
    //     }
    //     declarationString += `${property.getText()};\n`;
    // });


    // classDeclaration.getStaticProperties().forEach(staticProperty => {
    //     declarationString += `static ${staticProperty.getText()};\n`;
    // });

    // declarationString += '}';
    // return declarationString;
}
