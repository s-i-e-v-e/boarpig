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

interface Resource {
	mime: string,
	bytes: Uint8Array,
}

const encoder = new TextEncoder();

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

function getSavedFilePath(path: string) {
	const n = path.lastIndexOf('/')+1;
	return `${path.substring(0, n)}saved.${path.substring(n)}`;
}

async function handleRequest(baseDir: string, dataDir: string, url: string, data?: Uint8Array): Promise<Resource> {
	let path = '';
	url = url === '/' ? '/index.html' : url;
	if (url.startsWith('/data/')) {
		path = `${dataDir}${url.substring('/data'.length)}`;
	}
	else {
		path = `${baseDir}/web${url}`;
	}

	console.log(`${url} => ${path} ${data ? '[SAVED]' : ''}`);
	if (data) {
		Deno.writeFile(getSavedFilePath(path), data);
		return { mime: getMime('.json'), bytes: encoder.encode("done") };
	}
	else {
		let bytes;
		if (path.endsWith('.txt')) {
			try {
				bytes = await Deno.readFile(getSavedFilePath(path));
			}
			catch(e) {
				bytes = await Deno.readFile(path);
			}
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

export async function serve_http(baseDir: string, dataDir: string, port: number) {
	const s = serve({ port: port });
	console.log(`http://localhost:${port}/`);

	const dec = new TextDecoder();
	for await (const req of s) {
		if (req.url === '/favicon.ico') {
			req.respond({status: 404 });
		}
		else {
			const r = await handleRequest(baseDir, dataDir, req.url, req.method === 'POST' ? await Deno.readAll(req.body) : undefined);
			req.respond(await respond(r));
		}
	}
}

if (import.meta.main) {
	serve_http('.', Deno.args[0], 8000);
}