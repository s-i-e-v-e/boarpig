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
import {FileInfo, gen_xml_nm, handle_stripped_tags} from "/proj/gen.ts";
import {utf8_to_bin} from "/io.ts";

export const style =`
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
`;

const toc_nodes: ElementNode[] = [];
let toc_idx = -1;
let chapter_idx = 0;
let chapter_toc_xs: number[] = [];
let is_single = true;

interface Chapter {
    type: string,
    id: number,
    name: string,
    contents: string[],
}

function new_chapter(type: string, id: number, name: string) : Chapter {
    return {
        type: type,
        id: id,
        name: name,
        contents: [],
    };
}

function end_chapter(s: State<Chapter[]>) {
    const ch: Chapter = s.data[s.data.length-1];
    if (ch.contents[ch.contents.length-1] !== '</article>') {
        ch.contents.push('</article>');
    }
}

function gen_node(s: State<Chapter[]>, n: ElementNode) {
    const parent = s.parent?.name;

    let ch: Chapter = s.data[s.data.length-1];
    switch (n.name) {
        case 'project': {
            toc_nodes.push(...n.xs.map(x => x as ElementNode).filter(x => x.name === 'h'));
            s.do_nodes(s);
            end_chapter(s);
            break;
        }
        case 'meta':
        case 'fw': {
            handle_stripped_tags(ch.contents, n, parent);
            break;
        }
        case 'full-title':
        case 'half-title':
        case 'sec': {
            ch = new_chapter('', s.data.length, '');
            s.data.push(ch);
            ch.contents.push(`\n<article data-type="${n.name}">`);
            s.do_nodes(s);
            ch.contents.push('</article>');
            break;
        }
        case 'toc': {
            toc_idx = s.data.length;
            ch = new_chapter('toc', s.data.length, '');
            s.data.push(ch);

            // build toc
            ch.contents.push('\n<article data-type="toc">');
            ch.contents.push('<h2>CONTENTS</h2>');
            ch.contents.push('<nav><ul>');

            toc_nodes.forEach(_ => {
                chapter_toc_xs.push(ch.contents.length);
                const file = is_single ? '' : make_file_name('chapter', '$$idx$$');
                ch.contents.push(`<li><a href="${file}#$$name$$_$$idx$$">$$name$$</a>`)
            });
            ch.contents.push('</ul></nav>');
            ch.contents.push('</article>');
            break;
        }
        case 'h': {
            if (parent === 'project') {
                const chapter_index = chapter_toc_xs.length ? chapter_idx+1 : chapter_idx;
                ch = new_chapter('chapter', chapter_index, '$$name$$');
                s.data.push(ch);
                ch.contents.push('\n<article data-type="chapter">');
                ch.contents.push('<h2>');
                const n = ch.contents.length;
                s.do_nodes(s);
                if (chapter_toc_xs.length) {
                    const idx = chapter_toc_xs[chapter_idx];
                    const name = ch.contents.slice(n, ch.contents.length).join('');
                    ch.contents[n-1] = `<h2 id="${name}_${chapter_index}">`;
                    const tos_ch = s.data[toc_idx];
                    tos_ch.contents[idx] = tos_ch.contents[idx]
                        .replaceAll('$$idx$$', ''+chapter_index)
                        .replaceAll('$$name$$', name);
                    chapter_idx++;
                }
                ch.contents.push('</h2>');
            }
            else {
                ch.contents.push('<h2>');
                s.do_nodes(s);
                ch.contents.push('</h2>');
            }
            break;
        }
        case 'quote': {
            ch.contents.push(`<blockquote>`);
            s.do_nodes(s);
            ch.contents.push(`</blockquote>`);
            break;
        }
        case 'p': {
            ch.contents.push(`<p>`);
            s.do_nodes(s);
            break;
        }
        case 'i': {
            ch.contents.push('<em>');
            s.do_nodes(s);
            ch.contents.push('</em>');
            break;
        }
        case 'bq': {
            ch.contents.push('(');
            s.do_nodes(s);
            ch.contents.push(')');
            break;
        }
        case 'lb': {
            ch.contents.push('<br>');
            break;
        }
        case 'sb': {
            ch.contents.push('<hr>');
            break;
        }
        case 'cor': {
            const n1 = ch.contents.length;
            s.do_nodes(s);
            const n2 = ch.contents.length;
            const x = ch.contents.splice(n1, n2-n1).join('');
            const xx = x.split('|');
            ch.contents.push(xx[1]);
            break;
        }
        case 'nm-work':
        case 'nm-part': {
            gen_xml_nm(ch.contents, s, n, 'em');
            break;
        }
        default: throw new Error(n.name);
    }
}

function make_file_name(name: string, idx: number|string) {
    return `${name}_${idx}.html`;
}

function get_style() {
    return style.replaceAll(/\n[\t ]*/g, '').replaceAll(/[ ]*([:,;}{])[ ]*/g, '$1');
}

function combine_chapters(xs: Chapter[]) {
    return xs.map(x => x.contents).join('');
}

function make_html5(x: string) {
    const xs: string[] = [];
    xs.push('<!DOCTYPE html><html><head><meta charset="utf-8">');
    if (is_single) {
        xs.push(`<style type="text/css">`);
        xs.push(get_style());
        xs.push(`</style>`);
    }
    else {
        xs.push(`<link href="style.css" rel="stylesheet" type="text/css"/>`);
    }

    xs.push('</head><body>');
    xs.push(x);
    xs.push('</body></html>');
    return xs.join('');
}

function do_text(s: State<Chapter[]>, n: TextNode) {
    const ch = s.data[s.data.length-1];
    ch.contents.push(n.value.replaceAll('&', '&amp;'));
}

export function gen_html_single(n: ElementNode): FileInfo[] {
    is_single = true;
    const ys: Chapter[] = [];
    process_ast(gen_node, do_text, n, ys);
    return [{ path: 'book.html', content: utf8_to_bin(make_html5(combine_chapters(ys))) }];
}

export function gen_html_multiple(n: ElementNode): FileInfo[] {
    is_single = false;
    const ys: Chapter[] = [];
    process_ast(gen_node, do_text, n, ys);
    const zs = ys
        .map(x => {
            return { path: make_file_name(x.type, x.id), content: utf8_to_bin(make_html5(x.contents.join(''))) };
        });

    if (!is_single) zs.push({path: 'style.css', content: utf8_to_bin(style) });
    return zs;
}