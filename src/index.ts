import { Project, ProjectOptions, SyntaxKind } from "ts-morph";
import { ExportData, ExportCode, Declare } from "./index.type";
import { getImportDeclarations, getLocalDeclarations } from "./declares";
import { extractFunction } from "./functions";
import { extractClass } from "./class";

export * from './index.type';

export async function read(fileName: string, options?: ProjectOptions): Promise<ExportCode[]> {
    const project = new Project(options);

    const formatFileName = formatPath(fileName);
    const sourceFile = project.addSourceFileAtPath(formatFileName);

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const imports = sourceFile.getImportDeclarations();
    const importDeclarations = getImportDeclarations(imports);

    const localDeclarations = getLocalDeclarations(sourceFile) as any;

    const exportData: Record<string, ExportData> = {};
    exportedDeclarations.forEach((declarations, name) => {
        declarations.forEach((declaration) => {
            const sourcePath = formatPath(declaration.getSourceFile().getFilePath());
            if (sourcePath !== formatFileName) {
                return;
            }
            const data = extractFunction(name, declaration) || extractClass(name, declaration);
            if (data) {
                exportData[name] = data;
            }
        });
    });

    const res: ExportCode[] = [];
    for (const dataKey in exportData) {
        const { type, name, body, externalIdentifiers, classFunctions, linesRange } = exportData[dataKey];

        let localDeclares = '';
        const importDeclares: Record<string, Declare[]> = {};
        for (const externalIdentifier of externalIdentifiers) {
            const dep = importDeclarations[externalIdentifier] || localDeclarations[externalIdentifier];
            if (!dep) {
                console.warn(`Cannot find declaration for '${externalIdentifier}' in '${name}'`);
                localDeclares += `declare const ${externalIdentifier}: any;\n`;
                continue;
            }
            if (dep.module) {
                importDeclares[dep.module] = importDeclares[dep.module] || [];
                importDeclares[dep.module].push({
                    name: externalIdentifier,
                    declare: dep.text
                });
            } else {
                localDeclares += (dep.text.startsWith('declare ') ? dep.text : `declare ${dep.text}`) + '\n';
            }
        }

        res.push({
            type,
            name,
            importDeclares,
            localDeclares,
            code: body,
            classFunctions,
            linesRange
        });
    }

    return res;
}

export interface MergeCodeOptions {
    beforeImports?: string;
    afterImports?: string;
    beforeLocal?: string;
    afterLocal?: string;
    beforeCode?: string;
    afterCode?: string;
}

export function getCode(data: ExportCode, options: MergeCodeOptions = {}): string {
    const { importDeclares, localDeclares = '', code } = data;
    const {
        beforeImports = '',
        afterImports = '',
        beforeLocal = '',
        afterLocal = '',
        beforeCode = '',
        afterCode = ''
    } = options;

    const importDeclare = importDeclares ? Object.entries(importDeclares).map(([module, declares]) => {
        return `declare module '${module}' {\n${declares.map(el => el.declare).join('\n')}\n}\n`;
    }).join('') : '';

    const importStatements = importDeclare ? `${beforeImports}${importDeclare}${afterImports}` : '';
    const localStatements = localDeclares ? `${beforeLocal}${localDeclares}${afterLocal}` : '';
    const codeStatements = `${beforeCode}${code}${afterCode}`;

    return `${importStatements}${localStatements}${codeStatements}`;
}

function formatPath(path: string) {
    return path.replace(/\\/g, '/');
}

/**
 *
 * @param code Source code
 * @param position [line, col], line and column of the position, 1-based
 * @param options
 */
export function getFunctionByPosition(code: string, position: [line: number, col: number], options?: ProjectOptions) {
    const project = new Project(options);
    const sourceFile = project.createSourceFile('temp.ts', code);

    const lines = code.split('\n');
    const line = Math.max(0, Math.min(lines.length, position[0] - 1));
    const col = Math.max(0, Math.min(lines[line].length, position[1] - 1));
    let pos = 0;
    for (let i = 0; i < lines.length && i < line; i++) {
        pos += lines[i].length + 1;
    }
    pos += col;

    const node = sourceFile.getDescendantAtPos(pos);
    if (!node) {
        return undefined;
    }

    const functionNode = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration)
        || node.getFirstAncestorByKind(SyntaxKind.FunctionExpression)
        || node.getFirstAncestorByKind(SyntaxKind.ArrowFunction)
        || node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);

    if (!functionNode) {
        return undefined;
    }

    const classNode = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
    if (classNode) {
        return extractClass(classNode.getName() || "", classNode);
    }

    return extractFunction((functionNode as any).getName?.() || "", functionNode);
}