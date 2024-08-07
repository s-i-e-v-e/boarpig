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
/*
import {lex, Token} from "./lex.ts";
import {first_expr_is, last_expr_is, Node} from "./ast.ts";

interface TokenStream {
	xs: Token[],
	index: number,
	eof: boolean,
}

function ts_peek(ts: TokenStream) {
	return ts.xs[ts.index];
}

function ts_next(ts: TokenStream) {
	const x = ts_peek(ts);
	ts.index += 1;
	ts.eof = ts.index >= ts.xs.length;
	return x;
}

function skip_whitespace(ts: TokenStream) {
	let n = 0;
	while (true) {
		const a = ts_peek(ts);
		if (a.lexeme === ' ' || a.lexeme === '\n') {
			n++;
			ts_next(ts);
		}
		else {
			break;
		}
	}
}

function expect_cl_brace(ts: TokenStream, x: Token) {
	skip_whitespace(ts);
	if (ts_next(ts).lexeme !== ')') throw new Error(`parsing error: ${x.index}:${x.lexeme}`);
}

function parse_se(ts: TokenStream, virtual_se?: Token): Node {
	const x = virtual_se || ts_next(ts);

	let n;
	switch (x.lexeme) {
		case 'toc':
		case 'jw':
		case 'lb':
		case 'pb':
		case 'sb': {
			n = {type: x.type, value: x.lexeme, xs: []};
			break;
		}

		case 'pg': {
			if (!virtual_se) skip_whitespace(ts);
			const a = ts_next(ts).lexeme;
			n = {type: x.type, value: x.lexeme, xs: [{type: 'WORD', value: a, xs: []}]};
			break;
		}

		case 'meta':
		case 'title':
		case 'author':
		case 'year':
		case 'lang':
		case 'publisher':
		case 'printer':
		case 'source':
		case 'full-title':
		case 'half-title':
		case 'sec':

		case 'nm-work':
		case 'nm-part':
		case 'cor':
		case 'project':
		case 'bq':
		case 'i':
		case 'sig':
		case 'p':

		case 'h':
		case 'fw':
		case 'quote': {
			if (!virtual_se) skip_whitespace(ts);
			n = {type: x.type, value: x.lexeme, xs: parse_expr(ts, x.lexeme)};
			break;
		}
		default: throw new Error(`[${x.lexeme}]`);
	}

	if (!virtual_se) expect_cl_brace(ts, x);

	n.xs = n.xs.filter(q => q.value !== '\uFFFC');
	return n;
}

function process_se(xs: Node[], n: Node) {
	const filter_fw = (xs: Node[]) => {
		const ys = [];
		while (last_expr_is(xs,'fw')) {
			ys.push(xs.pop()!);
		}
		return ys;
	};

	xs.push(n);

	if (last_expr_is(xs, 'h')) {
		// p(...fw+) h(...) => p(...) fw+ h(...)
		const ys = [];
		ys.push(xs.pop()!);
		if (last_expr_is(xs, 'p')) {
			const p = xs.pop()!;
			ys.push(...filter_fw(p.xs));
			if (p.xs.length) ys.push(p);
		}
		xs.push(...ys.reverse());
	}
	else if (last_expr_is(xs, 'p')) {
		// p(...fw+) p(...) => p(...fw+...)
		// p(...) p(fw+...) => p(...fw+...)
		const p = xs.pop()!;
		if (last_expr_is(xs, 'p')) {
			const p0 = xs.pop()!;
			if (last_expr_is(p0.xs, 'fw') || first_expr_is(p.xs, 'fw')) {
				p0.xs.push(...p.xs);
				p.xs = [];
			}
			xs.push(p0);
		}
		if (p.xs.length) xs.push(p);
	}

	const last = xs[xs.length-2];
	if (last && last.value === '\uFFFC') {
		switch (n.value) {
			case 'bq':
			case 'nm-work':
			case 'nm-part':
			case 'cor':
			case 'i': {
				last.value = ' ';
				break;
			}
			default: break;
		}
	}
}

function parse_expr(ts: TokenStream, parent_expr?: string) {
	const xs: Node[] = [];
	let leave = false;
	while (!ts.eof && !leave) {
		const x = ts_peek(ts);

		if (x.type === 'EXPR') {
			if (parent_expr === 'p') {
				if (x.lexeme === 'pb') {
					ts_next(ts);
					expect_cl_brace(ts, x);
					break;
				}
				else if (x.lexeme === 'sb' || x.lexeme === 'p' || x.lexeme === 'h' || x.lexeme === 'half-title') {
					break;
				}
			}
			const n = parse_se(ts);
			process_se(xs, n);
		}
		else if (x.type === 'SYM') {
			switch (x.lexeme) {
				case '(': {
					ts_next(ts);
					const ys = parse_expr(ts, x.lexeme);
					if (ts_next(ts).lexeme !== ')') throw new Error('parsing error');
					xs.push({type: 'EXPR', value: `bq`, xs: ys});
					break;
				}
				case ')': {
					leave = true;
					break;
				}
				case '\n': {
					// end the para
					if (parent_expr === 'p') {
						leave = true;
						break;
					}

					ts_next(ts);
					const n = parse_se(ts, { lexeme: 'p', index: x.index, type: 'EXPR' });
					process_se(xs, n);
					break;
				}
				default: {
					ts_next(ts);
					xs.push({type: x.type, value: x.lexeme, xs: []});
				}
			}
		}
		else if (x.type === 'WORD') {
			if (parent_expr === 'project') {
				const n = parse_se(ts, { lexeme: 'p', index: x.index, type: 'EXPR' });
				process_se(xs, n);
			}
			else {
				ts_next(ts);
				xs.push({type: x.type, value: x.lexeme, xs: []});
			}
		}
		else {
			throw new Error();
		}
	}
	return xs;
}
*/

import {println} from "/io.ts";
import {parse as parse_sxml} from '@sieve/sxml';

interface CharStream {
	x: string,
	index: number,
	eof: boolean,
}

function cs_peek(cs: CharStream) {
	return cs.x[cs.index];
}

function cs_next(cs: CharStream) {
	const x = cs_peek(cs);
	cs.index += 1;
	cs.eof = cs.index >= cs.x.length;
	return x;
}

function lex(x: string) {
	println('lex');
	x = x.replaceAll(/\r\n?/g, '\n');
	x = x.replaceAll(/\n\n+/g, '\r');
	x = x.replaceAll(/-\n/g, '--\n');
	x = x.replaceAll(/\n\(/g, '\uFFFC(');
	x = x.replaceAll(/\)\s+\)/g, '))');
	x = x.replaceAll(/\n/g, ' ');
	x = x.replaceAll(/[ ]*-[ ]*/g, '-');
	x = x.replaceAll(/[ ]*–[ ]*/g, '–');
	x = x.replaceAll(/[ ]*—[ ]*/g, '—');
	x = x.replaceAll(/\r/g, '\n');
	x = x.replaceAll('\uFFFC(', '\n(');
	x = x.replaceAll(/^([^)(].*[^)(])$/gmu, '\n(p $1)\n');
	x = x.replaceAll(/^((?!\((p|sb|lb|sec|h|fw|full-title|half-title|meta|cover)).+[^)])$/gmu, '(p $1)\n');
	return x;
}

function parse_unparsed(x: string) {
	x = lex(x);
	return parse_sxml(x, false);
}

export function parse(x: string, is_project: boolean) {
	println('parse');
	return is_project ? parse_sxml(x, false) : parse_unparsed(x);
}
