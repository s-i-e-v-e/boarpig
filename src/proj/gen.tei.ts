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
import {process_ast, State, ElementNode, TextNode} from "/proj/ast.ts";
import {FileInfo, gen_xml_nm} from "/proj/gen.ts";

let in_chapter = false;

function end_chapter(s: State<string[]>) {
	if (in_chapter) s.data.push('</div>\n');
	in_chapter = false;
}

function create_tei_file(s: State<string[]>, n: ElementNode) {
	const parent = s.parent?.name;

	switch (n.name) {
		case 'meta': {
			break;
		}
		case 'fw': {
			break;
		}
		case 'toc': {
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
			s.data.push('<titlePage type="full-title">\n');
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
		case 'sec': {
			end_chapter(s);
			s.data.push('<div>\n');
			s.do_nodes(s);
			s.data.push('</div>\n');
			break;
		}
		case 'h': {
			if (parent === 'project') {
				end_chapter(s);
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
			s.data.push(`<${n.name}>`);
			s.do_nodes(s);
			s.data.push(`</${n.name}>\n`);
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
			gen_xml_nm(s, n, 'emph');
			break;
		}
		default: throw new Error(n.name);
	}
}

export function gen_tei(n: ElementNode): FileInfo[] {
	const ys: string[] = [];
	const do_text = (s: State<string[]>, n: TextNode) => s.data.push(n.value.replaceAll('&', '&amp;'));
	process_ast(create_tei_file, do_text, n, ys);
	return [{ path: 'tei/book.tei.xml', content: ys.join('') }];
}