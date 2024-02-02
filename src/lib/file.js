
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function getFiles(path) {
	return readdirSync(path)
		.filter(file => file.endsWith('.csv.br'))
		.map(file => resolve(path, file));
}

export function getFileSum(files) {
	return files.reduce((sum, file) => sum + statSync(file).size, 0)
}
