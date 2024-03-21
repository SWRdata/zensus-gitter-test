// Import necessary modules and functions
import { run } from './lib/run.js'; // Utility function to execute shell commands
import { readFileSync } from 'node:fs'; // Node.js function to read files synchronously
import chalk from 'chalk'; // Module for coloring console output

// Template for the filenames of the GeoJSONL files
const filenameTemplate = 'temp/zensus2011_level%.geojsonl';
// Mapping of zoom levels to the corresponding files
const levelMapping = [
	[10, 13], //  100m resolution
	[9],      //  200m resolution
	[8],      //  400m resolution
	[7],      //  800m resolution
	[6],      // 1600m resolution
	[4, 5],   // 3200m resolution
];
const layerName = 'zensus'; // Name of the layer for the vector tiles
// Fields to be included in the vector tiles
const fields = [
	'INSGESAMT: Einheiten insgesamt',
	//'STAATSANGE_HLND: Deutschland',
	//'STAATSANGE_HLND: Polen',
	//'STAATSANGE_HLND: Rumänien',
	'STAATSANGE_HLND: Türkei',
	//'STAATSANGE_HLND: Ukraine',
	//'STAATSANGE_HLND: Sonstige',
	'STAATSANGE_GRP: EU27-Land',
	'STAATSANGE_GRP: Sonstiges Europa',
	'STAATSANGE_GRP: Sonstige Welt',
	//'ALTER_KURZ: Unter 18',
	'ALTER_KURZ: 18 - 29',
	//'ALTER_KURZ: 30 - 49',
	//'ALTER_KURZ: 50 - 64',
	'ALTER_KURZ: 65 und älter',
	'HEIZTYP: Zentralheizung',
	'HEIZTYP: Etagenheizung',
	'NUTZUNG_DETAIL_HHGEN: Vermietet mit aktuell geführtem Haushalt',
	'NUTZUNG_DETAIL_HHGEN: Eigentum mit aktuell geführtem Haushalt',
	'WOHNEIGENTUM: Privatperson -en',
];



// Execute the defined functions in sequence
checkFields();
await makeTiles();
await joinTiles();
await makeVersaTiles();



// Check the presence of specified fields in the last level's GeoJSONL file
function checkFields() {
	console.log(chalk.red.bold('check fields'));
	const filename = filenameTemplate.replace('%', levelMapping.length - 1);
	const keys = new Set();
	readFileSync(filename, 'utf8').split('\n').forEach(line => {
		if (line.length <= 1) return;
		const properties = JSON.parse(line).properties;
		for (let key of Object.keys(properties)) keys.add(key);
	});

	let error = false;
	fields.forEach(field => {
		if (keys.has(field)) return;
		console.log('field missing: ' + field);
		error = true;
	});

	if (error) process.exit();
}

// Generate vector tiles for each specified zoom level range
async function makeTiles() {
	console.log(chalk.red.bold('generate tiles'));
	for (const [index, levels] of levelMapping.entries()) {
		const filename = filenameTemplate.replace('%', index);
		const args = [
			'--read-parallel',
			'--no-feature-limit',
			'--no-tile-size-limit',
			'--no-line-simplification',
			'--no-simplification-of-shared-nodes',
			'--no-tiny-polygon-reduction',
			'--minimum-zoom=' + levels[0],
			'--maximum-zoom=' + levels[levels.length - 1],
			'--minimum-detail=12',
			'--layer=' + layerName,
			...fields.flatMap(field => ['--include', field]),
			'--force',
			`--output=temp/zensus${index}.mbtiles`,
			filename,
		];
		await run('tippecanoe', args);
	}
}

// Join all generated tilesets into a single MBTiles file
async function joinTiles() {
	console.log(chalk.red.bold('join tiles'));
	const args = [
		'--layer=' + layerName,
		'--name=' + layerName,
		'--no-tile-size-limit',
		'--force',
		'--output=temp/zensus.mbtiles',
		...levelMapping.map((level, index) => `temp/zensus${index}.mbtiles`),
	];
	await run('tile-join', args);
}

// Convert the final MBTiles file into VersaTiles format
async function makeVersaTiles() {
	console.log(chalk.red.bold('convert to VersaTiles'));
	const args = [
		'convert',
		'--compress=brotli',
		'temp/zensus.mbtiles',
		'temp/zensus.versatiles'
	];
	await run('versatiles', args);
}
