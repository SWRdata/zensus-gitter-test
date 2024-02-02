
import { createReadStream } from 'node:fs';
import { createBrotliDecompress } from 'node:zlib';
import * as miss from 'mississippi2';
import { getFileSum, getFiles } from './lib/file.js';
import { Database } from './lib/database.js';
import { TextDecoder } from 'node:util';

process.chdir(new URL('../', import.meta.url).pathname);

let files = getFiles('data/zensus2011');
files = ['data/zensus2011/zensus2011_familie_100m.csv.br'];
const fileSum = getFileSum(files);
let filePos = 0;

const data = new Database();
for (const file of files) {
	let header, separator;
	const decoder = new TextDecoder('iso8859-2');
	console.log(file);
	await new Promise(res => miss.each(
		miss.pipeline(
			createReadStream(file),
			miss.spy(chunk => {
				filePos += chunk.length;
				process.stderr.write(`\r${(100 * filePos / fileSum).toFixed(1)}%`);
			}),
			createBrotliDecompress(),
			miss.through((chunk, enc, cb) => cb(null, decoder.decode(chunk, { stream: true }))),
			miss.split(/\r?\n/)
		),
		(line, next) => {
			line = line.toString();
			if (!header) {
				separator = line.includes(';') ? ';' : ',';
				line = line.split(separator);
				line = Object.fromEntries(line.map((k, i) => [k, i]));

				header = [line.Gitter_ID_100m, line.Merkmal, line.Auspraegung_Text, line.Anzahl, line.Anzahl_q];
				if (header.some(field => field == null)) {
					console.log(line);
					throw Error();
				}
			} else {
				line = line.split(separator);
				line = header.map(i => line[i]);
				data.addRow(...line);
			}
			next()
		},
		res
	))
}

console.log('\nSaving...');
data.save('zensus2011.geojsonl');

console.log('\nFinished');
