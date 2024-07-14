import { Project } from "ts-morph";
import { ExportData, FunctionCode } from "./index.type";
import { getImportDeclarations, getLocalDeclarations } from "./deps";
import { extractFunction } from "./functions";


export async function read(fileName: string): Promise<FunctionCode[]> {
    const project = new Project();

    const sourceFile = project.addSourceFileAtPath(fileName);

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    const imports = sourceFile.getImportDeclarations();
    const importDeclarations = getImportDeclarations(imports);

    const localDeclarations = getLocalDeclarations(sourceFile) as any;

    const exportFuncs: Record<string, ExportData> = {};
    exportedDeclarations.forEach((declarations, name) => {
        declarations.forEach((declaration) => {
            const func = extractFunction(name, declaration);
            if (func) {
                exportFuncs[name] = func;
            }
        });
    });

    const res: FunctionCode[] = [];
    for (const funcName in exportFuncs) {
        const { name, body, externalIdentifiers } = exportFuncs[funcName];
        const dependedModules: Record<string, string[]> = {};
        let localDeclares = '';
        for (const externalIdentifier of externalIdentifiers) {
            const dep = importDeclarations[externalIdentifier] || localDeclarations[externalIdentifier];
            if (!dep) {
                console.warn(`Cannot find declaration for '${externalIdentifier}' in '${name}'`);
                continue;
            }
            if (dep.module) {
                if (!dependedModules[dep.module]) {
                    dependedModules[dep.module] = [];
                }
                dependedModules[dep.module].push(dep.text);
            } else {
                localDeclares += `${dep.text}\n`;
            }
        }

        let declarationStr = '';
        for (const module in dependedModules) {
            declarationStr += `${dependedModules[module].join('\n')}`;
        }
        res.push({
            name,
            code: `${declarationStr}\n${localDeclares}${body}`.trim()
        });
    }

    return res;
}

