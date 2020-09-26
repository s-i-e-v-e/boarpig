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
import * as ux from './util.js';
const PREFIX = '/project/';

function getTextControl() {
	return document.querySelectorAll('#text > textarea')[0];
}

function makeUrl(p, ext) {
	return `${PREFIX}${p.project}/${p.page}${ext}`;
}

function setUrl(p) {
	window.location.hash = `#${makeUrl(p, '')}`;
}

function setImage(p) {
	const image = document.querySelectorAll('#image > img')[0];
	image.setAttribute("src", makeUrl(p, '.png'));
}

async function loadText(p) {
	const url = makeUrl(p, '.txt');

	const res = await fetch(url);
	const data = await res.text();

	const text = getTextControl();
	text.value = data;
	text.setAttribute('data-value', data);
}

async function saveText(p) {
	const url = makeUrl(p, '.txt');

	// save old data
	const text = getTextControl();
	const value = text.getAttribute('data-value');
	if (text.value && value !== text.value) {
		await fetch(url, {method: 'POST', body: text.value});
	}
}

// url: /project/BOOK_NAME/PAGE
function getPage() {
	const url = ux.getUrl();
	const xs = url.split('/');
	return {project: xs[2], page: xs[3] || ''};
}

async function fetchPage(cmd) {
	const p = getPage();
	if (p.page) await saveText(p);
	const a = await ux.fetchJSON({cmd: cmd, project: p.project, page: p.page});
	p.page = a.page;
	return p;
}

async function previousPage() {
	setUrl(await fetchPage('prev-page'));
}

async function nextPage() {
	setUrl(await fetchPage('next-page'));
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

function addTag(e, tag, fn) {
	return updateTextSelection(e, (v) => `(:${tag} ${fn ? fn(v) : v})`);
}

function addItalics(e) {
	return addTag(e, 'i');
}

function addHeader(e) {
	return addTag(e, 'h');
}

function addPageNum(e) {
	return addTag(e, 'pg');
}

function addParaBreak(e) {
	e.preventDefault();
	const text = getTextControl();
	text.value = text.value + '\n(:pb)'
	text.setSelectionRange(text.value.length, text.value.length);
	text.focus();
	return false;
}

function addFormWork(e) {
	const fn = (v) => {
		if (v.length === 1 && v.search(/[A-Z]/g) === 0) return `(:sig ${v})`;

		const a = v.replaceAll(/([0-9]+)\s+(.*)/gi, '(:pg $1)(:h $2)');
		if (a.length === v.length) {
			const n = v.lastIndexOf(' ');
			if (n) {
				const b1 = v.substring(0, n);
				const b2 = Number(v.substring(n +1));
				if (!isNaN(b2)) {
					v = `(:h ${b1})(:pg ${b2})`;
				}
			}
		}
		else {
			v = a;
		}
		return v;
	};

	return addTag(e, 'fw', fn);
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
	const x = document.querySelector(`button[id="${id}"]`);
	x.addEventListener("click", fn);
}

const keydown = e => {
	switch(e.key) {
		case "ArrowLeft": if (e.ctrlKey) previousPage(); break;
		case "ArrowRight": if (e.ctrlKey) nextPage(); break;
	}
	if (e.target.tagName === 'TEXTAREA') {
		switch(e.key) {
			case "i": case "I": if (e.ctrlKey) addItalics(e); break;
			case "h": case "H": if (e.ctrlKey) addHeader(e); break;
			case "g": case "G": if (e.ctrlKey) addPageNum(e); break;
			case "p": case "P": if (e.ctrlKey) addParaBreak(e); break;
			case "f": case "F": if (e.ctrlKey && e.altKey) addFormWork(e); break;
			case "q": case "Q": if (e.ctrlKey) changeChar(e); break;
		}
	}
};

let _init = false;
function init(fn) {
	if (_init) return;
	const button = (id, cap) => `<button class="action" type="button" id="${id}">${cap}</button>`;
	const nv = `${button('prev', 'Prev')}${button('next', 'Next')}${button('quote', 'quote')}${button('fw', 'fw')}`;
	const x = `<div id="image"><img /></div><div id="text"><textarea></textarea></div>`;

	fn(nv, x);
	handleClick('prev', () => previousPage());
	handleClick('next', () => nextPage());
	handleClick('quote', e => addTag(e, 'quote'));
	handleClick('fw', e => addFormWork(e));

	document.addEventListener('keydown', keydown);
	_init = true;
}

export async function load(fn) {
	init(fn);
	const p = getPage();
	if (p.page) {
		setImage(p);
		await loadText(p);
	}
	else {
		nextPage();
	}
}