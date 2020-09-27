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
type fn_ws<A> = (s: State<A>) => void;
type fn_expr<A> = (s: State<A>) => void;
type fn_nodes<A> = (s: State<A>) => void;

export interface Node {
	type: string,
	value: string,
	xs: Node[],
}

export interface NodeType {
	name: string,
	valid: Set<string>,
}

export interface State<A> {
	parent?: Node,
	n: Node,
	data: A,
	map: Map<string, NodeType>,
	do_nodes: fn_nodes<A>,
	do_expr: fn_expr<A>,
	do_ws: fn_ws<A>,
}

export function first_expr_is(xs: Node[], x: string) {
	return xs.length && xs[0].value === x;
}

export function last_expr_is(xs: Node[], x: string) {
	return xs.length && xs[xs.length - 1].value === x;
}

function build_dispatch() {
	const valid_lb_nodes = new Set<string>();
	const valid_sb_nodes = valid_lb_nodes;
	const valid_jw_nodes = valid_lb_nodes;
	const valid_toc_nodes = valid_lb_nodes;
	const WS = ['WORD', 'SYM'];
	const valid_ws = new Set(WS);
	const valid_project_nodes = new Set(['meta', 'full-title', 'half-title', 'h', 'p', 'sb', 'fw', 'sec', 'toc']);
	const valid_meta_nodes = new Set(['title', 'author', 'publisher', 'printer', 'year', 'lang', 'source']);
	const valid_fw_nodes = new Set(['h', 'sig', 'pg', 'jw']);

	const valid_sec_nodes = new Set(['p', 'h']);
	const valid_p_nodes = new Set(['i', 'cor', 'nm-work', 'nm-part', 'lb', 'fw', 'bq', 'quote'].concat(...WS));
	const valid_full_title_nodes = new Set(Array.from(valid_p_nodes).concat(...['h', 'p', 'sb']));
	const valid_half_title_nodes = valid_full_title_nodes;
	const valid_quote_nodes = new Set(['lb'].concat(...WS));
	const valid_source_nodes = valid_ws;
	const valid_h_nodes = valid_ws;
	const valid_i_nodes = valid_ws;
	const valid_cor_nodes = valid_ws;
	const valid_nm_work_nodes = new Set(['i', 'fw'].concat(...WS));
	const valid_nm_part_nodes = new Set(valid_nm_work_nodes);
	const valid_sig_nodes = valid_ws;
	const valid_pg_nodes = valid_ws;
	const valid_bq_nodes = valid_ws;
	const valid_title_nodes = new Set(['bq'].concat(...WS));
	const valid_author_nodes = valid_title_nodes;
	const valid_publisher_nodes = valid_title_nodes;
	const valid_printer_nodes = valid_title_nodes;
	const valid_year_nodes = valid_title_nodes;
	const valid_lang_nodes = valid_title_nodes;

	const xs: NodeType[] = [];
	xs.push({name: 'project', valid: valid_project_nodes});
	xs.push({name: 'meta', valid: valid_meta_nodes});
	xs.push({name: 'full-title', valid: valid_full_title_nodes});
	xs.push({name: 'half-title', valid: valid_half_title_nodes});
	xs.push({name: 'source', valid: valid_source_nodes});
	xs.push({name: 'p', valid: valid_p_nodes});
	xs.push({name: 'h', valid: valid_h_nodes});
	xs.push({name: 'i', valid: valid_i_nodes});
	xs.push({name: 'cor', valid: valid_cor_nodes});
	xs.push({name: 'nm-work', valid: valid_nm_work_nodes});
	xs.push({name: 'nm-part', valid: valid_nm_part_nodes});
	xs.push({name: 'quote', valid: valid_quote_nodes});
	xs.push({name: 'bq', valid: valid_bq_nodes}); // bracket
	xs.push({name: 'lb', valid: valid_lb_nodes});
	xs.push({name: 'sb', valid: valid_sb_nodes});
	xs.push({name: 'fw', valid: valid_fw_nodes}); //form work
	xs.push({name: 'jw', valid: valid_jw_nodes}); // join word
	xs.push({name: 'sig', valid: valid_sig_nodes});
	xs.push({name: 'pg', valid: valid_pg_nodes});
	xs.push({name: 'title', valid: valid_title_nodes});
	xs.push({name: 'author', valid: valid_author_nodes});
	xs.push({name: 'publisher', valid: valid_publisher_nodes});
	xs.push({name: 'printer', valid: valid_printer_nodes});
	xs.push({name: 'year', valid: valid_year_nodes});
	xs.push({name: 'lang', valid: valid_lang_nodes});
	xs.push({name: 'toc', valid: valid_toc_nodes});
	xs.push({name: 'sec', valid: valid_sec_nodes});

	const m = new Map<string, NodeType>();
	xs.forEach(x => m.set(x.name, x));
	return m;
}

function make_state<A>(os: State<A>, n: Node): State<A> {
	return {
		parent: os.n,
		n: n,
		data: os.data,
		map: os.map,
		do_nodes: os.do_nodes,
		do_expr: os.do_expr,
		do_ws: os.do_ws,
	};
}

function do_nodes<A>(s: State<A>) {
	const nt = s.map.get(s.n.value)!;
	s.n.xs.forEach(x => {
		switch (x.type) {
			case 'EXPR': {
				if (!nt.valid.has(x.value)) throw new Error(`Invalid child node: ${nt.name}:${x.value}`);
				do_expr(make_state(s, x));
				break;
			}
			case 'SYM':
			case 'WORD': {
				let do_check = true;
				if (x.type === 'SYM' && x.value === ' ') {
					switch (nt.name) {
						case 'project':
						case 'meta':
						case 'fw': {
							do_check = false;
							break;
						}
						default: break;
					}
				}
				if (do_check) {
					if (!nt.valid.has(x.type)) throw new Error(`Invalid child node type: ${nt.name}:${x.type}:[${x.value}]`);
					s.do_ws(make_state(s, x));
				}
				break;
			}
			default: throw new Error();
		}
	});
}

function do_expr<A>(s: State<A>) {
	s.do_expr(s);
}

export function process_ast<A>(f_do_expr: fn_expr<A>, f_do_ws: fn_ws<A>, n: Node, data: A) {
	if (!(n.type === 'EXPR' && n.value === 'project')) throw new Error();
	const map = build_dispatch();
	const s = {
		do_expr: f_do_expr,
		do_ws: f_do_ws,
		do_nodes: do_nodes,
		map: map,
		data: data,
		n: n,
		parent: undefined,
	}
	do_expr(s);
}