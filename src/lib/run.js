
import { spawn } from 'node:child_process';

export async function run(command, args) {
	return new Promise((res, rej) => {
		spawn(command, args, { stdio: 'inherit' })
			.on('error', error => rej(error))
			.on('close', () => res());
	})
}
