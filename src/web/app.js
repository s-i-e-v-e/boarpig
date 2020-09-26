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
import * as proof from './proof.js';
import * as ux from './util.js';

const PREFIX = '/project/';

window.onload = () => {
    load();
};

window.onhashchange = () => {
    load();
};

function setMatter(xs) {
    const d = document.querySelector('#matter');
    d.innerHTML = xs.join('');
}

function setNav(xs) {
    const d = document.querySelector('#nav');
    d.innerHTML = xs.join('');
}

async function listProjects() {
    const a = await ux.fetchJSON({cmd: 'list-projects'});

    const xs = [];
    xs.push('<ul>');
    a.xs.forEach(x => xs.push(`<li><a href="#${PREFIX}${x}">${x}</a>`));
    xs.push('</ul>');
    setMatter(xs);
}

function loadProject(url) {
    if (url.indexOf(PREFIX) === 0) {
        proof.load((nv, matter) => { setNav([nv]); setMatter([matter]);});
    }
}

function load() {
    const url = ux.getUrl();
    if (url) {
        loadProject(url);
    }
    else {
        listProjects();
    }
}