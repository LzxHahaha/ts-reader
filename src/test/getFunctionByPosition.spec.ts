import { ExportType, getFunctionByPosition } from "..";
import path from 'path';
import fs from 'fs';

function read(p: string) {
    const file = path.resolve(__dirname, '..', p.endsWith('.ts') ? p : `${p}.ts`);
    return fs.readFileSync(file, 'utf-8').toString();
}

describe('getFunctionByPosition', () => {
    it('function', () => {
        const code = read('./mock/mockFuncOnly');
        const res = getFunctionByPosition(code, [23, 22]);
        expect(res?.type).toBe(ExportType.Function);
    });
    it('arrow function', () => {
        const code = read('./mock/mockFuncOnly');
        const res = getFunctionByPosition(code, [39, 1]);
        expect(res?.type).toBe(ExportType.Function);
    });

    it('class props', () => {
        const code = read('./mock/mockClass');
        const res = getFunctionByPosition(code, [4, 11]);
        expect(res).toBe(undefined);
    });
    it('class member', () => {
        const code = read('./mock/mockClass');
        const res = getFunctionByPosition(code, [30, 24]);
        expect(res?.type).toBe(ExportType.Class);
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
});
