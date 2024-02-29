// Importing necessary modules and libraries
import proj4 from 'proj4'; // For geographic coordinate transformations
import { closeSync, openSync, writeSync } from 'node:fs'; // Node.js file system methods for working with files
import { createProgressBar } from 'work-faster'; // Utility to create a progress bar for long-running operations
import chalk from 'chalk'; // For styling terminal text

// Setting up projections using proj4 library
proj4.defs('EPSG:3035', '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs');
const projection = proj4('EPSG:3035', 'EPSG:4326').forward;
const project = p => projection(p).map(v => Math.round(v * 1e6) / 1e6);

// Definition of the Database class
export class Database {
	// Class properties for storing points, data, and scale factor
	pointLookup = new Map();
	points = [];
	data = new Map();
	scale;

	constructor(scale, parent) {
		// Constructor to initialize a new instance with a scale and optionally inherit data from a parent instance
		this.scale = scale;
		if (parent) {
			this.pointLookup = parent.pointLookup;
			this.points = parent.points;
			this.data = parent.data;
		}
	}

	addRow(cell, prop, value) {
		// Method to add a new row of data, parsing cell identifiers into coordinates and storing them
		const { x, y } = cell.match(/^100mN(?<y>\d{5})E(?<x>\d{5})$/).groups;
		const point = [parseInt(x, 10), parseInt(y, 10)];
		const key = point.join(',');
		let index;
		if (!this.pointLookup.has(key)) {
			index = this.pointLookup.size;
			this.pointLookup.set(key, index);
			this.points[index] = point;
		} else {
			index = this.pointLookup.get(key);
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
		// Method to save the dataset to a file, converting point data into GeoJSON features
		console.log(chalk.red.bold(`Saving ${filename} with ${this.pointLookup.size} features`));

		const keys = Array.from(this.data.keys());
		const n = this.pointLookup.size;
		let buffers = [];
		const fd = openSync(filename, 'w');
		const scale = this.scale;

		const progressBar = createProgressBar(n);
		for (let i = 0; i < n; i++) {
			progressBar.increment();

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
			};
			buffers.push(Buffer.from(JSON.stringify(feature) + '\n'));
			if (buffers.length > 10000) flush();
		}
		flush();
		closeSync(fd);
		progressBar.close();

		function flush() {
			// Helper function to write buffered data to the file and reset the buffer
			writeSync(fd, Buffer.concat(buffers));
			buffers = [];
		}
	}

	getScaled() {
		// Method to create a scaled version of the database, aggregating data points as needed
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
				matrix[index].push(index0);
			}
		});

		for (let [key, array0] of this.data.entries()) {
			const array = Float64Array.from(
				matrix,
				indexes0 => indexes0.reduce((s, i0) => s + (array0[i0] || 0), 0) / 4
			);

			data.set(key, array);
		}

		return new Database(this.scale * 2, { pointLookup, points, data });
	}
}
