/**
 * Copyright (C) 2020 Sieve
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 **/
import { make_out_dir_path, exists } from '../io.ts';
import { parse, Node } from './parse.ts';

function listSavedTextFiles(out_dir: string) {
	let xs = Array.from(Deno.readDirSync(out_dir)).filter(x => x.name.startsWith('saved.') && x.name.endsWith('.txt')).map(x => x.name);
	return xs.sort();
}

function make_word_list(x: string) {
	const set = new Set<string>()
	x.split(/[.,“‘’”?!;: —–\n()]/g).forEach(x => set.add(x));

	const xs = Array.from(set.keys()).sort();
	const ys: string[] = [];
	xs.forEach(a => {
		if (a.indexOf('-') >= 0) {
			const b = a.replaceAll(/-+/g, '');
			const c = a.replaceAll(/-+/g, '-');
			if (set.has(b)) {
				x = x.replaceAll(a, b);
			}
			else if (set.has(c)) {
				x = x.replaceAll(a, c);
			}
			else {
				ys.push(a);
			}
		}
		else {
			ys.push(a);
		}
	});

	return [x, ys.join('\n')];
}

function to_text(xs: Node[], plain_text: boolean, strip: Set<string>, parent: string = '') {
	let ys: string[] = [];

	xs.forEach(x => {
		if (x.type === 'EXPR') {
			if (strip.has(x.value)) return;
			switch (x.value) {
				case 'h':
				case 'p':
				case 'halftitle':
				case 'sb':
				case 'cb':
				case 'pb': {
					if (parent !== 'project') break;
					const top = ys.length - 1;
					if (ys[top] === ' ') {
						ys.pop();
					}
					break;
				}
			}
			if (plain_text) {
				if (x.value === 'pb') ys.pop();
				if (x.value === 'i') ys.push('_');
				if (x.xs.length) {
					ys = ys.concat(to_text(x.xs, plain_text, strip, x.value));
				}
				if (x.value === 'i') ys.push('_');
				if (x.value === 'h') ys.push('\n');
			}
			else {
				if (x.xs.length) {
					ys.push(`(:${x.value}`);
					if (x.value === 'project') {
						ys.push('\n');
					}
					else {
						ys.push(' ');
					}
					ys = ys.concat(to_text(x.xs, plain_text, strip, x.value));
					ys.push(')');
				}
				else {
					ys.push(`(:${x.value})`);
				}
			}


			switch (x.value) {
				case 'p':
				case 'halftitle':
				case 'sb':
				case 'cb':
				case 'pb': {
					ys.push(`\n`);
					break;
				}
				case 'h': {
					if (parent !== 'fw') ys.push(`\n`);
					break;
				}
				case 'fw': {
					if (parent !== 'p') ys.push(`\n`);
					break;
				}
			}
		}
		else {
			ys.push(x.value);
		}
	})
	return ys.join('');
}

function parse_project(x: string, no_parse: boolean) {
	console.log('parse_project');
	const pp = parse(x, !no_parse);
	console.log('to_text');
	x = to_text(pp, false, new Set());
	let y1 = to_text(pp, false, new Set(['fw']));
	let y2 = to_text(pp, true, new Set(['fw']));
	let [_y1, z] = make_word_list(y1);
	let [_y2, _] = make_word_list(y2);
	y1 = _y1.trim();
	y2 = _y2.trim();
	return [x, y1, y2, z];
}

function readSavedTextFilesSync(out_dir: string) {
	return listSavedTextFiles(out_dir).map(x => `${out_dir}/${x}`).map(x => Deno.readTextFileSync(x));
}

async function readSavedTextFiles(out_dir: string) {
	const xs = listSavedTextFiles(out_dir).map(x => `${out_dir}/${x}`).map(x => Deno.readTextFileSync(x));
	const p = Promise.all(xs);
	p.catch(e => console.error(e.message));
	console.log('waiting...');
	const ys = await p;
	console.log('waiting...done');
	return ys;
}

export async function make_project(file: string, clobber: boolean) {
	console.log('make');
	// bpp = boarpig project

	const out_dir = make_out_dir_path(file);
	const bpp = `${out_dir}/project.bpp`
	const read_existing = exists(bpp) && !clobber
	let text;
	if (read_existing) {
		text = Deno.readTextFileSync(bpp)
	}
	else {
		console.log('read files');
		const xs = readSavedTextFilesSync(out_dir);
		text = `(:project ${xs.join('\n')})`;
	}
	
	const [x, y1, y2, z] = parse_project(text, read_existing);

	Deno.writeTextFile(bpp, x);
	Deno.writeTextFile(`${out_dir}/project.no-fw.txt.bpp`, y1);
	Deno.writeTextFile(`${out_dir}/project.plain.txt.bpp`, y2);
	Deno.writeTextFile(`${out_dir}/words.txt.bpp`, z);
}