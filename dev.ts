import fs from 'fs';
import { read } from './src';

read('./dev/code.ts').then(res => res.forEach(({ name, code }) => {
    fs.writeFileSync(`./test/out/test.${name}.ts`, code);
}));