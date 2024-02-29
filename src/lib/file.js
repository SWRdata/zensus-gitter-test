// Import necessary modules from Node.js for filesystem and path manipulation
import { readdirSync, statSync } from 'node:fs'; // Methods for reading directory contents and getting file stats
import { resolve } from 'node:path'; // Method for resolving file paths

// Defines a function to get a list of files with a specific extension from a given directory
export function getFiles(path) {
	return readdirSync(path) // Reads the contents of the directory
		.filter(file => file.endsWith('.csv.br')) // Filters the files to only include ones with a '.csv.br' extension
		.map(file => resolve(path, file)); // Resolves each file to an absolute path
}

// Defines a function to calculate the total size of a list of files
export function getFileSum(files) {
	return files.reduce((sum, file) =>
		sum + statSync(file).size, // Adds the size of each file to the total sum
		0 // Initializes the sum with 0
	);
}
