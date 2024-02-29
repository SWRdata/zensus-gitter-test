// Importing the `spawn` function from the Node.js `child_process` module.
// This function is used to launch a new process with a given command.
import { spawn } from 'node:child_process';

// Defines an asynchronous function named `run` that executes a specified shell command.
export async function run(command, args) {
	// Returns a promise that resolves when the command execution is complete or rejects if an error occurs.
	return new Promise((res, rej) => {
		// The `spawn` function is called with the command to execute, along with any arguments for the command.
		// The `{ stdio: 'inherit' }` option is passed so the spawned process inherits the standard input, output, and error streams of the parent process.
		spawn(command, args, { stdio: 'inherit' })
			.on('error', error => rej(error)) // Listens for the 'error' event. If an error occurs, the promise is rejected with the error.
			.on('close', () => res()); // Listens for the 'close' event. Once the process closes (finishes execution), the promise is resolved.
	});
}
