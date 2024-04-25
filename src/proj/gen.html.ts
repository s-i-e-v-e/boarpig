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
import {get_attr} from "@sieve/sxml";

export const style =`
body {
  font-family: Roboto, 'Noto Sans', 'DejaVu Sans', sans-serif;
  line-height:1.25;
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
  height: 3vmax;
  width: 10%;
  margin: 0.5vmax auto;
  padding: 0.5vmax;
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
 height: 1vmax;
 color: black;
}

hr.short::after {
 content: '';
}

article[data-type="toc"] a {
	text-decoration: none;
}
article[data-type="toc"] li {
	list-style: circle;
}
p {
    margin-top: 0.5vw;
    margin-bottom: 0.5vw;
    text-indent: 1vw;
}
h2 + p, hr + p {
    text-indent: 0vw;
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
    if (!s.data.length) return;
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
        case 'fw': /* forme work */ {
            handle_stripped_tags(ch.contents, n, parent);
            break;
        }
        case 'cover':
        case 'full-title':
        case 'half-title':
        case 'sec': {
            end_chapter(s);
            ch = new_chapter(n.name, s.data.length, '');
            s.data.push(ch);
            ch.contents.push(`\n<article data-type="${n.name}">`);
            s.do_nodes(s);
            ch.contents.push('</article>');
            break;
        }
        case 'toc': {
            toc_idx = s.data.length;
            ch = new_chapter(n.name, s.data.length, '');
            s.data.push(ch);

            // build toc
            ch.contents.push('\n<article data-type="toc">');
            ch.contents.push('<h2>CONTENTS</h2>');
            ch.contents.push('<nav epub:type="toc"><ol>');

            toc_nodes.forEach(_ => {
                chapter_toc_xs.push(ch.contents.length);
                const file = is_single ? '' : make_file_name('chapter', '$$idx$$');
                ch.contents.push(`<li><a href="${file}#$$name$$_$$idx$$">$$name$$</a></li>`)
            });
            ch.contents.push('</ol></nav>');
            ch.contents.push('</article>');
            break;
        }
        case 'h': {
            if (parent === 'project') {
                end_chapter(s);
                const chapter_index = chapter_toc_xs.length ? chapter_idx+1 : chapter_idx;
                ch = new_chapter('chapter', chapter_index, '$$name$$');
                s.data.push(ch);
                ch.contents.push('\n<article data-type="chapter">');
                ch.contents.push('<h2>');
                const n = ch.contents.length;
                s.do_nodes(s);
                if (chapter_toc_xs.length) {
                    const idx = chapter_toc_xs[chapter_idx];
                    const name = ch.contents.slice(n, ch.contents.length).join('') || '_';
                    ch.contents[n-1] = `<h2 id="${name}_${chapter_index}">`;
                    const tos_ch = s.data[toc_idx];
                    tos_ch.contents[idx] = tos_ch.contents[idx]
                        .replaceAll('$$idx$$', ''+chapter_index)
                        .replaceAll('$$name$$', name);
                }
                chapter_idx++;
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
            ch.contents.push(`</p>`);
            break;
        }
        case 'i': {
            ch.contents.push('<em>');
            s.do_nodes(s);
            ch.contents.push('</em>');
            break;
        }
        case 'b': {
            ch.contents.push('<strong>');
            s.do_nodes(s);
            ch.contents.push('</strong>');
            break;
        }
        case 'a': {
            const href = get_attr('href', n);
            ch.contents.push(`<a href="${href}">`);
            s.do_nodes(s);
            ch.contents.push('</a>');
            break;
        }
        case 'img': {
            const source = get_attr('source', n);
            const width = get_attr('width', n);
            const height = get_attr('height', n);

            const w = width ? ` width="${width}"` : ``;
            const h = height ? ` height="${height}"` : ``;
            ch.contents.push(`<img src="${source}"${w}${h} />`);
            break;
        }
        case 'bq': {
            ch.contents.push('(');
            s.do_nodes(s);
            ch.contents.push(')');
            break;
        }
        case 'sbq': {
            ch.contents.push('[');
            s.do_nodes(s);
            ch.contents.push(']');
            break;
        }
        case 'lb': {
            ch.contents.push('<br/>');
            break;
        }
        case 'sb': {
            const a = get_attr('mark', n);
            if (a === 'true') {
                ch.contents.push('<hr class="short"/>');
            }
            else {
                ch.contents.push('<hr class="long"/>');
            }
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

function make_html5(x: string, is_epub: boolean) {
    const xs: string[] = [];
    xs.push('<!DOCTYPE html>');

    const epub = is_epub ? ' xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"' : '';
    xs.push(`<html${epub}>`);

    xs.push('<head><meta charset="utf-8" /><title>PAGE TITLE</title>');
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
    let xx = xs.join('');
    xx = xx.replaceAll('<p><hr/></p>', '<hr/>');
    return xx;
}

function do_text(s: State<Chapter[]>, n: TextNode) {
    const ch = s.data[s.data.length-1];
    ch.contents.push(n.value.replaceAll('&', '&amp;'));
}

function combine_chapters(xs: Chapter[]) {
    return xs.map(x => x.contents.join('')).join('');
}

export function gen_html_single(n: ElementNode): FileInfo[] {
    is_single = true;
    const ys: Chapter[] = [];
    process_ast(gen_node, do_text, n, ys);

    const name = 'book.html';
    return [{ name: name, path: name, content: utf8_to_bin(make_html5(combine_chapters(ys), false)) }];
}

export function gen_html_multiple(n: ElementNode, base_dir: string, is_epub: boolean): FileInfo[] {
    base_dir = base_dir ? base_dir+'/' : '';
    is_single = false;
    const ys: Chapter[] = [];
    process_ast(gen_node, do_text, n, ys);
    const zs = ys
        .map(x => {
            const name = make_file_name(x.type, x.id);
            return { name: name, path: `${base_dir}${name}`, content: utf8_to_bin(make_html5(x.contents.join(''), is_epub)) };
        });

    if (!is_single) {
        const name = 'style.css';
        zs.push({name: name, path: `${base_dir}${name}`, content: utf8_to_bin(style) });
    }
    return zs;
}