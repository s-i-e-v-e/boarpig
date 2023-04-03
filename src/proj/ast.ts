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
import {Node, TextNode, ElementNode} from 'sxml/parse.ts';
import {pause} from "/io.ts";

type fn_el<A> = (s: State<A>, e: ElementNode) => void;
type fn_text<A> = (s: State<A>, e: TextNode) => void;
type fn_nodes<A> = (s: State<A>) => void;

export interface State<A> {
	parent?: ElementNode,
	n: TextNode|ElementNode,
	data: A,
	do_nodes: fn_nodes<A>,
	do_el: fn_el<A>,
	do_text: fn_text<A>,
}

function make_state<A>(os: State<A>, n: ElementNode|TextNode): State<A> {
	const e = os.n as ElementNode;
	return {
		parent: e.xs ? e : undefined,
		n: n,
		data: os.data,
		do_nodes: os.do_nodes,
		do_el: os.do_el,
		do_text: os.do_text,
	};
}

function do_nodes<A>(s: State<A>) {
	pause();
	const xs = (s.n as ElementNode).xs || [];
	xs.forEach(e => {
		const ne = e as ElementNode;
		const nt = e as TextNode;
		if (ne.xs) {
			s.do_el(make_state(s, ne), ne);
		}
		else if (nt.value) {
			s.do_text(make_state(s, nt), nt);
		}
		else {
			throw new Error();
		}
	});
}

export function process_ast<A>(f_do_el: fn_el<A>, f_do_text: fn_text<A>, n: ElementNode, data: A) {
	if (n.name !== 'project') throw new Error();
	const s = {
		do_el: f_do_el,
		do_text: f_do_text,
		do_nodes: do_nodes,
		data: data,
		n: n,
		parent: undefined,
	};
	s.do_el(s, n);
}