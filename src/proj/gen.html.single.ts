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
import {process_ast, State, ElementNode, TextNode} from "./ast.ts";
import {FileInfo, gen_xml_nm, handle_stripped_tags} from "./gen.ts";

const style =`<style type="text/css">
body {
  font-family: Roboto, 'Noto Sans', 'DejaVu Sans', sans-serif;
  line-height:1.67;
  overflow: auto;
  width:70vw;
  margin:auto 15vw;
  font-size: 1.25em;
}
article {
  padding-top: 2vmin;
}
article[data-type="full-title"] {
  text-align: center;
}
hr {
  height: 4vmax;
  width: 10%;
  margin: 2vmax auto;
  padding: 2vmax;
  overflow: visible;
  text-align: center;
  border: none;
}

hr::after {
 content: '⁂';
 padding: 0.25vmax;
 position: relative;
 margin: 1vmax;
 display: block;
 height: 5vmax;
 color: black;
}

article[data-type="toc"] a {
	text-decoration: none;
}
article[data-type="toc"] li {
	list-style: circle;
}
</style>`;

const toc_nodes: ElementNode[] = [];
let in_chapter = false;
let chapter_idx = 0;
let chapter_toc_xs: number[] = [];

function end_chapter(s: State<string[]>) {
	if (in_chapter) s.data.push('</article>');
	in_chapter = false;
}

function create_html_file(s: State<string[]>, n: ElementNode) {
	const parent = s.parent?.name;

	switch (n.name) {
		case 'meta':
		case 'fw': {
			handle_stripped_tags(s, n, parent);
			break;
		}
		case 'project': {
			toc_nodes.push(...n.xs.map(x => x as ElementNode).filter(x => x.name === 'h'));

			s.data.push('<!DOCTYPE html><meta charset="utf-8">');
			s.data.push(style.replaceAll(/\n[\t ]*/g, '').replaceAll(/[ ]*([:,;}{])[ ]*/g, '$1'));
			s.do_nodes(s);
			end_chapter(s);
			break;
		}
		case 'full-title': {
			end_chapter(s);
			s.data.push('\n<article data-type="full-title">');
			s.do_nodes(s);
			s.data.push('</article>');
			break;
		}
		case 'half-title': {
			end_chapter(s);
			s.data.push('\n<article data-type="half-title">');
			s.do_nodes(s);
			s.data.push('</article>');
			break;
		}
		case 'toc': {
			end_chapter(s);
			// build toc
			s.data.push('\n<article data-type="toc">');
			s.data.push('<h2>CONTENTS</h2>');
			s.data.push('<nav><ul>');

			toc_nodes.forEach(_ => {
				chapter_toc_xs.push(s.data.length);
				s.data.push(`<li><a href="#^">^</a>`)
			});
			s.data.push('</ul></nav>');
			s.data.push('</article>');
			break;
		}
		case 'sec': {
			end_chapter(s);
			s.data.push('\n<article data-type="sec">');
			s.do_nodes(s);
			s.data.push('</article>');
			break;
		}
		case 'h': {
			if (parent === 'project') {
				end_chapter(s);
				in_chapter = true;
				s.data.push('\n<article data-type="chapter">');

				s.data.push('<h2>');
				const n = s.data.length;
				s.do_nodes(s);
				const y = s.data.slice(n, s.data.length).join('');
				const yy = y.replaceAll(' ', '_');
				s.data[n-1] = `<h2 id="${yy}">`;
				s.data.push('</h2>');

				s.data[chapter_toc_xs[chapter_idx]] = s.data[chapter_toc_xs[chapter_idx]].replaceAll('#^', `#${yy}`).replaceAll('^', y);
				chapter_idx++;
			}
			else {
				s.data.push('<h2>');
				s.do_nodes(s);
				s.data.push('</h2>');
			}
			break;
		}
		case 'quote': {
			s.data.push(`<blockquote>`);
			s.do_nodes(s);
			s.data.push(`</blockquote>`);
			break;
		}
		case 'p': {
			s.data.push(`<p>`);
			s.do_nodes(s);
			break;
		}
		case 'i': {
			s.data.push('<em>');
			s.do_nodes(s);
			s.data.push('</em>');
			break;
		}
		case 'bq': {
			s.data.push('(');
			s.do_nodes(s);
			s.data.push(')');
			break;
		}
		case 'lb': {
			s.data.push('<br>');
			break;
		}
		case 'sb': {
			s.data.push('<hr>');
			break;
		}
		case 'cor': {
			const n1 = s.data.length;
			s.do_nodes(s);
			const n2 = s.data.length;
			const x = s.data.splice(n1, n2-n1).join('');
			const xx = x.split('|');
			s.data.push(xx[1]);
			break;
		}
		case 'nm-work':
		case 'nm-part': {
			gen_xml_nm(s, n, 'em');
			break;
		}
		default: throw new Error(n.name);
	}
}

export function gen_html_single(n: ElementNode): FileInfo[] {
	const ys: string[] = [];
	const do_text = (s: State<string[]>, n: TextNode) => s.data.push(n.value.replaceAll('&', '&amp;'));
	process_ast(create_html_file, do_text, n, ys);
	return [{ path: 'html5/book.html', content: ys.join('') }];
}