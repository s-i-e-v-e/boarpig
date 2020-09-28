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
import {parse_project} from "./project.ts";
import {gen_tei} from "./gen.tei.ts";
import {Node, NodeType, State} from "./ast.ts";
import {gen_html_single} from "./gen.html.single.ts";
import {mkdir, parse_path} from "../io.ts";

export interface FileInfo {
	path: string,
	content: string,
}

export function gen_xml_nm(s: State<string[]>, nt: NodeType, work_tag: string) {
	// remove emphasis
	const xs: Node[] = [];
	s.n.xs.forEach(x => {
		if (x.type === 'EXPR' && x.value === 'i') {
			xs.push(...x.xs);
		}
		else {
			xs.push(x);
		}
	});
	s.n.xs = xs;

	const n1 = s.data.length;
	s.do_nodes(s);
	const n2 = s.data.length;
	let x = s.data.splice(n1, n2-n1).join('');

	while (true) {
		const n = x.length;
		x = x.startsWith('‘') ? x.substring(1) : x;
		x = x.startsWith('“') ? x.substring(1) : x;
		x = x.endsWith('’') ? x.substring(0, x.length-1) : x;
		x = x.endsWith('”') ? x.substring(0, x.length-1) : x;
		if (n === x.length) break;
	}

	if (nt.name === 'nm-work') {
		const ends_with_comma = x.endsWith(',');
		s.data.push(`<${work_tag}>`);
		s.data.push(ends_with_comma ? x.substring(0, x.length-1) : x);
		s.data.push(`</${work_tag}>`);
		if (ends_with_comma) s.data.push(',');
	}
	else {
		s.data.push('‘');
		s.data.push(x);
		s.data.push('’');
	}
}

export const STRIP = new Set(['fw', 'meta']);
export function handle_stripped_tags(s: State<string[]>, nt: NodeType, parent?: string) {
	switch (nt.name) {
		case 'fw': {
			if (parent !== 'project' && s.data[s.data.length-1] !== ' ' && !s.n.xs.filter(x => x.value === 'jw').length) s.data.push(` `);
			break;
		}
		default:
			break;
	}
}

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
						ys.push('documentclass: book\n');
						ys.push(get_content());
						ys.push('...\n');
						break;
					}
					case 'lb': {
						ys.push('<br>');
						break;
					}
					case 'sb': {
						ys.push('<hr>');
						break;
					}
					case 'bq': {
						ys.push('(');
						ys.push(get_content());
						ys.push(')');
						break;
					}
					case 'half-title':
					case 'full-title': {
						ys.push(get_content());
						break;
					}
					case 'h': {
						if (parent === 'full-title' || parent === 'half-title') {
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
/*
function gen_from_md(out_dir: string, n: Node) {
	const input_file = `${out_dir}/proj/project.md`;
	const meta_file = `${out_dir}/proj/meta.md`;

	let a = to_md([n]);
	const n1 = a.indexOf('---');
	const n2 = a.indexOf('...');
	let b = a.substring(n1, n2+3).trim();
	a = a.substring(0, n1)+a.substring(n2+3);
	a = a.trim();
	Deno.writeTextFile(input_file, a);
	Deno.writeTextFile(meta_file, b);
	return ['--from=markdown+yaml_metadata_block', `--metadata-file=${meta_file}`, input_file];
}*/

export async function gen(file: string, format: string) {
	const [out_dir, _, n] = parse_project(file, true);

	let xs: FileInfo[];
	switch (format) {
		case 'tei': xs = gen_tei(n); break;
		case 'html': xs = gen_html_single(n); break;
		default: throw new Error();
	}

	xs.forEach(x => {
		const input_file = `${out_dir}/proj/output/${x.path}`;
		mkdir(parse_path(input_file).dir);
		Deno.writeTextFileSync(input_file, x.content);
	});
}