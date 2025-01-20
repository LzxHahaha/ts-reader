import { Project, ProjectOptions, SourceFile, SyntaxKind, Node, Type } from "ts-morph";
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

export async function getDeclartionList(fileName: string, options?: {
    exportedOnly?: boolean;
} & ProjectOptions): Promise<CodeBaseInfo[]> {
    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true,
        ...options
    });

    const formatFileName = formatPath(fileName);
    const sourceFile = project.addSourceFileAtPath(formatFileName);

    const result: CodeBaseInfo[] = [];

    const functions = sourceFile.getFunctions();
    functions.forEach((func) => {
        if (options?.exportedOnly && !func.isExported()) {
            return;
        }
        result.push({
            type: CodeType.Function,
            name: func.getName() || "default",
            linesRange: [func.getStartLineNumber(), func.getEndLineNumber()]
        });
    });

    const classes = sourceFile.getClasses();
    classes.forEach((cls) => {
        if (options?.exportedOnly && !cls.isExported()) {
            return;
        }
        result.push({
            type: CodeType.Class,
            name: cls.getName() || "default",
            linesRange: [cls.getStartLineNumber(), cls.getEndLineNumber()],
            functions: cls.getMethods().map(el => ({ name: el.getName(), linesRange: [el.getStartLineNumber(), el.getEndLineNumber()] }))
        });
    });

    const interfaces = sourceFile.getInterfaces();
    interfaces.forEach((inter) => {
        if (options?.exportedOnly && !inter.isExported()) {
            return;
        }
        result.push({
            type: CodeType.TypeDefine,
            name: inter.getName() || "default",
            linesRange: [inter.getStartLineNumber(), inter.getEndLineNumber()]
        });
    });

    const types = sourceFile.getTypeAliases();
    types.forEach((type) => {
        if (options?.exportedOnly && !type.isExported()) {
            return;
        }
        result.push({
            type: CodeType.TypeDefine,
            name: type.getName() || "default",
            linesRange: [type.getStartLineNumber(), type.getEndLineNumber()]
        });
    });

    const enums = sourceFile.getEnums();
    enums.forEach((en) => {
        if (options?.exportedOnly && !en.isExported()) {
            return;
        }
        result.push({
            type: CodeType.Enum,
            name: en.getName() || "default",
            linesRange: [en.getStartLineNumber(), en.getEndLineNumber()]
        });
    });

    const vars = sourceFile.getVariableDeclarations();
    vars.forEach((v) => {
        if (options?.exportedOnly && !v.isExported()) {
            return;
        }
        const type = checkVarType(v.getType());
        type != null && result.push({
            type,
            name: v.getName() || "default",
            linesRange: [v.getStartLineNumber(), v.getEndLineNumber()]
        });
    });

    const defaultExport = sourceFile.getExportedDeclarations().get("default")?.[0];
    if (defaultExport) {
        const type = checkVarType(defaultExport.getType());
        type != null && result.push({
            type,
            name:  "default",
            linesRange: [defaultExport.getStartLineNumber(), defaultExport.getEndLineNumber()]
        });
    }

    return result;
}

function checkVarType(type?: Type<any>): CodeType | undefined {
    if (!type) {
        return;
    }
    if (type.getConstructSignatures().length > 0) {
        return CodeType.Class;
    } else if (type.getCallSignatures().length > 0) {
        return CodeType.Function;
    } else if (type.isInterface()) {
        return CodeType.TypeDefine;
    }
    if (type.getAliasSymbol()) {
        return CodeType.TypeDefine;
    }
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
    for (const [externalIdentifier, declStr] of externalIdentifiers || new Map()) {
        const dep = importDeclarations[externalIdentifier] || localDeclarations[externalIdentifier];
        if (!dep) {
            if (declStr) {
                localDeclares += declStr + '\n';
            } else {
                console.warn(`Cannot find declaration for '${externalIdentifier}' in '${name}'`);
                localDeclares += `declare const ${externalIdentifier}: any;\n`;
            }
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