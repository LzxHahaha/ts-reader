import { EnumDeclaration, FunctionDeclaration, InterfaceDeclaration, Project, SyntaxKind, TypeAliasDeclaration, VariableDeclaration, Node } from "ts-morph";

function read(fileName: string, targetName: string): string {
    const project = new Project();

    const sourceFile = project.addSourceFileAtPath(fileName);
    let declarationStr = '';

    for (const importDeclaration of sourceFile.getImportDeclarations()) {
        const importModuleName = importDeclaration.getModuleSpecifierValue();
        let res = '';
        for (const namedImport of importDeclaration.getNamedImports()) {
            const name = namedImport.getName();
            const alias = namedImport.getAliasNode()?.getText() || name;

            const importSymbol = namedImport.getNameNode().getSymbol();
            const declarations = importSymbol?.getAliasedSymbol()?.getDeclarations() || importSymbol?.getDeclarations();
            const declarationStr = getDeclareString(alias, declarations);
            res += declarationStr ? declarationStr + '\n' : '';
        }
        declarationStr += `declare module '${importModuleName}' {\n${res}}\n`;
    }
    return declarationStr;
}


function getDeclareString(name: string, declarations?: Node[]): string | undefined {
    if (!declarations?.length) {
        return;
    }

    const firstDeclaration = declarations[0];
    let declareStatement: string | undefined;

    switch (firstDeclaration.getKind()) {
        case SyntaxKind.TypeAliasDeclaration:
            const typeAlias = firstDeclaration as TypeAliasDeclaration;
            declareStatement = `declare type ${name} = ${typeAlias.getTypeNode()?.getText()};`;
            break;
        case SyntaxKind.InterfaceDeclaration:
            const interfaceDecl = firstDeclaration as InterfaceDeclaration;
            const extendsText = interfaceDecl.getExtends().length > 0
                ? `extends ${interfaceDecl.getExtends().map(e => e.getText()).join(", ")} `
                : '';
            declareStatement = `declare interface ${name} ${extendsText}{};`;
            break;
        case SyntaxKind.EnumDeclaration:
            const enumDecl = firstDeclaration as EnumDeclaration;
            declareStatement = `declare${enumDecl.getConstKeyword()?.getText() ? ' const' : ''} enum ${name} {${enumDecl.getMembers().map(member => member.getName()).join(",")}}`;
            break;
        case SyntaxKind.VariableDeclaration:
            const variableDecl = firstDeclaration as VariableDeclaration;
            const variableTypeText = variableDecl.getTypeNode()?.getText() || 'any';
            declareStatement = `declare const ${name}:${variableTypeText};`;
            break;
        case SyntaxKind.FunctionDeclaration:
            // Fetch the full function signature with types
            const funcDecl = firstDeclaration as FunctionDeclaration;
            declareStatement = `declare function ${name}(${(funcDecl.getStructure().parameters || []).map(p => `${p.name}:${p.type}`).join(", ")}):${funcDecl.getSignature().getReturnType().getText() || 'any'};`;
            break;
        default:
            console.warn(`Unsupported or non-type kind '${SyntaxKind[firstDeclaration.getKind()]}' for '${name}'.`);
            break;
    }

    return declareStatement;
}

console.log(read('./src/code.ts', ''));
