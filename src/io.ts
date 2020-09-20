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
export interface FileName {
	dir: string,
	name: string,
	ext: string,
}

export function println(x: string) {
	console.log(x);
}

export function make_out_dir_path(file: string) {
	const fp = parse_path(file);
	return `${fp.dir}/${fp.name}_output`;
}

export function make_image_path(out_dir: string) {
	return `${out_dir}/images`;
}

export function make_text_path(out_dir: string) {
	return `${out_dir}/text`;
}

export function make_proj_saved_text_path(out_dir: string) {
	return `${out_dir}/proj/text`;
}

export function parse_path(file: string) {
	let n = file.lastIndexOf("/");
	const dir = n === -1 ? "." : file.substring(0, n);
	file = n === -1 ? file : file.substring(n + 1);

	n = file.lastIndexOf(".");
	const name = n === -1 ? file : file.substring(0, n);
	const ext = n === -1 ? '' : file.substring(n);
	return {
		dir: dir,
		name: name,
		ext: ext,
	};
}

export function mkdir(dir: string) {
	if (!exists(dir)) Deno.mkdirSync(dir, { recursive: true });
}

export function exists(file: string) {
	let exists = true;
	try {
		Deno.statSync(file);
	}
	catch (e) {
		exists = false;
	}
	return exists;
}

export function pause() {
	try {
		throw new Error();
	}
	catch (e) {

	}
}