import { ArrowFunction, ClassDeclaration, FunctionDeclaration, Project, ProjectOptions, SyntaxKind, Type } from "ts-morph";

export interface RenderPropsExtractorOptions {
    maxDepth?: number;
}

export class RenderPropsExtractor {
    #project: Project;
    #anonymousCache = new Map<string, string>();
    #visited = new Set<string>();
    #types = new Map<string, string>();
    #depthCache = new Map<string, number>();
    #componentType?: 'class' | 'function';
    #sourceCode = '';

    #maxDepth = 4;

    constructor(projectOptions?: ProjectOptions, extractOptions?: RenderPropsExtractorOptions) {
        this.#project = new Project(projectOptions);
        if (extractOptions?.maxDepth) {
            this.#maxDepth = extractOptions.maxDepth;
        }
    }

    get types() {
        return this.#types;
    }

    get typeDefines() {
        const arr = Array.from(this.#types.entries());
        arr.sort((a, b) => {
            const depthA = this.#depthCache.get(a[0]) || 0;
            const depthB = this.#depthCache.get(b[0]) || 0;
            return depthA - depthB;
        });
        return arr.map(([, value]) => value);
    }

    get componentType() {
        return this.#componentType;
    }

    get sourceCode() {
        return this.#sourceCode;
    }

    extractProps(filePath: string, line: number, col = 0): boolean {
        const sourceFile = this.#project.addSourceFileAtPath(filePath);
        const text = sourceFile.getFullText();
        let pos = col;
        const lines = text.split("\n");
        for (let i = 0; i < lines.length && i < line; i++) {
            pos += lines[i].length + 1;
        }

        const node = sourceFile.getDescendantAtPos(pos);
        if (!node) {
            return false;
        }

        const classNode = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
        if (this.#getClassProps(classNode)) {
            this.#componentType = 'class';
            this.#sourceCode = classNode?.getText() || '';
            return true;
        }

        let funcNode = node.getFirstAncestorByKind(SyntaxKind.ArrowFunction) || node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration);
        if (!funcNode) {
            const varNode = node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
            if (varNode) {
                funcNode = varNode.getFirstAncestorByKind(SyntaxKind.ArrowFunction) || varNode.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration);
            }
        }
        if (this.#getFunctionProps(funcNode)) {
            this.#componentType = 'function';
            this.#sourceCode = funcNode?.getText() || '';
            return true;
        }
        return false;
    }

    #getClassProps(classNode: ClassDeclaration | undefined): boolean {
        if (!classNode) {
            return false;
        }
        let isReact = false;
        const funcs = classNode.getMethods();
        for (const func of funcs) {
            if (func.getName() === "render") {
                isReact = true;
                break;
            }
        }
        if (!isReact) {
            return false;
        }
        const debugtext = classNode.getText();
        const baseTypes = classNode.getHeritageClauses()
            .map(clause => clause.getTypeNodes())
            .map(types => types[0].getType());
        if (!baseTypes[0]) {
            return false;
        }
        const type = baseTypes[0].getTypeArguments();
        if (!type.length) {
            return false;
        }
        this.#getPropsType(type[0]);
        return this.#types.size > 0;
    }

    #getFunctionProps(funcNode: ArrowFunction | FunctionDeclaration | undefined): boolean {
        if (!funcNode) {
            return false;
        }

        const args = funcNode.getParameters();
        const debugtext = args.map(arg => arg.getText()).join(', ');
        args[0] && this.#getPropsType(args[0].getType());
        return this.#types.size > 0;
    }

    #getPropsType(type: Type, depth = 0) {
        if (depth >= this.#maxDepth) {
            return;
        }
        const symbol = type.getAliasSymbol() || type.getSymbol();
        if (!symbol) {
            if (type.isIntersection()) {
                type.getIntersectionTypes().forEach(t => {
                    if (t.isAnonymous()) {
                        return;
                    }
                    this.#getPropsType(t, depth + 1);
                });
            }
            return;
        }
        let symbolName = symbol.getName();
        if (!symbolName || symbolName === '__type') {
            const text = type.getText();
            const key = this.#anonymousCache.get(text);
            if (key) {
                symbolName = key;
            } else {
                symbolName = `__type${this.#anonymousCache.size}`;
                this.#anonymousCache.set(text, symbolName);
            }
        }
        if (this.#types.has(symbolName) || this.#visited.has(symbolName)) {
            return;
        }
        this.#visited.add(symbolName);
        let declarationTexts: string[] = [];
        const declarations = symbol.getDeclarations();
        if (!declarations) {
            return;
        }
        const filePath = declarations[0]?.getSourceFile()?.getFilePath();
        let queue: Type[] = [];
        for (const declaration of declarations) {
            declarationTexts.push(declaration.getText());
            const hierarchy = declaration.getDescendantsOfKind(SyntaxKind.ExpressionWithTypeArguments).map(el => el.getType());
            const dependencies = declaration.getDescendantsOfKind(SyntaxKind.TypeReference).map(node => node.getType());
            queue = queue.concat(hierarchy).concat(dependencies);
        }
        if (filePath && !filePath.includes('node_modules') && !filePath.includes('libs.')) {
            const text = declarationTexts.join('\n');
            // skip Template Parameters
            if (text !== symbolName) {
                this.#types.set(symbolName, text);
                this.#depthCache.set(symbolName, depth);
            }
        }
        for (const type of queue) {
            this.#getPropsType(type, depth + 1);
        }
    }
}