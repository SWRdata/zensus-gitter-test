
import proj4 from 'proj4';
import { closeSync, openSync, writeSync } from 'node:fs';
import { createProgressBar } from 'work-faster';

proj4.defs('EPSG:3035', '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs');
const projection = proj4('EPSG:3035', 'EPSG:4326').forward;
const project = p => projection(p).map(v => Math.round(v * 1e6) / 1e6);

export class Database {
	coordsLookup = new Map();
	coords = [];
	data = new Map();

	constructor() { }

	addRow(cell, propKey, propVal, value, quality) {
		if (!/^\d+$/.test(value)) {
			console.log({ cell, coord, propKey, propVal, value, quality })
			throw Error();
		}

		const { x, y } = cell.match(/^100mN(?<y>\d{5})E(?<x>\d{5})$/).groups;
		const key = x + '_' + y;
		let index;
		if (!this.coordsLookup.has(key)) {
			index = this.coordsLookup.size;
			this.coordsLookup.set(key, index);
			this.coords[index] = [parseInt(x, 10), parseInt(y, 10)];
		} else {
			index = this.coordsLookup.get(key)
		}

		const prop = propKey.replaceAll('"', '').trim() + ':' + propVal.replaceAll('"', '').trim();
		let buffer;
		if (!this.data.has(prop)) {
			buffer = new Uint16Array(3200000);
			buffer.fill(0);
			this.data.set(prop, buffer);
		} else {
			buffer = this.data.get(prop);
		}

		buffer[index] = parseInt(value, 10)
	}

	size() {
		return this.coordsLookup.size;
	}

	save(filename) {
		const keys = Array.from(this.data.keys());
		const n = this.coordsLookup.size;
		let buffers = [];
		const fd = openSync(filename, 'w');

		const progressBar = createProgressBar(n);
		for (let i = 0; i < n; i++) {
			progressBar.increment()

			const x = this.coords[i][0] * 100;
			const y = this.coords[i][1] * 100;
			const feature = {
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [[
						[x, y],
						[x, y + 100],
						[x + 100, y + 100],
						[x + 100, y],
						[x, y],
					].map(project)]
				},
				properties: Object.fromEntries(keys.map(key => [key, this.data.get(key)[i]])),
			}
			buffers.push(Buffer.from(JSON.stringify(feature) + '\n'));
			if (buffers.length > 10000) flush();
		}
		flush();
		closeSync(fd);
		progressBar.close();

		function flush() {
			writeSync(fd, Buffer.concat(buffers));
			buffers = [];
		}
	}
}
