
import { chownSync, closeSync, openSync, writeSync } from 'node:fs';

export function Database() {
	const coordsLookup = new Map();
	const coords = [];
	const data = new Map();

	return { addRow, save };

	function addRow(cell, propKey, propVal, value, quality) {
		if (!/^\d+$/.test(value)) {
			console.log({ cell, coord, propKey, propVal, value, quality })
			throw Error();
		}

		const { x, y } = cell.match(/^100mN(?<y>\d{5})E(?<x>\d{5})$/).groups;
		const key = x + '_' + y;
		let index;
		if (!coordsLookup.has(key)) {
			index = coordsLookup.size;
			coordsLookup.set(key, index);
			coords[index] = [parseInt(x, 10), parseInt(y, 10)];
		} else {
			index = coordsLookup.get(key)
		}

		const prop = propKey.replaceAll('"', '').trim() + ': ' + propVal.replaceAll('"', '').trim();
		let buffer;
		if (!data.has(prop)) {
			buffer = new Uint16Array(3200000);
			buffer.fill(0);
			data.set(prop, buffer);
		} else {
			buffer = data.get(prop);
		}

		buffer[index] = parseInt(value, 10)
	}

	function save(filename) {
		const keys = Array.from(data.keys());
		const n = coordsLookup.size;
		console.log({ n })
		let buffers = [];
		const fd = openSync(filename, 'w');

		for (let i = 0; i < n; i++) {
			if (i % 10000 === 0) process.stderr.write(`\r${(100 * i / n).toFixed(1)}%`);
			const x = coords[i][0] * 100;
			const y = coords[i][1] * 100;
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
					]]
				},
				properties: Object.fromEntries(keys.map(key => [key, data.get(key)[i]])),
			}
			buffers.push(Buffer.from(JSON.stringify(feature) + '\n'));
			if (buffers.length > 10000) flush();
		}
		flush();
		closeSync(fd);

		function flush() {
			writeSync(fd, Buffer.concat(buffers));
			buffers = [];
		}
	}
}