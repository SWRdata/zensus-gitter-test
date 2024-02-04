
import proj4 from 'proj4';
import { closeSync, openSync, writeSync } from 'node:fs';
import { createProgressBar } from 'work-faster';
import chalk from 'chalk';

proj4.defs('EPSG:3035', '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs');
const projection = proj4('EPSG:3035', 'EPSG:4326').forward;
const project = p => projection(p).map(v => Math.round(v * 1e6) / 1e6);

export class Database {
	pointLookup = new Map();
	points = [];
	data = new Map();
	scale;

	constructor(scale, parent) {
		this.scale = scale;
		if (parent) {
			this.pointLookup = parent.pointLookup;
			this.points = parent.points;
			this.data = parent.data;
		}
	}

	addRow(cell, prop, value) {
		const { x, y } = cell.match(/^100mN(?<y>\d{5})E(?<x>\d{5})$/).groups;
		const point = [parseInt(x, 10), parseInt(y, 10)];
		const key = point.join(',');
		let index;
		if (!this.pointLookup.has(key)) {
			index = this.pointLookup.size;
			this.pointLookup.set(key, index);
			this.points[index] = point;
		} else {
			index = this.pointLookup.get(key)
		}

		let buffer;
		if (!this.data.has(prop)) {
			buffer = new Uint16Array(3200000);
			buffer.fill(0);
			this.data.set(prop, buffer);
		} else {
			buffer = this.data.get(prop);
		}

		buffer[index] = value;
	}

	save(filename) {
		console.log(chalk.red.bold(`Saving ${filename} with ${this.pointLookup.size} features`));

		const keys = Array.from(this.data.keys());
		const n = this.pointLookup.size;
		let buffers = [];
		const fd = openSync(filename, 'w');
		const scale = this.scale;

		const progressBar = createProgressBar(n);
		for (let i = 0; i < n; i++) {
			progressBar.increment()

			const x = this.points[i][0] * scale;
			const y = this.points[i][1] * scale;
			const feature = {
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [[
						[x, y],
						[x, y + scale],
						[x + scale, y + scale],
						[x + scale, y],
						[x, y],
					].map(project)]
				},
				properties: Object.fromEntries(keys.map(key => [key, Math.round(this.data.get(key)[i] * 10) / 10])),
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

	getScaled() {
		console.log(chalk.red.bold(`Scaling to ${this.scale * 2}`));

		const pointLookup = new Map();
		const points = [];
		const data = new Map();
		const matrix = [];

		this.points.forEach((point0, index0) => {
			const point = [point0[0] >>> 1, point0[1] >>> 1];
			const key = point.join(',');

			if (!pointLookup.has(key)) {
				const index = pointLookup.size;
				pointLookup.set(key, index);
				points[index] = point;
				matrix[index] = [index0];
			} else {
				const index = pointLookup.get(key);
				matrix[index].push(index0)
			}
		})

		for (let [key, array0] of this.data.entries()) {
			const array = Float64Array.from(
				matrix,
				indexes0 => indexes0.reduce((s, i0) => s + array0[i0]) / 4
			);

			data.set(key, array);
		}

		return new Database(this.scale * 2, { pointLookup, points, data });
	}
}
