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
const EXT = '.png';

function make_uri(uri) {
	return window.location.pathname+uri;
}

function make_path(uri) {
	return window.location.pathname+uri;
}

function getTextControl() {
	return document.querySelectorAll('#text > textarea')[0];
}

async function saveText(book) {
	let url = make_uri(`data${book}.txt`);

	// save old data
	const text = getTextControl();
	const value = text.getAttribute('data-value');
	if (value !== text.value) {
		fetch(url, {method: 'POST', body: text.value});
	}
}

async function loadText(book) {
	let url = make_uri(`data${book}.txt`);

	const res = await fetch(url);
	const data = await res.text();

	const text = getTextControl();
	text.value = data;
	text.setAttribute('data-value', data);
}

async function loadImage(book, nn) {
	const pad = (i) => `${i < 10 ? '000' : i < 100 ? '00' : i < 1000 ? '0' : ''}${i}`;
	if (nn !== undefined) {
		saveText(book);
		const idx = book.lastIndexOf('/')+1;
		const p = book.substring(idx);
		let n = (p.substring(1)|0) + nn;
		n = n < 1 ? 1 : n;
		let ns = pad(n);
	
		book = `${book.substring(0, idx)}${p.substring(0, 1)}${ns}`;
	}
	const url = make_uri(`data${book}${EXT}`);
	const image = document.querySelectorAll('#image > img')[0];
	image.setAttribute("src", url);
	window.location.hash = book;
	loadText(book);
}

function addTag(tag) {
	const text = getTextControl();
	const start = text.selectionStart;
	let end = text.selectionEnd;
	const selectedValue = text.value.substring(start, end);
	end -= selectedValue.length - selectedValue.trim().length;
	const n_start_tag = tag.length + 2;
	text.value = `${text.value.substring(0, start)}<${tag}>${text.value.substring(start, end)}</${tag}>${text.value.substring(end)}`;
	text.setSelectionRange(start + n_start_tag, end + n_start_tag);
	text.focus();
}

function addItalics() {
	addTag('i');
}

window.onload = function() {
	const book = () => window.location.hash ? window.location.hash.substring(1) : '';
	const prev = document.querySelectorAll('a[href="#prev"]')[0];
	const next = document.querySelectorAll('a[href="#next"]')[0];
	prev.addEventListener("click", function(e){ e.preventDefault(); loadImage(book(), -1); return true; });
	next.addEventListener("click", function(e){ e.preventDefault(); loadImage(book(), 1); return true; });
	document.addEventListener("keydown", function(e) {
		switch(e.key) {
			case "ArrowLeft": if (e.ctrlKey) loadImage(book(), -1); break;
			case "ArrowRight": if (e.ctrlKey) loadImage(book(), 1); break;
		}
		if (e.target.tagName === 'TEXTAREA') {
			switch(e.key) {
				case "i": if (e.ctrlKey) addItalics(); break;
			}
			 return;
		}
	});
	loadImage(book());
}