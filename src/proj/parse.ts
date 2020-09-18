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
import { lex, Token, } from './lex.ts';

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

export interface Node {
	type: string,
	value: string,
	xs: Node[],
}

const SPACE = {type: 'SYM', value: ' ', xs: []};

function expect_space(ts: TokenStream, do_fmt: boolean) {
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
	if (do_fmt && n === 0) throw new Error('expected space');
}

function expect_cl_brace(ts: TokenStream, x: Token) {
	expect_space (ts, false);
	if (ts_next(ts).lexeme !== ')') throw new Error(`parsing error: ${x.index}:${x.lexeme}`);
}

function parse_se(ts: TokenStream, do_fmt: boolean, virtual_se?: Token): Node {
	const x = virtual_se || ts_next(ts);

	let n;
	switch (x.lexeme) {
		case 'lb':
		case 'pb':
		case 'sb':
		case 'cb': {
			n = {type: x.type, value: x.lexeme, xs: []};
			break;
		}

		case 'pg': {
			if (!virtual_se) expect_space(ts, do_fmt);
			const a = ts_next(ts).lexeme;
			n = {type: x.type, value: x.lexeme, xs: [{type: 'WORD', value: a, xs: []}]};
			break;
		}

		case 'cor':
		case 'project':
		case 'bq':
		case 'i':
		case 'sig':
		case 'p':
		case 'halftitle':
		case 'publisher':
		case 'printer':
		case 'year':
		case 'title':
		case 'author':
		case 'h':
		case 'fw':
		case 'quote': {
			if (!virtual_se) expect_space(ts, do_fmt);
			n = {type: x.type, value: x.lexeme, xs: parse_expr(ts, do_fmt, x.lexeme)};
			break;
		}
		default: throw new Error(`[${x.lexeme}]`);
	}

	if (!virtual_se) expect_cl_brace(ts, x);

	return n;
}

function insert_sp(xs: Node[], p: Node, q: Node, p_idx: number = 1) {
	if (q.type === 'WORD') {
		xs.splice(xs.length-p_idx, 0, SPACE);
	}
	else if (q.type === 'SYM') {
		switch (q.value) {
			case ':':
			case ';':
			case ',':
			case '.': {
				xs.splice(xs.length-p_idx, 0, SPACE);
				break;
			}
			default: {
				break;
			}
		}
	}
}

function process_se(xs: Node[], x: Token, n: Node) {
	let p = xs[xs.length-1];
	if (p && p.value === 'p') {
		if (n.value === 'p' && n.xs.filter(y => y.value === 'fw').length === n.xs.length) {
			p.xs.push(...n.xs);
		}
		else if (n.value === 'p' && p.xs[p.xs.length -1].value === 'fw') {
			p.xs.push(...n.xs);
		}
		else {
			xs.push(n);
		}
	}
	else {
		xs.push(n);
	}

	const handle_fw = (xs: Node[]) => {
		let a = xs[xs.length-1];
		let b = xs[xs.length-2];
		if (b && a.value === 'fw') {
			let n = 3;
			while (b && a && b.value === 'fw') {
				a = b;
				b = xs[xs.length-n];
				n++;
			}
			if (b && a.value === 'fw') insert_sp(xs, a, b, n-2);
		}
	};

	p = xs[xs.length-1];
	if (p.value === 'p') {
		// handle p > h
		if (p.xs.length === 1 && p.xs[0].value === 'h') {
			xs.pop();
			xs.push(p.xs[0]);
		}
		else {
			handle_fw(p.xs);
		}
	}
	else if (p.value === 'i') {
		let q = xs[xs.length-2];
		if (q && p.value === 'i') insert_sp(xs, p, q);
	}
	else if (p.value === 'fw') {
		handle_fw(xs);
	}
}

function parse_expr(ts: TokenStream, do_fmt: boolean, parent_expr?: string) {
	const xs: Node[] = [];
	let leave = false;
	while (!ts.eof && !leave) {
		const x = ts_peek(ts);

		if (x.type === 'EXPR') {
			if (do_fmt) {
				if (parent_expr === 'p' && (x.lexeme === 'cb' || x.lexeme === 'sb' || x.lexeme === 'pb' || x.lexeme === 'p')) break;
				const n = parse_se(ts, do_fmt);
				process_se(xs, x, n);
			}
			else {
				xs.push(parse_se(ts, do_fmt));
			}
		}
		else if (x.type === 'SYM') {
			if (do_fmt) {
				switch (x.lexeme) {
					case '(': {
						ts_next(ts);
						const ys = parse_expr(ts, do_fmt, x.lexeme);
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
						const n = parse_se(ts, do_fmt, { lexeme: 'p', index: x.index, type: 'EXPR' });
						process_se(xs, x, n);
						break;
					}
					default: {
						ts_next(ts);
						xs.push({type: x.type, value: x.lexeme, xs: []});
					}
				}
			}
			else {
				if (x.lexeme === ')') {
					leave = true;
				}
				else {
					ts_next(ts);
					xs.push({type: x.type, value: x.lexeme, xs: []});
				}
			}
		}
		else if (x.type === 'WORD') {
			ts_next(ts);
			xs.push({type: x.type, value: x.lexeme, xs: []});
		}
		else {
			throw new Error();
		}
	}
	return xs;
}

export function parse(x: string, do_fmt: boolean) {
	const ts = {
		xs: lex(x),
		index: 0,
		eof: false,
	};
	console.log('parse');
	return parse_expr(ts, do_fmt);
}