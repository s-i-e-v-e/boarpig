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
	make_proj_saved_text_path,
	make_text_path, mkdir,
	parse_path,
} from "/io.ts";

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

interface Project {
	name: string,
	xs: string[], // pages
}

interface State {
	dataRoot: string,
	wwwRoot: string,
	xs: Project[],
}

interface ApiData {
	cmd: string,
}

interface ApiPage extends ApiData {
	project: string,
	page: string,
}

function handleApiRequest(st: State, data: ApiData): Resource {
	let y;
	switch (data.cmd) {
		case 'list-projects': {
			y = {
				xs: st.xs.map(x => x.name),
			};
			break;
		}
		case 'list-pages': {
			const x = data as ApiPage;
			y = {
				xs: st.xs.filter(y => y.name === x.project)[0].xs,
			};
			break;
		}
		default: throw new Error(data.cmd);
	}

	return { mime: getMime('x.json'), bytes: encoder.encode(JSON.stringify(y)) };
}

async function handleRequest(st: State, url: string, data?: Uint8Array): Promise<Resource> {
	url = url === '/' ? '/index.html' : url;
	if (url === '/api') return handleApiRequest(st, JSON.parse(decoder.decode(data!)));

	const make_path = (url: string) => {
		let path = '';
		if (url.startsWith('/project/')) {
			let pp = parse_path(url.substring('/project/'.length));
			path = `${st.dataRoot}/${pp.dir}_output/${pp.name}${pp.ext}`;
		}
		else {
			path = `${st.wwwRoot}${url}`;
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

function buildState(dataRoot: string): State {
	let base = import.meta.url.substring( 'file:///'.length);
	base = base[1] === ':' ? base : `/${base}`; // C:/... OR /home/...
	const wwwRoot = `${parse_path(base).dir}/web`;

	const xs = list_files(dataRoot, name => name.endsWith('.pdf') || name.endsWith('.djvu'))
		.map(x => parse_path(x).name)
		.map(x => {
			const image_dir = make_image_path(`${dataRoot}/${x}_output`);
			const ys = list_files(image_dir).map(x => parse_path(x).name).sort();
			return {
				name: x,
				xs: ys,
			}
		});

	return {
		dataRoot: dataRoot,
		wwwRoot: wwwRoot,
		xs: xs,
	};
}

function respond(r: Resource) {
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
	const st = buildState(dataRoot);
	const s = serve({ port: port });
	console.log(`http://localhost:${port}/`);
	for await (const req of s) {
		let re;
		switch (req.url) {
			case '/favicon.ico': re = {status: 404 }; break;
			default: {
				re = respond(await handleRequest(st, req.url, req.method === 'POST' ? await Deno.readAll(req.body) : undefined));
				break;
			}
		}
		req
			.respond(re)
			.catch(() => {});
	}
}

if (import.meta.main) serve_http(Deno.args[0], 8000);
