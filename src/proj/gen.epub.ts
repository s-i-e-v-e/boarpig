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
import {mkdir} from "../io.ts";

export function gen_epub(out_dir: string) {
	const root_dir = `${out_dir}/proj/.output/epub-root`;
	const epub_dir = `${root_dir}/EPUB`;
	const meta_dir = `${root_dir}/META-INF`;

	mkdir(root_dir);
	mkdir(epub_dir);
	mkdir(meta_dir);
	Deno.writeTextFileSync(`${root_dir}/mimetype`, 'application/epub+zip');

	const container_xml =
`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml" />
    </rootfiles>
</container>`;

	Deno.writeTextFileSync(`${meta_dir}/container.xml`, container_xml);
}