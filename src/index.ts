import { Project, ProjectOptions, SourceFile, SyntaxKind, Node } from "ts-morph";
import { CodeMeta, CodeDetailData, Declare, DependData, CodeType, CodeBaseInfo } from "./index.type";
import { getImportDeclarations, getLocalDeclarations } from "./declares";
import { extractFunction } from "./functions";
import { extractClass } from "./class";
import { extractType } from "./type";

export * from './index.type';

export async function read(fileName: string, options?: ProjectOptions): Promise<CodeDetailData[]> {
    const project = new Project(options);

    const formatFileName = formatPath(fileName);
    const sourceFile = project.addSourceFileAtPath(formatFileName);

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const exportData: Record<string, CodeMeta> = {};
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

    const { importDeclarations, localDeclarations } = getFileDeclarations(sourceFile);
    const res: CodeDetailData[] = [];
    for (const dataKey in exportData) {
        res.push(getCodeDetails(exportData[dataKey], importDeclarations, localDeclarations));
    }

    return res;
}

export async function getExportedList(fileName: string, options?: ProjectOptions) {
    const project = new Project({
        skipFileDependencyResolution: true,
        ...options
    });

    const formatFileName = formatPath(fileName);
    const sourceFile = project.addSourceFileAtPath(formatFileName);

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const result: CodeBaseInfo[] = [];
    exportedDeclarations.forEach((declarations, name) => {
        declarations.forEach((declaration) => {
            const sourcePath = formatPath(declaration.getSourceFile().getFilePath());
            if (sourcePath !== formatFileName) {
                return;
            }
            const data = extractFunction(name, declaration) || extractClass(name, declaration);
            if (!data) {
                return;
            }
            if (data.type === CodeType.Function) {
                result.push({
                    type: CodeType.Function,
                    name,
                    linesRange: data.linesRange
                });
            } else if (data.type === CodeType.Class) {
                result.push({
                    type: CodeType.Class,
                    name,
                    linesRange: data.linesRange,
                    functions: data.classFunctions?.map(el => ({ name: el.name, linesRange: el.linesRange })) || []
                });
            }
        });
    });
    return result;

}

export interface MergeCodeOptions {
    beforeImports?: string;
    afterImports?: string;
    beforeLocal?: string;
    afterLocal?: string;
    beforeCode?: string;
    afterCode?: string;
}

export function getCode(data: CodeDetailData, options: MergeCodeOptions = {}): string {
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

type FilePosition = [line: number, col: number];

export function getCodeInFile(filePath: string, position: FilePosition, options?: ProjectOptions): { details: CodeDetailData, targetMeta: CodeMeta } | undefined {
    const project = new Project({
        ...options,
    });
    const formatFileName = formatPath(filePath);
    const sourceFile = project.addSourceFileAtPath(formatFileName);
    return getCodeInSourceFile(sourceFile, position);
}

function getCodeInSourceFile(sourceFile: SourceFile, position: FilePosition): { details: CodeDetailData, targetMeta: CodeMeta } | undefined {
    const code = sourceFile.getText();
    const lines = code.split('\n');
    // transform 1-based to 0-based
    const line = Math.max(0, Math.min(lines.length - 1, position[0] - 1));
    const col = Math.max(0, Math.min(lines[line].length - 1, position[1] - 1));
    let pos = 0;
    for (let i = 0; i < lines.length && i < line; i++) {
        pos += lines[i].length + 1;
    }
    pos += col;

    const node = sourceFile.getDescendantAtPos(pos);
    if (!node) {
        return undefined;
    }

    const type = getTypeByNode(sourceFile, node);
    if (type) {
        return type;
    }
    return getFunctionByNode(sourceFile, node, position);
}

function getTypeByNode(sourceFile: SourceFile, node: Node): { details: CodeDetailData, targetMeta: CodeMeta } | undefined {
    const typeNode = node.getFirstAncestorByKind(SyntaxKind.TypeAliasDeclaration)
        || node.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration);
    if (!typeNode) {
        return undefined;
    }
    const { importDeclarations, localDeclarations } = getFileDeclarations(sourceFile);
    const targetMeta = extractType(typeNode.getName(), typeNode);
    if (!targetMeta) {
        return undefined;
    }
    return {
        details: getCodeDetails(targetMeta, importDeclarations, localDeclarations),
        targetMeta
    }
}

function getFunctionByNode(sourceFile: SourceFile, node: Node, position: FilePosition): { details: CodeDetailData, targetMeta: CodeMeta } | undefined {
    const functionNode = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration)
        || node.getFirstAncestorByKind(SyntaxKind.FunctionExpression)
        || node.getFirstAncestorByKind(SyntaxKind.ArrowFunction)
        || node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);

    if (!functionNode) {
        return undefined;
    }

    const classNode = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);

    let detailsMeta: CodeMeta | undefined;
    let targetMeta: CodeMeta | undefined;
    if (classNode) {
        detailsMeta = extractClass(classNode.getName() || "", classNode);
        const member = detailsMeta?.classFunctions?.find(el => el.linesRange[0] <= position[0] && position[0] <= el.linesRange[1]);
        if (!member) {
            return undefined;
        }
        targetMeta = {
            ...member,
            type: CodeType.ClassMember
        }
    } else {
        let name = '';
        if (functionNode.getKind() === SyntaxKind.ArrowFunction) {
            const parent = functionNode.getParent();
            if (parent.getKind() === SyntaxKind.VariableDeclaration) {
                name = parent.asKind(SyntaxKind.VariableDeclaration)!.getName();
            }
        } else {
            name = (functionNode as any).getName?.() || "";
        }
        detailsMeta = extractFunction(name, functionNode);
        targetMeta = detailsMeta;
    }

    if (!detailsMeta || !targetMeta) {
        return undefined;
    }

    const { importDeclarations, localDeclarations } = getFileDeclarations(sourceFile);
    return {
        details: getCodeDetails(detailsMeta, importDeclarations, localDeclarations),
        targetMeta
    };
}

function getFileDeclarations(sourceFile: SourceFile) {
    const imports = sourceFile.getImportDeclarations();
    const importDeclarations = getImportDeclarations(imports);
    const localDeclarations = getLocalDeclarations(sourceFile);

    return {
        importDeclarations,
        localDeclarations
    }
}

function getCodeDetails(codeData: CodeMeta, importDeclarations: Record<string, DependData>, localDeclarations: Record<string, DependData>): CodeDetailData {
    const { type, name, body, externalIdentifiers, classFunctions, linesRange } = codeData;

    let localDeclares = '';
    const importDeclares: Record<string, Declare[]> = {};
    for (const externalIdentifier of externalIdentifiers || []) {
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

    return {
        type,
        name,
        importDeclares,
        localDeclares,
        code: body.trim(),
        classFunctions,
        linesRange
    };
}