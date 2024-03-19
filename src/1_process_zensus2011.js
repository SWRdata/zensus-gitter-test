// Import necessary modules for file reading, decompression, and utility functions
import { createReadStream } from 'node:fs';
import { createBrotliDecompress } from 'node:zlib';
import * as miss from 'mississippi2';
import { getFileSum, getFiles } from './lib/file.js';
import { Database } from './lib/database.js';
import { TextDecoder } from 'node:util';
import { createProgressBar } from 'work-faster';
import chalk from 'chalk';

// Change the current working directory to the parent directory of this script
process.chdir(new URL('../', import.meta.url).pathname);

// Retrieve file paths for processing, hardcoding specific files for inclusion
let files = getFiles('data/zensus2011');
files = [
	'data/zensus2011/zensus2011_bevoelkerung_100m.csv.br',
	'data/zensus2011/zensus2011_gebaeude_100m.csv.br',
	'data/zensus2011/zensus2011_wohnungen_100m.csv.br'
];

// Log the number of files to be processed
console.log(chalk.red.bold(`Reading ${files.length} files`));

// Initialize a new Database instance with a scale of 100
let data = new Database(100);
// Create a progress bar to visually track the process based on the total size of files
const progressBar = createProgressBar(getFileSum(files));

// Process each file asynchronously
for (const file of files) {
	let fields, separator;
	// Create a text decoder for the specific character encoding of the data files
	const decoder = new TextDecoder('iso8859-2');

	// Use the 'mississippi2' utility library to handle streaming and processing of the file data
	await new Promise(res => miss.each(
		miss.pipeline(
			createReadStream(file), // Read the file as a stream
			miss.spy(chunk => progressBar.increment(chunk.length)), // Update the progress bar with each chunk read
			createBrotliDecompress(), // Decompress the data using Brotli
			miss.through((chunk, enc, cb) => cb(null, decoder.decode(chunk, { stream: true }))), // Decode the chunk and continue streaming
			miss.split(/\r?\n/) // Split the stream into lines
		),
		(line, next) => {
			// Process each line to extract and store data in the Database instance
			line = line.toString();
			if (!fields) {
				// Determine the separator used in the CSV file and parse the header row to identify columns
				separator = line.includes(';') ? ';' : ',';
				line = line.split(separator);
				line = Object.fromEntries(line.map((k, i) => [k, i]));

				fields = {
					cell: line.Gitter_ID_100m,
					propKey: line.Merkmal,
					propVal: line.Auspraegung_Text,
					value: line.Anzahl,
				};
				if (Object.values(fields).some(field => field == null)) {
					console.log(line);
					throw Error('Some of the columns are missing. Expected columns "Gitter_ID_100m", "Merkmal", "Auspraegung_Text" and "Anzahl"');
				}
			} else {
				// For subsequent lines, extract data using the field indices and add it to the database
				line = line.split(separator);
				data.addRow(
					line[fields.cell],
					[
						line[fields.propKey],
						line[fields.propVal]
					].map(v => v
						.replace(/[^\wäöüß\-_]+/gi, ' ')
						.trim()
					).join(': '),
					parseInt(line[fields.value], 10),
				);
			}
			next(); // Continue to the next line
		},
		res // Resolve the promise once the entire file has been processed
	));
}
progressBar.close(); // Close the progress bar after all files are processed

// Save the processed data at multiple scales as GeoJSONL files
const maxLevel = 5;
for (let level = 0; level <= maxLevel; level++) {
	data.save(`temp/zensus2011_level${level}.geojsonl`);
	if (level < maxLevel) {
		data = data.getScaled();
	}
}

// Log completion
console.log(chalk.red.bold('Finished'));
