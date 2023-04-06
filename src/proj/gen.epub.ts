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
	return {
		path: `${meta_dir}/container.xml`,
		content: utf8_to_bin(xml),
	};
}

function gen_mimetype(): FileInfo {
	const x = 'application/epub+zip';
	return {
		path: `/mimetype`,
		content: utf8_to_bin(x),
	};
}

export function gen_epub(n: ElementNode): FileInfo[] {
	return [
		gen_mimetype(),
		gen_container()
	];
}