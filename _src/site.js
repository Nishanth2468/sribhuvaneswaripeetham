// Mobile menu
const menuBtn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
menuBtn.addEventListener('click', () => menuBtn.setAttribute('aria-expanded', nav.classList.toggle('open')));
// Only one dropdown open at a time; close on outside click
const drops = [...nav.querySelectorAll('details')];
drops.forEach(d => d.addEventListener('toggle', () => d.open && drops.forEach(o => o !== d && (o.open = false))));
document.addEventListener('click', e => { if (!nav.contains(e.target)) drops.forEach(d => (d.open = false)); });

// Language: Google Translate reads the "googtrans" cookie. Telugu = original, so no script loads.
const lang = (document.cookie.match(/googtrans=\/te\/(\w+)/) || [])[1] || 'te';
document.querySelectorAll('[data-lang]').forEach(b => {
  b.setAttribute('aria-pressed', b.dataset.lang === lang);
  b.addEventListener('click', () => {
    const gone = '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/', h = location.hostname;
    ['', ';domain=' + h, ';domain=.' + h.replace(/^www\./, '')].forEach(d => (document.cookie = 'googtrans' + gone + d));
    if (b.dataset.lang !== 'te') document.cookie = 'googtrans=/te/' + b.dataset.lang + ';path=/';
    location.reload();
  });
});
if (lang !== 'te') {
  window.gtInit = () => new google.translate.TranslateElement({ pageLanguage: 'te', autoDisplay: false }, 'gt');
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=gtInit';
  document.body.append(s);
}

// Updates: shown from updates.js at once, then replaced by the Google Sheet (UPDATES_SHEET) when it loads
// <sheet>
function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
// Sheet dates: 2026-10-11 or Indian day-first 11/10/2026, 11-10-2026, 11.10.2026
function isoDate(s) {
  const p = n => String(n).padStart(2, '0'); s = (s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${p(m[2])}-${p(m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${p(m[2])}-${p(m[1])}` : '';
}
function sheetRows(csv) { // columns: date | end date | title | details | link
  return parseCSV(csv).slice(1).map(r => ({ date: isoDate(r[0]), end: isoDate(r[1]), title: (r[2] || '').trim(), text: (r[3] || '').trim(), link: (r[4] || '').trim() }))
    .filter(u => u.date && u.title);
}
// </sheet>
const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
const fmt = d => new Date(d + 'T00:00').toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const safeLink = l => /^(https?:\/\/|[\w-]+\.html$)/.test(l || '') ? l : ''; // sheet is editable by many people
function renderUpdates(all) {
  document.querySelectorAll('[data-updates]').forEach(el => {
    const past = el.dataset.updates === 'past';
    let list = all
      .filter(u => ((u.end || u.date) < today) === past)
      .sort((a, b) => (a.date < b.date) === past ? 1 : -1);
    if (el.dataset.limit) list = list.slice(0, +el.dataset.limit);
    el.innerHTML = list.length ? list.map(u => `<article class="update">
      ${safeLink(u.img) ? `<img src="${esc(u.img)}" alt="" loading="lazy">` : ''}
      <time datetime="${u.date}">${fmt(u.date)}${u.end ? ' – ' + fmt(u.end) : ''}</time>
      <h3>${esc(u.title)}</h3>${u.text ? `<p>${esc(u.text)}</p>` : ''}
      ${safeLink(u.link) ? `<a href="${esc(u.link)}"${u.link.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(u.linkText || 'మరిన్ని వివరాలు →')}</a>` : ''}
    </article>`).join('') : `<p class="empty">${el.dataset.empty || ''}</p>`;
  });
}
if (document.querySelector('[data-updates]')) {
  renderUpdates(window.UPDATES || []);
  if (window.UPDATES_SHEET) fetch(window.UPDATES_SHEET)
    .then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(csv => csv.trim().startsWith('<') || renderUpdates(sheetRows(csv))) // HTML = not published as CSV
    .catch(() => {}); // offline / sheet unpublished: keep updates.js list
}

// Gallery lightbox: native <dialog>, Esc closes, arrows / buttons move
const shots = [...document.querySelectorAll('.gallery a')];
if (shots.length) {
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.innerHTML = '<img alt=""><p></p><button class="lb-prev" aria-label="ముందుది">‹</button><button class="lb-next" aria-label="తర్వాతది">›</button><button class="lb-close" aria-label="మూసివేయి">✕</button>';
  document.body.append(dlg);
  const big = dlg.querySelector('img'), cap = dlg.querySelector('p');
  let at = 0;
  const show = n => {
    at = (n + shots.length) % shots.length;
    big.src = shots[at].href;
    big.alt = shots[at].querySelector('img').alt;
    cap.textContent = (shots[at].querySelector('span') || {}).textContent || '';
  };
  shots.forEach((a, n) => a.addEventListener('click', e => { e.preventDefault(); show(n); dlg.showModal(); }));
  dlg.querySelector('.lb-prev').onclick = () => show(at - 1);
  dlg.querySelector('.lb-next').onclick = () => show(at + 1);
  dlg.querySelector('.lb-close').onclick = () => dlg.close();
  dlg.addEventListener('click', e => e.target === dlg && dlg.close());
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
}
