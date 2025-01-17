import { CodeType, getCodeInFile } from "..";
import path from 'path';

describe('getCodeInFile', () => {
    it('jsx function in file', () => {
        const res = getCodeInFile(path.resolve(__dirname, '..', './mock/mockJsxFunc.tsx'), [8, 15]);
        expect(res?.targetMeta?.type).toBe(CodeType.Function);
    });
    it('interface in file', () => {
        const res = getCodeInFile(path.resolve(__dirname, '..', './mock/mockTypes.ts'), [8, 21]);
        expect(res?.targetMeta?.type).toBe(CodeType.TypeDefine);
        expect(Array.from(res?.targetMeta?.externalIdentifiers?.keys() || [])).toEqual(['InterfaceA', 'InterfaceAny', 'InterfaceT']);
    });
    it('interface in file2', () => {
        const res = getCodeInFile(path.resolve(__dirname, '..', './mock/mockTypes.ts'), [14, 21]);
        expect(res?.targetMeta?.type).toBe(CodeType.TypeDefine);
        expect(Array.from(res?.targetMeta?.externalIdentifiers?.keys() || [])).toEqual(['InterfaceB', 'InterfaceA', 'InterfaceAny', 'InterfaceT']);
    });
});
