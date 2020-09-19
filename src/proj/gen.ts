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
import {make_out_dir_path} from "../io.ts";
import {Node} from "./parse.ts";
import {parse_project} from "./project.ts";

function to_md(xs: Node[], parent: string = '') {
	let ys: string[] = [];

	xs.forEach(x => {
		if (x.type === 'EXPR') {
			const get_content = () => to_md(x.xs, x.value);
			if (parent === 'meta') {
				switch (x.value) {
					case 'title': {
						ys.push(`title: ${get_content()}\n`);
						break;
					}
					case 'author': {
						ys.push(`author: ${get_content()}\n`);
						break;
					}
					case 'publisher': {
						ys.push(`publisher: ${get_content()}\n`);
						break;
					}
					case 'printer': {
						ys.push(`printer: ${get_content()}\n`);
						break;
					}
					case 'year': {
						ys.push(`date: ${get_content()}\n`);
						break;
					}
					case 'lang': {
						ys.push(`lang: ${get_content()}\n`);
						break;
					}
					default: break;
				}
			}
			else {
				switch (x.value) {
					case 'meta': {
						ys.push('---\n');
						ys.push(get_content());
						ys.push('documentclass: book\n');
						ys.push('...\n');
						break;
					}
					case 'lb': {
						ys.push('<br>');
						break;
					}
					case 'pb': break;
					case 'sb': {
						ys.push('<hr>');
						break;
					}
					case 'cb': break;
					case 'bq': {
						ys.push('(');
						ys.push(get_content());
						ys.push(')');
						break;
					}
					case 'half-title':
					case 'title': {
						ys.push(get_content());
						break;
					}
					case 'h': {
						if (parent === 'title' || parent === 'half-title') {
							ys.push('\n\n');
							ys.push('# ');
							ys.push(get_content());
							ys.push('\n\n');
						}
						else {
							ys.push('\n\n');
							ys.push('## ');
							ys.push(get_content());
							ys.push('\n\n');
						}
						break;
					}
					case 'i': {
						ys.push('*');
						ys.push(get_content());
						ys.push('*');
						break;
					}
					case 'quote':
					case 'project': {
						ys.push(get_content());
						break;
					}
					case 'p': {
						ys.push(get_content());
						ys.push('\n\n');
						break;
					}
					case 'cor': {
						const xx = to_md(x.xs, x.value).split('|');
						ys.push(xx[1]);
						break;
					}
					case 'nm-part':
					case 'nm-work': {
						ys.push(get_content());
						break;
					}
					case 'fw': break;
					default: throw new Error(x.value);
				}
			}
		}
		else {
			ys.push(x.value);
		}
	})
	return ys.join('');
}

export async function gen(file: string, format: string) {
	const [out_dir, _, pp] = parse_project(file, true);
	const input_file = `${out_dir}/proj/project.md`;
	const meta_file = `${out_dir}/proj/meta.md`;

	let a = to_md(pp);
	const n1 = a.indexOf('---');
	const n2 = a.indexOf('...');
	let b = a.substring(n1, n2+3).trim();
	a = a.substring(0, n1)+a.substring(n2+3);
	a = a.trim();
	Deno.writeTextFile(input_file, a);
	Deno.writeTextFile(meta_file, b);

	let ext;
	switch (format) {
		case 'pdf': format = 'latex'; ext = 'pdf'; break;
		case 'epub3': ext = 'epub'; break;
		case 'html': ext = 'html'; break;
		case 'tei': ext = 'tei.xml'; break;
		case 'native': ext = 'hs'; break;
		default: ext = 'out'; break;
	}
	const output_file = `${out_dir}/proj/project.${ext}`;
	const p = Deno.run({
		cmd: ['pandoc', '--self-contained', '--standalone', '--from=markdown+yaml_metadata_block', `--to=${format}`, `--output=${output_file}`, `--metadata-file=${meta_file}`, input_file],
	});
	return p.status();
}