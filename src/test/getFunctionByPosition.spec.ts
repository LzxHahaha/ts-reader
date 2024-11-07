import { CodeType, getFunctionByPosition, getFunctionInFile } from "..";
import path from 'path';
import fs from 'fs';

function read(p: string) {
    const file = path.resolve(__dirname, '..', (p.endsWith('.ts') || p.endsWith('.tsx')) ? p : `${p}.ts`);
    return fs.readFileSync(file, 'utf-8').toString().replaceAll('// @ts-nocheck', '');
}

describe('getFunctionByPosition', () => {
    it('function', () => {
        const code = read('./mock/mockFuncOnly');
        const res = getFunctionByPosition(code, [23, 22]);
        expect(res?.targetMeta?.type).toBe(CodeType.Function);
    });
    it('arrow function', () => {
        const code = read('./mock/mockFuncOnly');
        const res = getFunctionByPosition(code, [39, 1]);
        expect(res?.targetMeta?.type).toBe(CodeType.Function);
    });

    it('class props', () => {
        const code = read('./mock/mockClass');
        const res = getFunctionByPosition(code, [4, 11]);
        expect(res).toBe(undefined);
    });
    it('class member', () => {
        const code = read('./mock/mockClass');
        const res = getFunctionByPosition(code, [30, 24]);
        expect(res?.targetMeta?.type).toBe(CodeType.ClassMember);
    });

    it('interface function define', () => {
        const code = read('./mock/mockTypes');
        const res = getFunctionByPosition(code, [3, 26]);
        expect(res).toBe(undefined);
    });

    it('interface props', () => {
        const code = read('./mock/mockTypes');
        const res = getFunctionByPosition(code, [10, 20]);
        expect(res).toBe(undefined);
    });

    it('overflow', () => {
        const code = read('./mock/mockFuncOnly');
        let res = getFunctionByPosition(code, [0, 0]);
        expect(res).toBe(undefined);
        res = getFunctionByPosition(code, [999, 999]);
        expect(res?.targetMeta?.type).toBe(CodeType.Function);
    });

    it('jsx function', () => {
        const code = read('./mock/mockJsxFunc.tsx');
        const res = getFunctionByPosition(code, [8, 15], {
            tempFileName: 'mockJsxFunc.tsx'
        });
        expect(res?.targetMeta?.type).toBe(CodeType.Function);
    });

    it('jsx function in file', () => {
        const res = getFunctionInFile(path.resolve(__dirname, '..', './mock/mockJsxFunc.tsx'), [8, 15]);
        expect(res?.targetMeta?.type).toBe(CodeType.Function);
    });
});
