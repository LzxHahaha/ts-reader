import { ImportDeclaration, SourceFile, SyntaxKind } from "ts-morph";
import { DependData } from "./index.type";
import { getDeclareString } from "./declares";

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
                text: getDeclareString(declarations?.[0], alias) || `declare const ${alias}: any;`,
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
