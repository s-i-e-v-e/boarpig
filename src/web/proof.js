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
	return document.querySelectorAll('#pg-text')[0];
}

function getPageSelectControl() {
	return document.querySelectorAll('#pg-select')[0];
}

function makeUrl(p, ext) {
	return `${PREFIX}${p.project}/${p.page}${ext}`;
}

function setUrl(p) {
	window.location.hash = `#${makeUrl(p, '')}`;
}

function setImage(p) {
	const image = document.querySelectorAll('#pg-image')[0];
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
	if (text.value && text.value !== text.getAttribute('data-value')) {
		await fetch(url, {method: 'POST', body: text.value});
	}
}

// url: /project/BOOK_NAME/PAGE
function getPage() {
	return document.project;
}

async function setPage() {
	const url = ux.getUrl();
	const xs = url.split('/');

	let p = getPage();
	if (!p || p.name !== xs[2]) {
		p = {project: xs[2], page: xs[3] || ''};
		document.project = p;

		const a = await ux.fetchJSON({cmd: 'list-pages', project: p.project, page: ''});
		p.xs = a.xs;
	}
}

async function changePage(cmd, pg) {
	const p = getPage();
	if (p.page) await saveText(p);
	pg = pg || p.page;

	let i = pg ? p.xs.findIndex(y => y.indexOf(pg) === 0) : -1;
	switch (cmd) {
		case 'prev': i--; break;
		case 'next': i++; break;
		case 'this': break;
		default: throw new Error();
	}
	const min = 0;
	const max = p.xs.length-1;
	i = i < min ? min : i > max ? max : i;
	p.page = p.xs[i];
	setUrl(p);
}

async function previousPage() {
	changePage('prev');
}

async function nextPage() {
	changePage('next');
}

async function selectThisPage() {
	const select = getPageSelectControl();
	changePage('this', select.value);
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

function handleChange(id, fn) {
	const x = document.querySelector(`select[id="${id}"]`);
	x.addEventListener("change", fn);
}

const keydown = e => {
	switch(e.key) {
		case "ArrowLeft": if (e.ctrlKey) previousPage(); break;
		case "ArrowRight": if (e.ctrlKey) nextPage(); break;
	}
	if (e.target.id === 'pg-text') {
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
	const nv = `${button('prev', 'Prev')}<select id="pg-select"></select>${button('next', 'Next')}${button('quote', 'quote')}${button('fw', 'fw')}`;
	const x = `<table id="pg"><tr><td><img id="pg-image" /></td><td><textarea id="pg-text"></textarea></td></tr></table>`;

	fn(nv, x);
	handleClick('prev', () => previousPage());
	handleClick('next', () => nextPage());
	handleClick('quote', e => addTag(e, 'quote'));
	handleClick('fw', e => addFormWork(e));
	handleChange('pg-select', () => selectThisPage());
	document.addEventListener('keydown', keydown);
	_init = true;
}

function updatePageSelectControl() {
	const p = getPage();
	if (p && p.xs) {
		const select = getPageSelectControl();
		if (select.firstChild) {
			select.value = p.page;
		}
		else {
			const xs = p.xs.map(x => `<option value="${x}">${x}</option>`);
			select.innerHTML = xs.join('');
		}
	}
}

export async function load(fn) {
	init(fn);
	await setPage();
	updatePageSelectControl();
	const p = getPage();
	if (p.page) {
		setImage(p);
		await loadText(p);
	}
	else {
		selectThisPage();
	}
}