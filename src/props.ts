import { ArrowFunction, ClassDeclaration, FunctionDeclaration, Project, ProjectOptions, SyntaxKind, Type } from "ts-morph";

export class RenderPropsExtractor {
    #project: Project;
    #types = new Map<string, string>();
    #componentType?: 'class' | 'function';
    #sourceCode = '';
    #anonymousTypeCount = 0;

    constructor(options?: ProjectOptions) {
        this.#project = new Project(options);
    }

    get types() {
        return this.#types;
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
        let baseTypes = classNode.getBaseTypes();
        if (!baseTypes.length) {
            classNode.getHeritageClauses()
                .map(clause => clause.getTypeNodes())
                .map(types => types[0].getType());
        }
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

    #getPropsType(type: Type) {
        const symbol = type.getAliasSymbol() || type.getSymbol();
        if (!symbol) {
            if (type.isIntersection()) {
                type.getIntersectionTypes().forEach(t => {
                    if (t.isAnonymous()) {
                        return;
                    }
                    this.#getPropsType(t);
                });
            }
            return;
        }
        let symbolName = symbol.getName();
        if (!symbolName || symbolName === '__type') {
            symbolName = `__type${this.#anonymousTypeCount++}`;
        }
        if (this.#types.has(symbolName)) {
            return;
        }
        let declarationTexts: string[] = [];
        const declarations = symbol.getDeclarations();
        if (!declarations) {
            return;
        }
        const filePath = declarations[0]?.getSourceFile()?.getFilePath();
        let queue: Type[] = [];
        for (const declaration of declarations) {
            declarationTexts.push(declaration.getText());
            const dependencies = declaration.getDescendantsOfKind(SyntaxKind.TypeReference).map(node => node.getType());
            queue = queue.concat(dependencies);
        }
        if (filePath && !filePath.includes('node_modules') && !filePath.includes('libs.')) {
            const text = declarationTexts.join('\n');
            // skip Template Parameters
            text !== symbolName && this.#types.set(symbolName, text);
        }
        for (const type of queue) {
            this.#getPropsType(type);
        }
    }
}