import { run } from './lib/run.js';

const filenameTemplate = 'temp/zensus2011_level%.geojsonl';
const levelMapping = [
	[9, 14],
	[8],
	[7],
	[6],
	[5],
	[4],
]
const layerName = 'zensus';
const fields = [
	'INSGESAMT:Einheiten insgesamt',
	'STAATSANGE_HLND:Deutschland',
	'STAATSANGE_HLND:Polen',
	'STAATSANGE_HLND:Rumänien',
	'STAATSANGE_HLND:Türkei',
	'STAATSANGE_HLND:Ukraine',
	'STAATSANGE_HLND:Sonstige',
	'STAATSANGE_GRP:EU27-Land',
	'STAATSANGE_GRP:Sonstiges Europa',
	'STAATSANGE_GRP:Sonstige Welt',
	'ALTER_KURZ:Unter 18',
	'ALTER_KURZ:18 - 29',
	'ALTER_KURZ:30 - 49',
	'ALTER_KURZ:50 - 64',
	'ALTER_KURZ:65 und älter',
];

await makeTiles();
await joinTiles();
await makeVersaTiles();

async function makeTiles() {
	for (const [index, levels] of levelMapping.entries()) {
		const filename = filenameTemplate.replace('%', index);
		const args = [
			'--read-parallel',
			'--no-feature-limit',
			'--no-tile-size-limit',
			'--minimum-zoom=' + levels[0],
			'--maximum-zoom=' + levels[levels.length - 1],
			'--minimum-detail=12',
			'--layer=' + layerName,
			...fields.map(field => `--include="${field}"`),
			'--force',
			`--output=temp/zensus${index}.mbtiles`,
			filename,
		];
		await run('tippecanoe', args);
	}
}

async function joinTiles() {
	const args = [
		'--layer=' + layerName,
		'--name=' + layerName,
		'--no-tile-size-limit',
		'--force',
		'--output=temp/zensus.mbtiles',
		...levelMapping.map((level, index) => `temp/temp${index}.mbtiles`),
	];
	await run('tile-join', args);
}

async function makeVersaTiles() {
	const args = [
		'convert',
		'--compress=brotli',
		'temp/zensus.mbtiles',
		'temp/zensus.versatiles'
	];
	await run('versatiles', args);
}





