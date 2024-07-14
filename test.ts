import * as fs from 'fs';
import { read } from './src';

read('./test/code.ts').then(res => res.forEach(({ name, code }) => {
    fs.writeFileSync(`./test/out/${name}.ts`, code);
}));