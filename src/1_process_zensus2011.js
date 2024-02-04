
import { createReadStream } from 'node:fs';
import { createBrotliDecompress } from 'node:zlib';
import * as miss from 'mississippi2';
import { getFileSum, getFiles } from './lib/file.js';
import { Database } from './lib/database.js';
import { TextDecoder } from 'node:util';
import { createProgressBar } from 'work-faster';
import chalk from 'chalk';

process.chdir(new URL('../', import.meta.url).pathname);

let files = getFiles('data/zensus2011');
files = ['data/zensus2011/zensus2011_bevoelkerung_100m.csv.br'];
//files = ['data/zensus2011/extract.csv.br'];

console.log(chalk.red.bold(`Reading ${files.length} files`));

let data = new Database(100);
const progressBar = createProgressBar(getFileSum(files));

for (const file of files) {
	let fields, separator;
	const decoder = new TextDecoder('iso8859-2');

	await new Promise(res => miss.each(
		miss.pipeline(
			createReadStream(file),
			miss.spy(chunk => progressBar.increment(chunk.length)),
			createBrotliDecompress(),
			miss.through((chunk, enc, cb) => cb(null, decoder.decode(chunk, { stream: true }))),
			miss.split(/\r?\n/)
		),
		(line, next) => {
			line = line.toString();
			if (!fields) {
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
					throw Error();
				}
			} else {
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
			next()
		},
		res
	))
}
progressBar.close();

const maxLevel = 5;
for (let level = 0; level <= maxLevel; level++) {
	data.save(`temp/zensus2011_level${level}.geojsonl`);
	if (level < maxLevel) {
		data = data.getScaled();
	}
}

console.log(chalk.red.bold('Finished'));
