import { Project, ProjectOptions, SourceFile } from "ts-morph";
import { CodeMeta, CodeDetailData, Declare, DependData, ExtractOptions } from "./index.type";
import { getImportDeclarations, getLocalDeclarations } from "./declares";
import { extractFunction } from "./functions";
import { extractClass } from "./class";

export * from './index.type';

export { RenderPropsExtractor } from './props';

export async function read(fileName: string, extractOptions?: ExtractOptions, projectOptions?: ProjectOptions): Promise<CodeDetailData[]> {
    const formatFileName = formatPath(fileName);

    const project = extractOptions?.cachedProject || new Project(projectOptions);
    let sourceFile = project.getSourceFile(formatFileName);
    if (!sourceFile) {
        sourceFile = project.addSourceFileAtPath(formatFileName);
    } else if (extractOptions?.cachedProject) {
        sourceFile.refreshFromFileSystemSync();
    }

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const exportData: Record<string, CodeMeta> = {};
    exportedDeclarations.forEach((declarations, name) => {
        declarations.forEach((declaration) => {
            const sourcePath = formatPath(declaration.getSourceFile().getFilePath());
            if (sourcePath !== formatFileName) {
                return;
            }
            const data = extractFunction(name, declaration, extractOptions) || extractClass(name, declaration, extractOptions);
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

export interface MergeCodeOptions {
    beforeImports?: string;
    afterImports?: string;
    beforeLocal?: string;
    afterLocal?: string;
    beforeCode?: string;
    afterCode?: string;
    maxLength?: number;
}

export function getCode(data: CodeDetailData, options: MergeCodeOptions = {}): string {
    const { importDeclares, localDeclares = '', code } = data;
    const {
        beforeImports = '',
        afterImports = '',
        beforeLocal = '',
        afterLocal = '',
        beforeCode = '',
        afterCode = '',
        maxLength
    } = options;

    const importDeclare = importDeclares ? Object.entries(importDeclares).map(([module, declares]) => {
        return `declare module '${module}' {\n${declares.map(el => el.declare).join('\n')}\n}\n`;
    }).join('') : '';

    const importStatements = importDeclare ? `${beforeImports}${importDeclare}${afterImports}` : '';
    const localStatements = localDeclares ? `${beforeLocal}${localDeclares}${afterLocal}` : '';
    const codeStatements = `${beforeCode}${code}${afterCode}`;

    if (!maxLength) {
        return `${importStatements}${localStatements}${codeStatements}`;
    }

    let attachStr = '';
    const attachments = [importStatements, localStatements];
    const attachLimit = Math.max(0, maxLength - codeStatements.length);
    for (const attach of attachments) {
        if (attach.length + attachStr.length > attachLimit) {
            break;
        }
        attachStr += attach;
    }
    return `${attachStr}${codeStatements}`;
}

function formatPath(path: string) {
    return path.replace(/\\/g, '/');
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