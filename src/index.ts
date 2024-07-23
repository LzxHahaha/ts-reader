import { Project, ProjectOptions } from "ts-morph";
import { ExportData, ExportCode } from "./index.type";
import { getImportDeclarations, getLocalDeclarations } from "./declares";
import { extractFunction } from "./functions";
import { extractClass } from "./class";

declare global {
    let tsSymbols: Set<string>;
};

export async function read(fileName: string, options?: ProjectOptions): Promise<ExportCode[]> {
    const project = new Project(options);

    const sourceFile = project.addSourceFileAtPath(fileName);

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const imports = sourceFile.getImportDeclarations();
    const importDeclarations = getImportDeclarations(imports);

    const localDeclarations = getLocalDeclarations(sourceFile) as any;

    const exportData: Record<string, ExportData> = {};
    exportedDeclarations.forEach((declarations, name) => {
        declarations.forEach((declaration) => {
            const data = extractFunction(name, declaration) || extractClass(name, declaration);
            if (data) {
                exportData[name] = data;
            }
        });
    });

    const res: ExportCode[] = [];
    for (const funcName in exportData) {
        const { type, name, body, externalIdentifiers } = exportData[funcName];

        let localDeclares = '';
        const importDeclares: Record<string, string[]> = {};
        for (const externalIdentifier of externalIdentifiers) {
            const dep = importDeclarations[externalIdentifier] || localDeclarations[externalIdentifier];
            if (!dep) {
                console.warn(`Cannot find declaration for '${externalIdentifier}' in '${name}'`);
                localDeclares += `declare const ${externalIdentifier}: any;\n`;
                continue;
            }
            if (dep.module) {
                importDeclares[dep.module] = importDeclares[dep.module] || [];
                importDeclares[dep.module].push(dep.text);
            } else {
                localDeclares += (dep.text.startsWith('declare ') ? dep.text : `declare ${dep.text}`) + '\n';
            }
        }


        res.push({
            type,
            name,
            importDeclares,
            localDeclares,
            code: body
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
        return `declare module '${module}' {\n${declares.join('\n')}\n}\n`;
    }).join('') : '';

    const importStatements = importDeclare ? `${beforeImports}${importDeclare}${afterImports}` : '';
    const localStatements = localDeclares ? `${beforeLocal}${localDeclares}${afterLocal}` : '';
    const codeStatements = `${beforeCode}${code}${afterCode}`;

    return `${importStatements}${localStatements}${codeStatements}`;
}
