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
import { serve } from "https://deno.land/std@0.68.0/http/server.ts";
import {
	list_files,
	make_image_path,
	make_out_dir_path,
	make_proj_saved_text_path,
	make_text_path, mkdir,
	parse_path,
} from "./io.ts";
import {parse} from "./proj/parse.ts";

interface Resource {
	mime: string,
	bytes: Uint8Array,
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getMime(url: string) {
	const ext = url.substring(url.lastIndexOf('.'));
	switch(ext) {
		case '.css': return 'text/css';
		case '.js': return 'application/javascript';
		case '.html': return 'text/html';
		case '.png': return 'image/png';
		case '.txt': return 'text/plain';
		case '.json': return 'application/json';
		default: throw new Error(ext);
	}
}

function get_text_file_path(path: string) {
	const n = path.lastIndexOf('/');
	return `${make_text_path(path.substring(0, n))}${path.substring(n)}`;
}

function get_saved_file_path(path: string) {
	const n = path.lastIndexOf('/');
	const p = make_proj_saved_text_path(path.substring(0, n));
	mkdir(p);
	return `${p}${path.substring(n)}`;
}

function get_image_file_path(path: string) {
	const n = path.lastIndexOf('/');
	return `${make_image_path(path.substring(0, n))}${path.substring(n)}`;
}

async function handleApiRequest(dataRoot: string, x: any): Promise<Resource> {
	let y;
	switch (x.cmd) {
		case 'list-projects': {
			y = {
				xs: list_files(dataRoot, name => name.endsWith('.pdf') || name.endsWith('.djvu')).map(x => parse_path(x).name),
			};
			break;
		}
		case 'prev-page':
		case 'next-page': {
			const project = x.project;
			const current_page = x.page;
			const image_dir = make_image_path(`${dataRoot}/${project}_output`);
			const xs = list_files(image_dir);

			let i = current_page ? xs.findIndex(x => x.indexOf(current_page) === 0) : -1;
			i = x.cmd === 'next-page' ? i + 1 : i;
			i = x.cmd === 'prev-page' ? i - 1 : i;
			i = i < 0 ? 0 : i;
			i = i > xs.length-1 ? xs.length-1 : i;

			y = {
				page: parse_path(xs[i]).name,
			};
			break;
		}
		default: throw new Error(x.cmd);
	}

	return { mime: getMime('x.json'), bytes: encoder.encode(JSON.stringify(y)) };
}

async function handleRequest(wwwRoot: string, dataRoot: string, url: string, data?: Uint8Array): Promise<Resource> {
	url = url === '/' ? '/index.html' : url;
	if (url === '/api') return handleApiRequest(dataRoot, JSON.parse(decoder.decode(data!)));

	const make_path = (url: string) => {
		let path = '';
		if (url.startsWith('/project/')) {
			let pp = parse_path(url.substring('/project/'.length));
			path = `${dataRoot}/${pp.dir}_output/${pp.name}${pp.ext}`;
		}
		else {
			path = `${wwwRoot}${url}`;
		}
		return path;
	};

	const path = make_path(url);

	console.log(`${url} => ${path} ${data ? '[SAVED]' : ''}`);
	if (data) {
		Deno.writeFile(get_saved_file_path(path), data);
		return { mime: getMime('.json'), bytes: encoder.encode("done") };
	}
	else {
		let bytes;
		if (path.endsWith('.txt')) {
			try {
				bytes = await Deno.readFile(get_saved_file_path(path));
			}
			catch(e) {
				bytes = await Deno.readFile(get_text_file_path(path));
			}
		}
		else if (path.endsWith('.png')) {
			bytes = await Deno.readFile(get_image_file_path(path));
		}
		else {
			bytes = await Deno.readFile(path);
		}
		return { mime: getMime(path), bytes: bytes };
	}
}

async function respond(r: Resource) {
	const headers = new Headers();
	headers.set("content-length", r.bytes.length.toString());
	headers.set("content-type", r.mime);

	return {
		status: 200,
		body: r.bytes,
		headers,
	};
}

export async function serve_http(dataRoot: string, port: number) {
	let base = import.meta.url.substring( 'file:///'.length);
	base = base[1] === ':' ? base : `/${base}`;
	const wwwRoot = `${parse_path(base).dir}/web`;
	const s = serve({ port: port });
	console.log(`http://localhost:${port}/`);

	for await (const req of s) {
		if (req.url === '/favicon.ico') {
			req.respond({status: 404 });
		}
		else {
			const r = await handleRequest(wwwRoot, dataRoot, req.url, req.method === 'POST' ? await Deno.readAll(req.body) : undefined);
			req.respond(await respond(r));
		}
	}
}

if (import.meta.main) serve_http(Deno.args[0], 8000);