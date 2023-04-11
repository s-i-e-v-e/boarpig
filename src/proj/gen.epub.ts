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
import {process_ast, State, ElementNode, TextNode} from "/proj/ast.ts";
import {FileInfo} from "/proj/gen.ts";
import {utf8_to_bin} from "/io.ts";
import {gen_html_multiple} from "./gen.html.ts";
import {fs_list_files,fs_list_directories} from "nonstd/os/fs.ts";
import {ps_exec} from "nonstd/os/ps.ts";
import {first_el} from "sxml/filter.ts";

const epub_dir = "/EPUB";
const meta_dir = "/META-INF";

function gen_container(): FileInfo {
	const xml =
		`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml" />
    </rootfiles>
</container>`;

	const name = 'container.xml';
	return {
		name: name,
		path: `${meta_dir}/${name}`,
		content: utf8_to_bin(xml),
	};
}

function gen_mimetype(): FileInfo {
	const x = 'application/epub+zip';
	const name = 'mimetype';
	return {
		name: name,
		path: `/${name}`,
		content: utf8_to_bin(x),
	};
}

function gen_opf(xs: FileInfo[], meta: any): FileInfo {
	const ys = [];
	let id = '';
	let id_name = '';
	if (meta.id.uuid) {
		id = `urn:uuid:${meta.id.uuid}`;
		id_name = 'pub-id';
	}
	else if (meta.id.isbn) {
		id = `urn:isbn:${meta.id.isbn}`;
		id_name = 'pub-isbn';
	}
	else {
		throw new Error();
	}

	ys.push(`<?xml version="1.0" encoding="UTF-8"?>`);
	ys.push(`<package xmlns="http://www.idpf.org/2007/opf" xmlns:opf="http://www.idpf.org/2007/opf" version="3.0" xml:lang="en-US" dir="ltr" unique-identifier="${id_name}">`);
	ys.push(`<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">`);
	ys.push(`<dc:identifier id="${id_name}">${id}</dc:identifier>`);
	ys.push(`<dc:title>${meta.title}</dc:title>`);
	ys.push(`<dc:language>${meta.language}</dc:language>`);
	ys.push(`<dc:creator>${meta.author}</dc:creator>`);
	ys.push(`<meta property="dcterms:modified">${(new Date()).toISOString().replace(/\.\d+/, '')}</meta>`);

	if (meta.publisher) ys.push(`<dc:publisher>${meta.publisher}</dc:publisher>`);
	if (meta.date) ys.push(`<dc:date>${meta.date}</dc:date>`);
	if (meta.description) ys.push(`<dc:description>${meta.description}</dc:description>`);
	if (meta.subjects.length) {
		for (const x of meta.subjects) {
			ys.push(`<dc:subject>${x}</dc:subject>`);
		}
	}
	if (meta.copyright) ys.push(`<dc:rights>${meta.copyright}</dc:rights>`);
	ys.push(`</metadata>`);

	ys.push(`<manifest>`);
	for (const x of xs) {
		let type = '';
		if (x.path.endsWith('.html')) {
			type = 'application/xhtml+xml';
		}
		else if (x.path.endsWith('.css')) {
			type = 'text/css';
		}
		else if (x.path.endsWith('.png')) {
			type = 'image/png';
		}
		else if (x.path.endsWith('.gif')) {
			type = 'image/gif';
		}
		else if (x.path.endsWith('.jpg')) {
			type = 'image/jpeg';
		}
		else {
			throw new Error(x.path);
		}
		let props = x.name.startsWith('toc') ? ' properties="nav"' : '';
		props = x.name.startsWith('cover') ? ' properties="cover-image"' : props;
		ys.push(`<item href="${x.path.replace('/EPUB/', '')}" id="${x.name}" media-type="${type}"${props}/>`);
	}
	ys.push(`</manifest>`);

	ys.push(`<spine>`);
	for (const x of xs.filter(x => x.path.endsWith('.html'))) {
		ys.push(`<itemref idref="${x.name}"/>`);
	}
	ys.push(`</spine>`);

	ys.push(`</package>`);

	const name = 'content.opf';
	return {
		name: name,
		path: `${epub_dir}/${name}`,
		content: utf8_to_bin(ys.join('')),
	};
}

function collect_assets(path: string, full_path: string): FileInfo[] {
	const xs = fs_list_files(full_path)
		.map(x => { return { path: `${path}/${x}`, name: x, content: new Uint8Array(0)}; });
	const ys = fs_list_directories(full_path);
	for (const y of ys) {
		xs.push(...collect_assets(`${path}/${y}`, `${full_path}/${y}`));
	}
	return xs;
}

function get_meta(n: ElementNode) {
	const val = (x: string) => {
		const y = first_el(x, n);
		return y ? (y.xs[0] as TextNode).value : '';
	};

	const language = val('project/meta/lang');
	const title = val('project/meta/title');
	const author = val('project/meta/author');
	const publisher = val('project/meta/publisher');
	const year = val('project/meta/year');
	const description = val('project/meta/description');
	const copyright = val('project/meta/copyright');
	const uuid = val('project/meta/id/uuid');
	const isbn = val('project/meta/id/isbn');

	const su = first_el('project/meta/subjects', n);
	const subjects = su ? su.xs.map(x => (x as TextNode).value).join('').split(';') : [];
	console.log(subjects);

	return {
		language: language,
		title: title,
		author: author,
		publisher: publisher,
		date: year,
		description: description,
		copyright: copyright,
		subjects: subjects,
		id: {uuid: uuid, isbn: isbn},
	};
}

export function gen_epub(n: ElementNode, base_dir: string): [FileInfo[], string] {
	const xs = gen_html_multiple(n, epub_dir, true);
	const ys = collect_assets('/EPUB/assets', `${base_dir}/EPUB/assets`);
	ys.push(...xs);
	const meta = get_meta(n);
	const file_name = `${meta.author}_${meta.title}.epub`.replaceAll(/[^A-Za-z0-9._]+/gmui, '_');

	xs.push(gen_opf(ys, meta));
	xs.push(gen_mimetype());
	xs.push(gen_container());
	return [xs, file_name];
}

export function make_epub(base_dir: string, file_name: string) {
	ps_exec(base_dir, ['zip', '--compression-method', 'store', file_name, './mimetype']);
	ps_exec(base_dir, ['zip', '--compression-method', 'deflate', '--recurse-paths', file_name, './META-INF', './EPUB']);
}