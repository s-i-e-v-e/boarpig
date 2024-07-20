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
import {gen_epub} from "/proj/gen.epub.ts";
import {gen_tei} from "/proj/gen.tei.ts";
import {Node, ElementNode, TextNode, State} from "/proj/ast.ts";
import {gen_html_single, gen_html_multiple} from "/proj/gen.html.ts";
import {copy_dir, exists, mkdir, parse_path} from "/io.ts";
import {make_epub} from "/proj/gen.epub.ts";

export interface FileInfo {
	name: string,
	path: string,
	content: Uint8Array,
}

export function gen_xml_nm<A>(qs: string[], s: State<A>, ne: ElementNode, work_tag: string) {
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

	const n1 = qs.length;
	s.do_nodes(s);
	const n2 = qs.length;
	let x = qs.splice(n1, n2-n1).join('');

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
		qs.push(`<${work_tag}>`);
		qs.push(ends_with_comma ? x.substring(0, x.length-1) : x);
		qs.push(`</${work_tag}>`);
		if (ends_with_comma) qs.push(',');
	}
	else {
		qs.push('‘');
		qs.push(x);
		qs.push('’');
	}
}

export const STRIP = new Set(['fw', 'meta']);
export function handle_stripped_tags(qs: string[], n: ElementNode, parent?: string) {
	switch (n.name) {
		case 'fw': {
			const prev = qs[qs.length-1];
			if (parent !== 'project') {
				// inside para, etc
				const join_word = n.xs.filter(x => (x as ElementNode).name === 'jw').length;
				if (prev !== ' ' && !join_word) {
					qs.push(` `);
				}
			}
			break;
		}
		case 'meta': {
			break;
		}
		default: throw new Error(n.name);
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

function write_files(fmt_out_dir: string, xs: FileInfo[]) {
	xs.forEach(x => {
		const input_file = `${fmt_out_dir}${x.path}`;
		console.log(input_file);
		mkdir(parse_path(input_file).dir);
		Deno.writeFileSync(input_file, x.content);
	});
}

export async function gen(file: string, format: string) {
	const [out_dir, _, n] = parse_project(file, true);

	const assets_dir = `${out_dir}/proj/assets`;
	let fmt_out_dir = '';
	switch (format) {
		case 'epub': fmt_out_dir = `${out_dir}/proj/output/epub`; break;
		case 'tei': fmt_out_dir = `${out_dir}/proj/output/tei`; break;
		case 'html': fmt_out_dir = `${out_dir}/proj/output/html5`; break;
		case 'html-multi': fmt_out_dir = `${out_dir}/proj/output/html5-multi`; break;
		default: throw new Error();
	}
	if (exists(assets_dir)) {
		const out = format === 'epub' ? `${fmt_out_dir}/EPUB/assets` : `${fmt_out_dir}/assets`;
		if (exists(out)) {
			Deno.removeSync(out, {recursive: true});
		}
		copy_dir(assets_dir, out);
	}

	let xs: FileInfo[];
	let file_name = '';
	switch (format) {
		case 'epub': [xs, file_name] = gen_epub(n, fmt_out_dir); break;
		case 'tei': xs = gen_tei(n); break;
		case 'html': xs = gen_html_single(n); break;
		case 'html-multi': xs = gen_html_multiple(n, '', false); break;
		default: throw new Error();
	}

	write_files(fmt_out_dir, xs);

	if (format === 'epub') {
		make_epub(fmt_out_dir, file_name);
	}
}
