import { Project, ProjectOptions } from "ts-morph";
import { ExportData, FunctionCode } from "./index.type";
import { getImportDeclarations, getLocalDeclarations } from "./declares";
import { extractFunction } from "./functions";
import { extractClass } from "./class";

declare global {
    let tsSymbols: Set<string>;
};

export async function read(fileName: string, options?: ProjectOptions): Promise<FunctionCode[]> {
    const project = new Project(options);

    const sourceFile = project.addSourceFileAtPath(fileName);

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const imports = sourceFile.getImportDeclarations();
    const importDeclarations = getImportDeclarations(imports);

    const localDeclarations = getLocalDeclarations(sourceFile) as any;

    const exportFuncs: Record<string, ExportData> = {};
    exportedDeclarations.forEach((declarations, name) => {
        declarations.forEach((declaration) => {
            const func = extractFunction(name, declaration) || extractClass(name, declaration);
            if (func) {
                exportFuncs[name] = func;
            }
        });
    });

    const res: FunctionCode[] = [];
    for (const funcName in exportFuncs) {
        const { name, body, externalIdentifiers } = exportFuncs[funcName];
        let importDeclare = '';
        let localDeclares = '';
        for (const externalIdentifier of externalIdentifiers) {
            const dep = importDeclarations[externalIdentifier] || localDeclarations[externalIdentifier];
            if (!dep) {
                console.warn(`Cannot find declaration for '${externalIdentifier}' in '${name}'`);
                importDeclare += `declare const ${externalIdentifier}: any;\n`;
                continue;
            }
            if (dep.module) {
                importDeclare += dep.text + '\n';
            } else {
                localDeclares += `${dep.text}\n`;
            }
        }

        let declarationStr = `${importDeclare}${localDeclares}`;
        res.push({
            type: 'function',
            name,
            code: `${declarationStr}${body}`.trim()
        });
    }

    return res;
}

