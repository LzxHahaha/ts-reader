import path from 'path';
import { CodeType, getDeclartionList } from '..';

describe("getDeclartionList", () => {
    it("get exported", async () => {
        const res = await getDeclartionList(path.resolve(__dirname, '..', './mock/declartion.ts'), {
            exportedOnly: true
        });
        const items = res.map(el => ({
            name: el.name,
            type: el.type,
        })).sort((a, b) => a.name.localeCompare(b.name));
        expect(items).toEqual([
            { name: 'clsB', type: CodeType.Class },
            { name: 'clsD', type: CodeType.Class },
            { name: 'clsEF', type: CodeType.Class },
            { name: 'default', type: CodeType.Function },
            { name: 'fooB', type: CodeType.Function },
            { name: 'fooD', type: CodeType.Function },
            { name: 'IB', type: CodeType.TypeDefine },
            { name: 'TB', type: CodeType.TypeDefine },
            { name: 'TC', type: CodeType.TypeDefine },
        ]);
    });
    it("get all", async () => {
        const res = await getDeclartionList(path.resolve(__dirname, '..', './mock/declartion.ts'));
        const items = res.map(el => ({
            name: el.name,
            type: el.type,
        })).sort((a, b) => a.name.localeCompare(b.name));
        expect(items).toEqual([
            { name: 'clsA', type: CodeType.Class },
            { name: 'clsB', type: CodeType.Class },
            { name: 'clsC', type: CodeType.Class },
            { name: 'clsD', type: CodeType.Class },
            { name: 'clsEF', type: CodeType.Class },
            { name: 'default', type: CodeType.Function },
            { name: 'fooA', type: CodeType.Function },
            { name: 'fooB', type: CodeType.Function },
            { name: 'fooC', type: CodeType.Function },
            { name: 'fooD', type: CodeType.Function },
            { name: 'IA', type: CodeType.TypeDefine },
            { name: 'IB', type: CodeType.TypeDefine },
            { name: 'TA', type: CodeType.TypeDefine },
            { name: 'TB', type: CodeType.TypeDefine },
            { name: 'TC', type: CodeType.TypeDefine },
            { name: 'wrapClx', type: CodeType.Function },
        ]);
    });
});
