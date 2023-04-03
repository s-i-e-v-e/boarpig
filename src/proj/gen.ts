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
import {parse_project} from "/proj/project.ts";
import {gen_tei} from "/proj/gen.tei.ts";
import {Node, ElementNode, TextNode, State} from "/proj/ast.ts";
import {gen_html_single} from "/proj/gen.html.single.ts";
import {mkdir, parse_path} from "/io.ts";

export interface FileInfo {
	path: string,
	content: string,
}

export function gen_xml_nm(s: State<string[]>, ne: ElementNode, work_tag: string) {
	// remove emphasis
	const xs: Node[] = [];
	ne.xs.forEach(x => {
		const y = x as ElementNode;
		if (y.name === 'i') {
			xs.push(...y.xs);
		}
		else {
			xs.push(x);
		}
	});
	ne.xs = xs;

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

	if (ne.name === 'nm-work') {
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
export function handle_stripped_tags(s: State<string[]>, n: ElementNode, parent?: string) {
	switch (n.name) {
		case 'fw': {
			if (parent !== 'project' && s.data[s.data.length-1] !== ' ' && !n.xs.filter(x => (x as ElementNode).name === 'jw').length) s.data.push(` `);
			break;
		}
		default:
			break;
	}
}

function to_md(xs: Node[], parent: string = '') {
	let ys: string[] = [];

	xs.forEach(x => {
		const y = x as ElementNode;
		if (y.name) {
			const get_content = () => to_md(y.xs, y.name);
			if (parent === 'meta') {
				switch (y.name) {
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
				switch (y.name) {
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
						const xx = to_md(y.xs, y.name).split('|');
						ys.push(xx[1]);
						break;
					}
					case 'nm-part':
					case 'nm-work': {
						ys.push(get_content());
						break;
					}
					case 'fw': break;
					default: throw new Error(y.name);
				}
			}
		}
		else {
			const y = x as TextNode;
			ys.push(y.value);
		}
	})
	return ys.join('');
}

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