import type {State,Match} from './types';
export const DEFAULT_RULES:string[];
export function seedState():State;
export function makeMatches(size:number,start?:string,duration?:number,courts?:number):Match[];
export function roundName(round:number,size:number,locale?:'en'|'es'):string;
export function sides(state:State,match:Match):(number|null)[];
export function teamLabel(state:State,id:number|null,fallback?:string):string;
export function participantLabel(state:State,match:Match,side:number):string;
export function replan(state:State,start:string):void;
export function applyAction(state:State,action:{type:string;payload?:Record<string,unknown>},now?:string):State;
export class DomainError extends Error {status:number;}
export function scheduleWarnings(state:State):string[];
export function migrateState(state:State):State;
export function scoringLabel(config:State["config"]):string;
