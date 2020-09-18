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
const Symbols = ['?', '!', '.', ',', ':', ';', '–', '—', '‘', '’', '“', '”', '(', ')', '\n', ' '];
const SymSet = new Set<string>(Symbols);

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

export interface Token {
	type: string,
	index: number,
	lexeme: string,
}

function new_sym(index: number, lexeme: string) {
	if (!lexeme) throw new Error();
	return {
		type: 'SYM',
		index: index,
		lexeme: lexeme,
	};
}

function new_word(index: number, lexeme: string) {
	if (!lexeme) throw new Error();
	return {
		type: 'WORD',
		index: index,
		lexeme: lexeme,
	};
}

function new_expr(t: Token) {
	t.type = 'EXPR'
	t.index -= 2;
	return t;
}

function read_word(cs: CharStream) {
	const index = cs.index;
	const xx = [];
	while (true) {
		const x = cs_peek(cs);
		if (SymSet.has(x)) {
			break;
		}
		else {
			xx.push(cs_next(cs));
		}
	}
	return xx.length ? new_word(index, xx.join('')) : undefined;
}

export function lex(x: string): Token[] {
	console.log('lex');
	x = x.replaceAll(/\r\n?/g, '\n');
	x = x.replaceAll(/\n\n+/g, '\r');
	x = x.replaceAll(/-\n/g, '--\n');
	x = x.replaceAll(/\n\(:/g, '(:');
	x = x.replaceAll(/\)\n\)/g, '))');
	x = x.replaceAll(/\n/g, ' ');
	x = x.replaceAll(/[ ]*-[ ]*/g, '-');
	x = x.replaceAll(/[ ]*–[ ]*/g, '–');
	x = x.replaceAll(/[ ]*—[ ]*/g, '—');
	x = x.replaceAll(/\r/g, '\n');
	const cs = {
		x: x,
		index: 0,
		eof: false,
	};

	const tokens = [];
	while (!cs.eof) {
		const x = cs_peek(cs);
		if (x === '(') {
			cs_next(cs);
			if (cs_peek(cs) === ':') {
				cs_next(cs);
				tokens.push(new_expr(read_word(cs)!));
			}
			else {
				tokens.push(new_sym(cs.index-1, '('));
			}
		}
		else if (SymSet.has(x)) {
			tokens.push(new_sym(cs.index, cs_next(cs)));
		}
		else {
			const a = read_word(cs);
			if (a) tokens.push(a);
		}
	}
	return tokens;
}