想要获取函数中引用的所有非函数内声明的字段类型，可以使用ts-morph分析函数体内的节点，找到所有引用，并确定这些引用是否来自函数外部的范围。你接着可以分析这些引用的声明，获取其类型信息。下面我提供一个使用ts-morph进行此类分析的示例：

import { Project, SyntaxKind } from "ts-morph";

// 假设我们要分析的 TypeScript 代码在 code.ts 文件中
const project = new Project();
const sourceFile = project.addSourceFileAtPath("code.ts");

// 找到目标函数（根据函数名或其他方式）
const myFunction = sourceFile.getFunctionOrThrow("functionName");

// 分析函数并收集非本地声明的引用变量
const referencedSymbols = myFunction.getBodyOrThrow().getDescendantsOfKind(SyntaxKind.Identifier)
.map(identifier => identifier.getSymbol())
.filter((symbol): symbol is NonNullable<typeof symbol> => !!symbol)
.filter(symbol => {
    // 确保符号的声明不在函数内部
    const declarations = symbol.getDeclarations();
    return declarations.length > 0 && !myFunction.isAncestorOf(declarations[0]);
});

// 对于每个引用的符号，打印出其类型
referencedSymbols.forEach(symbol => {
    const declarations = symbol.getDeclarations();
    if (declarations.length > 0) {
        const declaration = declarations[0];
        const type = declaration.getType();
        const typeText = type.getText(declaration);
        console.log(`Referenced symbol: ${symbol.getName()}, Type: ${typeText}`);
    }
});
这段代码先定位到函数声明，然后获取函数体内所有标识(Identifier)符号的引用，过滤出不在函数作用域内声明的符号。接着，对于每一个这样的外部符号，我们获取其声明和类型，打印出其名称和类型。

在实践中，你可能需要根据你的具体情况进行适当的修改或优化。此外，如果这些变量是从其他文件导入的，可能还需要通过查找该符号的导出声明来进一步确定其类型信息。