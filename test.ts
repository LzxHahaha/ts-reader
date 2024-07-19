import * as fs from 'fs';
import { read } from './src';

read('C:/Users/zuxuanliang/codessd/msnews-experiences/libs/weather-shared/src/WeatherCard/WeatherCardNowcastAccumulationUtils.ts').then(res => res.forEach(({ name, code }) => {
    fs.writeFileSync(`./test/out/WeatherCardNowcastAccumulationUtils.${name}.ts`, code);
}));