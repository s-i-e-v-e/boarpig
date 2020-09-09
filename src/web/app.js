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

function updateTextSelection(e, fn) {
	e.preventDefault();
	const text = getTextControl();
	let start = text.selectionStart;
	let end = text.selectionEnd;
	let selectedValue = text.value.substring(start, end);
	let ln = selectedValue.length;
	selectedValue = selectedValue.trimStart();
	start += ln - selectedValue.length;
	ln = selectedValue.length;
	selectedValue = selectedValue.trimEnd();
	end -= ln - selectedValue.length;

	ln = selectedValue.length;
	selectedValue = fn ? fn(selectedValue) : selectedValue;

	text.value = `${text.value.substring(0, start)}${selectedValue}${text.value.substring(end)}`;
	end += selectedValue.length - ln;
	text.setSelectionRange(start, end);
	text.focus();
}

function addXMLTag(e, tag, fn) {
	return updateTextSelection(e, (v) => `<${tag}>${fn ? fn(v) : v}</${tag}>`);
}

function addItalics(e) {
	return addXMLTag(e, 'i');
}

function addHeader(e) {
	return addXMLTag(e, 'h');
}

function addPageNum(e) {
	return addXMLTag(e, 'pg');
}

function addFormWork(e) {
	const fn = (v) => {
		if (v.length === 1 && v.search(/[A-Z]/g) === 0) return `<sig>${v}</sig>`;

		const a = v.replaceAll(/([0-9]+)\s+(.*)/gi, '<pg>$1</pg><h>$2</h>');
		if (a.length === v.length) {
			const n = v.lastIndexOf(' ');
			if (n) {
				const b1 = v.substring(0, n);
				const b2 = Number(v.substring(n +1));
				if (!isNaN(b2)) {
					v = `<h>${b1}</h><pg>${b2}</pg>`;
				}
			}
		}
		else {
			v = a;
		}
		return v;
	};

	return addXMLTag(e, 'fw', fn);
}

function changeChar(e) {
	return updateTextSelection(e, (v) => {
		switch(v) {
			case '‘' : return '“';
			case '’' : return '”';
			case '“' : return '‘';
			case '”' : return '’';
			case '-' : return '–';
			case '–' : return '—';
			case '—' : return '——';
			case '——' : return '-';
			default: return v;
		}
	});
}

function handleClick(id, fn) {
	const x = document.querySelectorAll(`a[href="${id}"]`)[0];
	x.addEventListener("click", fn);
}

window.onload = function() {
	const book = () => window.location.hash ? window.location.hash.substring(1) : '';
	handleClick('#prev', e => { e.preventDefault(); loadImage(book(), -1); return true; });
	handleClick('#next', e => { e.preventDefault(); loadImage(book(), 1); return true; });
	handleClick('#quote', e => addXMLTag(e, 'quote'));
	handleClick('#fw', e => addFormWork(e));
	
	document.addEventListener("keydown", function(e) {
		switch(e.key) {
			case "ArrowLeft": if (e.ctrlKey) loadImage(book(), -1); break;
			case "ArrowRight": if (e.ctrlKey) loadImage(book(), 1); break;
		}
		if (e.target.tagName === 'TEXTAREA') {
			switch(e.key) {
				case "i": if (e.ctrlKey) addItalics(e); break;
				case "h": if (e.ctrlKey) addHeader(e); break;
				case "p": if (e.ctrlKey) addPageNum(e); break;
				case "f": if (e.ctrlKey && e.altKey) addFormWork(e); break;
				case "q": if (e.ctrlKey) changeChar(e); break;
			}
			 return;
		}
	});
	loadImage(book());
}