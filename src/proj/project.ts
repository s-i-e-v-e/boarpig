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
import {exists, make_out_dir_path, make_proj_saved_text_path, println} from "../io.ts";
import {parse} from "./parse.ts";
import {ElementNode} from "./ast.ts";
import {make} from "./make.ts";
import {gen} from "./gen.ts";

function listSavedTextFiles(path: string) {
	let xs = Array.from(Deno.readDirSync(path)).filter(x => x.name.endsWith('.txt')).map(x => x.name);
	return xs.sort();
}

function readSavedTextFilesSync(out_dir: string) {
	const path = make_proj_saved_text_path(out_dir);
	return listSavedTextFiles(path).map(x => `${path}/${x}`).map(x => Deno.readTextFileSync(x));
}

export function parse_project(file: string, read_existing: boolean): [string, string, ElementNode] {
	const out_dir = make_out_dir_path(file);
	const bpp = `${out_dir}/proj/project.bpp`
	read_existing = read_existing && exists(bpp);
	let text;
	if (read_existing) {
		text = Deno.readTextFileSync(bpp);
	}
	else {
		println('read files');
		const xs = readSavedTextFilesSync(out_dir);
		text = `(project ${xs.join('\n')})`;
	}

	println('parse_project');
	const x = parse(text, read_existing);
	return [out_dir, bpp, x];
}

export async function make_project(file: string, clobber: boolean) {
	make(file, clobber);
}

export async function gen_project(file: string, format: string) {
	gen(file, format);
}