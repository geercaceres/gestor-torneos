import type {Config} from './types';

export type Locale='en'|'es';
export const localeOf=(config?:Pick<Config,'locale'>|null):Locale=>config?.locale==='es'?'es':'en';
export const text=(locale:Locale,spanish:string,english:string)=>locale==='es'?spanish:english;
export const languageName=(locale:Locale)=>locale==='es'?'Español':'English';
