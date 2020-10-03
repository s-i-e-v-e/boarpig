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
import { parse_project } from './project.ts';
import { process_ast, State, ElementNode, TextNode } from './ast.ts';
import {println} from "../io.ts";
import {handle_stripped_tags, STRIP} from "./gen.ts";

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

function create_plaintext_file(s: State<string[]>, n: ElementNode, strip: Set<string>) {
	const parent = s.parent?.name;
	if (strip.has(n.name)) {
		handle_stripped_tags(s, n, parent);
		return;
	}

	switch (n.name) {
		case 'cor': {
			const n1 = s.data.length;
			s.do_nodes(s);
			const n2 = s.data.length;
			const x = s.data.splice(n1, n2-n1).join('');
			const xx = x.split('|');
			s.data.push(xx[1]);
			break;
		}
		case 'i': {
			s.data.push('_');
			s.do_nodes(s);
			s.data.push('_');
			break;
		}
		case 'sb': {
			s.data.push('\n');
			break;
		}
		case 'p': {
			s.do_nodes(s);
			s.data.push('\n');
			break;
		}
		case 'h': {
			s.data.push(parent === 'project' ? '\n' : '\n');
			s.do_nodes(s);
			s.data.push(parent === 'project' ? '\n\n' : '\n');
			break;
		}
		default: {
			s.do_nodes(s);
			break;
		}
	}
}

function create_project_file(s: State<string[]>, n: ElementNode, strip: Set<string>) {
		const parent = s.parent?.name;
	if (strip.has(n.name)) {
		handle_stripped_tags(s, n, parent);
		return;
	}

	const push_blank = () => s.data.push(`(${n.name})`);

	const push_block = () => {
		s.data.push(`(${n.name}\n`);
		s.do_nodes(s);
		s.data.push(`)`);
	};
	const push_inline = () => {
		s.data.push(`(${n.name} `);
		s.do_nodes(s);
		s.data.push(`)`);
	};

	switch (n.name) {
		case 'full-title':
		case 'title': {
			if (parent === 'project') {
				push_block();
			}
			else {
				push_inline();
			}
			s.data.push('\n');
			break;
		}
		case 'project':
		case 'meta': {
			push_block();
			s.data.push('\n');
			break;
		}
		case 'half-title':
		case 'author':
		case 'publisher':
		case 'printer':
		case 'year':
		case 'lang':
		case 'source':
		case 'sec':
		case 'p': {
			push_inline();
			s.data.push('\n');
			break;
		}
		case 'h': {
			push_inline();
			if (parent === 'project' || parent === 'sec' ||parent === 'full-title') s.data.push('\n');
			break;
		}
		case 'jw':
		case 'lb': {
			push_blank();
			break;
		}
		case 'toc':
		case 'sb': {
			push_blank();
			s.data.push('\n');
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
			if (parent === 'project') s.data.push(`\n`);
			break;
		}
		default: break;
	}
}

function build_fn_create_project_file(strip: Set<string>) {
	return (s: State<string[]>, n: ElementNode) => create_project_file(s, n, strip);
}

function build_fn_create_plaintext_file(strip: Set<string>) {
	return (s: State<string[]>, n: ElementNode) => create_plaintext_file(s, n, strip);
}

function textify_project(n: ElementNode) {
	println('to_text');
	const to_project = (strip?: Set<string>) => {
		strip = strip || new Set();
		const ys: string[] = [];
		process_ast(build_fn_create_project_file(strip), (s: State<string[]>, n: TextNode) => s.data.push(` ${n.value}`), n, ys);
		return ys.join('').trim().replaceAll(/\s*\(lb\)\s*/g, '(lb)').replaceAll(/[ ]+\)/g, ')').replaceAll(/[ ]+/g, ' ');
	};

	const to_plaintext = (strip?: Set<string>) => {
		strip = strip || new Set();
		const ys: string[] = [];
		process_ast(build_fn_create_plaintext_file(strip), (s: State<string[]>, n: TextNode) => s.data.push(n.value), n, ys);
		return ys.join('').trim();
	};

	const x = to_project();

	let y1 = to_project(STRIP);
	let y2 = to_plaintext(STRIP);
	let [_y1, z] = make_word_list(y1);
	let [_y2, _] = make_word_list(y2);
	y1 = _y1.trim();
	y2 = _y2.trim();
	return [x, y1, y2, z];
}

export async function make(file: string, clobber: boolean) {
	println('make');
	const [out_dir, bpp, n] = parse_project(file, !clobber);
	const [x, y1, y2, z] = textify_project(n);
	Deno.writeTextFile(bpp, x);
	Deno.writeTextFile(`${out_dir}/proj/project.no-fw.txt.bpp`, y1);
	Deno.writeTextFile(`${out_dir}/proj/project.plain.txt.bpp`, y2);
	Deno.writeTextFile(`${out_dir}/proj/words.txt.bpp`, z);
}