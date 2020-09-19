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
import {Node} from "./parse.ts";
import {process_ast, State} from "./ast.ts";

let in_chapter = false;
function create_tei_file(s: State<string[]>) {
	const nt = s.map.get(s.n.value)!;
	const parent = s.parent?.value;

	switch (nt.name) {
		case 'meta': {
			break;
		}
		case 'fw': {
			break;
		}
		case 'project': {
			s.data.push('<?xml version="1.0" encoding="utf-8" ?>\n');
			s.data.push('<TEI xmlns="http://www.tei-c.org/ns/1.0">\n');
			s.data.push('<text>\n');
			s.data.push('<body>\n');
			s.do_nodes(s);
			s.data.push('</body>\n');
			s.data.push('</text>\n');
			s.data.push('</TEI>\n');
			break;
		}
		case 'full-title': {
			s.data.push('<titlePage>\n');
			s.do_nodes(s);
			s.data.push('</titlePage>\n');
			break;
		}
		case 'half-title': {
			s.data.push('<titlePage type="half-title">\n');
			s.do_nodes(s);
			s.data.push('</titlePage>\n');
			break;
		}
		case 'h': {
			if (parent === 'project') {
				if (in_chapter) s.data.push('</div>\n');
				in_chapter = true;
				s.data.push('<div>\n');
			}
			s.data.push('<head>');
			s.do_nodes(s);
			s.data.push('</head>\n');
			break;
		}
		case 'quote':
		case 'p': {
			s.data.push(`<${nt.name}>`);
			s.do_nodes(s);
			s.data.push(`</${nt.name}>\n`);
			break;
		}
		case 'i': {
			s.data.push('<emph>');
			s.do_nodes(s);
			s.data.push('</emph>');
			break;
		}
		case 'bq': {
			s.data.push('(');
			s.do_nodes(s);
			s.data.push(')');
			break;
		}
		case 'lb': {
			s.data.push('<lb/>');
			break;
		}
		case 'sb': {
			s.data.push('<p></p>');
			break;
		}
		case 'cor': {
			const n1 = s.data.length;
			s.do_nodes(s);
			const n2 = s.data.length;
			const x = s.data.splice(n1, n2-n1).join('');
			const xx = x.split('|');
			s.data.push('<choice>');
			s.data.push('<sic>');
			s.data.push(xx[0]);
			s.data.push('</sic>');
			s.data.push('<corr>');
			s.data.push(xx[1]);
			s.data.push('</corr');
			s.data.push('</choice>');
			break;
		}
		case 'nm-work':
		case 'nm-part': {
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
				s.data.push('<emph>');
				s.data.push(ends_with_comma ? x.substring(0, x.length-1) : x);
				s.data.push('</emph>');
				if (ends_with_comma) s.data.push(',');
			}
			else {
				s.data.push('‘');
				s.data.push(x);
				s.data.push('’');
			}
			break;
		}
		default: throw new Error(nt.name);
	}
}

export function gen_tei(n: Node) {
	const ys: string[] = [];
	process_ast(create_tei_file, (s: State<string[]>) => s.data.push(s.n.value.replaceAll('&', '&amp;')), n, ys);
	return ys.join('');
}