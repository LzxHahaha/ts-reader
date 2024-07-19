# TS-Code-Extractor

Extract Typescript exported code.

## Dev

`npm run test`

## Use

```typescript
import { read } from 'ts-code-extractor';

read('file path', {
    // ts-morph project options
}).then(res => {
    // ...
});
```
