import fs from 'fs';
import { read } from '../src';

read('./code.ts').then(res => res.forEach(({ name, code }) => {
    fs.writeFileSync(`./out/test.${name}.ts`, code);
}));