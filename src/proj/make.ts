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
import { Node } from './parse.ts';
import { parse_project } from './project.ts';

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
			const get_content = () => to_text(x.xs, plain_text, strip, x.value);
			if (plain_text) {
				//if (x.value === 'pb') ys.pop();
				if (x.value === 'i') ys.push('_');
				if (x.value === 'cor') {
					const xx = get_content().split('|');
					ys.push(xx[1]);
				}
				else if (x.xs.length) {
					ys = ys.concat(get_content());
				}
				if (x.value === 'i') ys.push('_');
				//if (x.value === 'h') ys.push('\n\n');

				switch (x.value) {
					case 'sb':
					case 'cb':
					case 'p': {
						ys.push('\n');
						break;
					}
					case 'h': {
						if (parent === 'project') {
							ys.push('\n\n');
						}
						else {
							ys.push('\n');
						}
						break;
					}
					default: break;
				}
			}
			else {
				const push_block = () => {
					ys.push(`(:${x.value}`);
					ys.push('\n');
					ys.push(get_content());
					ys.push(')');
				};
				const push_inline = () => {
					ys.push(`(:${x.value} `);
					ys.push(get_content());
					ys.push(')');
				};

				switch (x.value) {
					case 'title': {
						if (parent === 'project') {
							push_block();
						}
						else {
							push_inline();
						}
						ys.push('\n');
						break;
					}
					case 'project':
					case 'meta': {
						push_block();
						ys.push('\n');
						break;
					}
					case 'half-title':
					case 'author':
					case 'publisher':
					case 'printer':
					case 'year':
					case 'lang':
					case 'p': {
						push_inline();
						ys.push('\n');
						break;
					}
					case 'h': {
						push_inline();
						if (parent === 'project' || parent === 'title') ys.push('\n');
						break;
					}
					case 'lb': {
						ys.push(`(:${x.value})`);
						break;
					}
					case 'pb':
					case 'sb':
					case 'cb': {
						ys.push(`(:${x.value})`);
						ys.push('\n');
						break;
					}
					case 'quote':
					case 'nm-work':
					case 'nm-part':
					case 'pg':
					case 'sig':
					case 'cor':
					case 'i':
					case 'bq': {
						push_inline();
						break;
					}
					case 'fw': {
						push_inline();
						if (parent === 'project') ys.push(`\n`);
						break;
					}
					default: break;
				}
			}
		}
		else {
			ys.push(x.value);
		}
	})
	return ys.join('');
}

function textify_project(pp: Node[]) {
	console.log('to_text');
	const x = to_text(pp, false, new Set()).trim();
	let y1 = to_text(pp, false, new Set(['fw', 'meta']));
	let y2 = to_text(pp, true, new Set(['fw', 'meta']));
	let [_y1, z] = make_word_list(y1);
	let [_y2, _] = make_word_list(y2);
	y1 = _y1.trim();
	y2 = _y2.trim();
	return [x, y1, y2, z];
}

export async function make(file: string, clobber: boolean) {
	console.log('make');
	const [out_dir, bpp, pp] = parse_project(file, !clobber);
	const [x, y1, y2, z] = textify_project(pp);
	Deno.writeTextFile(bpp, x);
	Deno.writeTextFile(`${out_dir}/proj/project.no-fw.txt.bpp`, y1);
	Deno.writeTextFile(`${out_dir}/proj/project.plain.txt.bpp`, y2);
	Deno.writeTextFile(`${out_dir}/proj/words.txt.bpp`, z);
}