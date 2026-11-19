export const FPS: number;
export const MARGE_FIN: number;
export function versFrame(secondes: number): number;
export function normaliser(s: string): string;
export function calculerReperes(alignement: {mots: {mot: string; debut: number; fin: number}[]}): import('./Accord').Reperes;
export function reperesAVerifier(r: import('./Accord').Reperes): {nom: string; t: number}[];
