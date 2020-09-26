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
import { serve_http } from './serve.ts';
import {
	make_image_path,
	make_text_path,
	make_out_dir_path,
	parse_path,
	mkdir,
} from './io.ts';
import { make_project, gen_project } from './proj/project.ts';

const EXT = '.png';

function listExtractedImageFiles(out_dir: string, range: string) {
	const [start, end] = parseRange(range);
	return Array
	.from(Deno.readDirSync(make_image_path(out_dir)))
	.filter(x => x.name.startsWith('img-') && x.name.endsWith(EXT))
	.map(x => x.name)
	.filter(x => { const n = Number(parse_path(x).name.split('-')[1]); return !(n < start || n > end); })
	.sort();
}

function listRenumberedImageFiles(out_dir: string, prefix?: string, range?: string) {
	const [start, end] = range ? parseRange(range) : [undefined, undefined];
	let xs = Array.from(Deno.readDirSync(make_image_path(out_dir))).filter(x => x.name.endsWith(EXT)).map(x => x.name);
	if (prefix) xs = xs.filter(x => x.startsWith(prefix!));
	if (range) xs = xs.filter(x => { const n = Number(parse_path(x).name.substring(prefix!.length)); return !(n < start! || n > end!); });
	return xs.sort();
}

function parseRange(range: string): [number, number] {
	const _ = range.split('-').map(x => Number(x));
	const start = _[0];
	const end = _[1];
	return [start, end];
}

async function extract_pdf(file: string, out_dir?: string) {
	const file_full_path = Deno.realPathSync(file);
	out_dir = out_dir || make_out_dir_path(file);

	mkdir(out_dir);

	const cwd = Deno.cwd();
	try {
		println(`Extracting ${file} into ${out_dir}`);
		Deno.chdir(out_dir);
		const p = Deno.run({
			cmd: ["mutool", "extract", file_full_path],
		});
		await p.status();

		const img_dir = make_image_path('.');
		mkdir(img_dir);
		await Promise.all(Array
			.from(Deno.readDirSync('.'))
			.filter(f => f.name.endsWith(EXT))
			.map(f => Deno.rename(`${f.name}`, `${img_dir}/${f.name}`))
		);
	}
	finally {
		Deno.chdir(cwd);
	}
}

async function extract_djvu(file: string) {
	const fp = parse_path(file);
	const out_dir = make_out_dir_path(file);
	const out_file = `${out_dir}/${fp.name}.pdf`;

	mkdir(out_dir);

	println(`Converting ${file} => ${out_file}`);
	const p = Deno.run({
		cmd: ["ddjvu", "-format=pdf", file, out_file],
	});
	await p.status();
	await extract_pdf(out_file, out_dir);
}

function extract(file: string) {
	switch (parse_path(file).ext) {
		case ".djvu": extract_djvu(file); break;
		case ".pdf": extract_pdf(file); break;
		default: throw new Error();
	}
}

function renumber(file: string, prefix: string, range: string) {
	const pad = (i: number) => `${i < 10 ? '000' : i < 100 ? '00' : i < 1000 ? '0' : ''}${i}`;
	
	const out_dir = make_out_dir_path(file);
	const xs = listExtractedImageFiles(out_dir, range);
	const img_dir = make_image_path(out_dir);

	let i = 1;
	xs.forEach(x => {
		const y = `${prefix}${pad(i)}${EXT}`;
		println(`Renaming ${x} => ${y}`);

		const xx = `${img_dir}/${x}`;
		const yy = `${img_dir}/${y}`;
		Deno.rename(xx, yy);
		i += 1;
	});
}

async function process_text_file(file: string) {
	let a = undefined;
	try {
		a = await Deno.readTextFile(file);
	}
	catch(e) {

	}
	if (a === undefined) return;
	println(`Format ${file}`);
	a = a.trim();
	a = a.replaceAll(/([a-zA-Z])’([a-zA-Z])/gi, "$1'$2");
	a = a.replaceAll(' ?', '?');
	a = a.replaceAll(' !', '!');
	a = a.replaceAll(' ;', ';');
	a = a.replaceAll(' :', ':');

	a = a.replaceAll('“ ', '“');
	a = a.replaceAll(' ”', '”');
	a = a.replaceAll('‘ ', '‘');
	a = a.replaceAll(' ’', '’');

	a = a.replaceAll('““', '“');
	a = a.replaceAll('””', '”');

	a = a.replaceAll('‘‘', '“');
	a = a.replaceAll('’’', '”');
	
	a = a.replaceAll('‘“', '“');
	a = a.replaceAll('”’', '”');

	a = a.replaceAll('“‘', '“');
	a = a.replaceAll('’”', '”');

	a = a.replaceAll('“T ', '“I ');
	a = a.replaceAll('[’', 'I’');
	a = a.replaceAll('I’ve', 'I\'ve');
	a = a.replaceAll('I’m', 'I\'m');


	a = a.replaceAll(/[ ]+/g, ' ');
	a = a.replaceAll(/ \n/g, '\n');
	a = a.replaceAll(/\n\n+/g, '\n\n');
	Deno.writeTextFile(file, a);
}

interface Page { image: string, text: string }

function ocr(file: string, prefix?: string, range?: string) {
	Deno.env.set("OMP_THREAD_LIMIT", "1");
	const out_dir = make_out_dir_path(file);
	const img_dir = make_image_path(out_dir);
	const txt_dir = make_text_path(out_dir);
	mkdir(txt_dir);

	async function run(xs: Page[]) {
		const ys = xs.map(x => {
			const p = Deno.run({
				cmd: ["tesseract", "--dpi", "300", "-l", "eng", `${img_dir}/${x.image}`, `${txt_dir}/${x.text}`],
			});
			println(`OCR ${x.image} => ${x.text}`);
			return p.status();
		});
		
		await Promise.all(ys);
		xs.forEach(async x => process_text_file( `${txt_dir}/${x.text}.txt`));
	}

	function build_batch(xs: string[]) {
		const ys: Page[] = xs.map(x => { return {image: x, text: x.substring(0, x.indexOf(EXT))}});

		const n1 = 0|xs.length/4;
		const n2 = xs.length%4;
		
		const zs: Page[][] = [];
		
		for (let i = 0; i < n1; i++) {
			const xx = [];
			const n = i * 4;
			xx.push(ys[n+0]);
			xx.push(ys[n+1]);
			xx.push(ys[n+2]);
			xx.push(ys[n+3]);
			zs.push(xx);
		}
	
		{
			const xx: Page[] = [];
			for (let i = 0; i < n2; i++) {
				xx.push(ys[(n1*4)+i]);
			}
			zs.push(xx);
		}

		return zs;
	}

	const xs = build_batch(listRenumberedImageFiles(out_dir, prefix, range));
	xs.forEach(x => run(x));
}

function fmt(file: string, prefix?: string, range?: string) {
	const out_dir = make_out_dir_path(file);
	const txt_dir = make_text_path(out_dir);
	const xs = listRenumberedImageFiles(out_dir, prefix, range)
	xs.forEach(async x => process_text_file( `${txt_dir}/${parse_path(x).name}.txt`));
}

function serve(path: string, port?: string) {
	const p = port ? Number(port) : 8000;
	serve_http(path, p);
}

function make(file: string, clobber: string) {
	const do_clobber = clobber === '--clobber';
	make_project(file, do_clobber);
}

function gen(file: string, format: string) {
	gen_project(file, format);
}

function println(x: string) {
	console.log(x);
}

function version() {
	println('boarpig 0.1');
	println('Copyright (C) 2020 Sieve (https://github.com/s-i-e-v-e)');
	println('This is free software; see the source for copying conditions.  There is NO');
	println('warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.');
}

function help() {
	version();
	println('Usage:');
	println('help,    --help,                   Display this information.');
	println('version, --version                 Display version information.');
	println('extract file                       Extract images from pdf/djvu file.');
	println('renumber file prefix start-end     Renumber extracted images within given range.');
	println('ocr file [prefix [start-end]]      Perform OCR on renumbered images.');
	println('fmt file [prefix [start-end]]      Format generated text files.');
	println('make file [--clobber]              Combine processed text files into single project.');
	println('gen file format                    Generate output from project.');
	println('serve path [port]                  Serve http over port with path as root.');
}

export function main(args: string[]) {
		const cmd = args[0];
		switch(cmd) {
				case "extract": extract(args[1]); break;
				case "renumber": renumber(args[1], args[2], args[3]); break;
				case "ocr": ocr(args[1], args[2], args[3]); break;
				case "fmt": fmt(args[1], args[2], args[3]); break;
				case "make": make(args[1], args[2]); break;
				case "gen": gen(args[1], args[2]); break;
				case "serve": serve(args[1], args[2]); break;
				case "--version":
				case "version": version(); break;
				case "--help":
				case "help":
				default: help(); break;
		}
}

if (import.meta.main) main(Deno.args);