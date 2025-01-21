import path from 'path';
import { RenderPropsExtractor } from '../props';

describe('RenderPropsExtractor', () => {
    it('should extract props from class component', () => {
        const extractor = new RenderPropsExtractor();
        const result = extractor.extractProps(path.resolve(__dirname, '../mock/mockJsxClass.tsx'), 18);
        expect(result).toBe(true);
        expect(extractor.types.size).toBe(2);
        expect(extractor.types.get('FooProps')?.replaceAll(/\r?\n/g, '')).toBe(`type FooProps = FooPropsBase & {    c?: boolean;}`);
        expect(extractor.types.get('FooPropsBase')?.replaceAll(/\r?\n/g, '')).toBe(`interface FooPropsBase {    a?: number;    b?: string;}`);
    });

    it('should extract props from class component with type', () => {
        const extractor = new RenderPropsExtractor();
        const result = extractor.extractProps(path.resolve(__dirname, '../mock/mockJsxClass.tsx'), 28);
        expect(result).toBe(true);
        expect(extractor.types.size).toBe(1);
        expect(extractor.types.get('__type0')?.replaceAll(/\r?\n/g, '')).toBe(`{ a?: number, b?: string }`);
    });

    it('should extract props from function component', () => {
        const extractor = new RenderPropsExtractor();
        const result = extractor.extractProps(path.resolve(__dirname, '../mock/mockJsxFunc.tsx'), 20);
        expect(result).toBe(true);
        expect(extractor.types.size).toBe(1);
        expect(extractor.types.get('FooProps')?.replaceAll(/\r?\n/g, '')).toBe(`interface FooProps {    a?: number;    b?: string;}`);
    });

    it ('should extract props from function component with inline type', () => {
        const extractor = new RenderPropsExtractor();
        const result = extractor.extractProps(path.resolve(__dirname, '../mock/mockJsxFunc.tsx'), 31);
        expect(result).toBe(true);
        expect(extractor.types.size).toBe(1);
        expect(extractor.types.get('__type0')?.replaceAll(/\r?\n/g, '')).toBe(`{ a?: number, b?: string }`);
    });

    it ('should extract props from function component with inline type and spread', () => {
        const extractor = new RenderPropsExtractor();
        const result = extractor.extractProps(path.resolve(__dirname, '../mock/mockJsxFunc.tsx'), 35);
        expect(result).toBe(true);
        expect(extractor.types.size).toBe(1);
        expect(extractor.types.get('FooProps')?.replaceAll(/\r?\n/g, '')).toBe(`interface FooProps {    a?: number;    b?: string;}`);
    });
});
