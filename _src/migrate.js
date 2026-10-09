// One-time migration: Zoho HTTrack mirror -> clean static site in ./site
// Run: npm i cheerio sharp (anywhere on NODE_PATH), then node _src/migrate.js
const fs = require('fs'), path = require('path'), cheerio = require('cheerio'), sharp = require('sharp');
const SRC = path.resolve(__dirname, '..'), OUT = path.join(SRC, 'site'), PARTS = __dirname;

const SLUG = {
  'index.html': 'index.html', 'aalayam.html': 'aalayam.html', 'ashramam.html': 'ashramam.html',
  'anugraham.html': 'anugraham.html', 'guru-parampara.html': 'guru-parampara.html',
  'yuva-chaitanya-mahapadayatra.html': 'mahapadayatra.html', 'యాత్ర-లక్ష్యం.html': 'yatra-lakshyam.html',
  'భారతదేశమే-ఒక-దేవాలయం.html': 'bharatadesame-oka-devalayam.html', 'Bhagswamyam.html': 'yatra-bhagaswamyam.html',
  'యాత్ర-మన-గ్రామానికి-వచ్చినప్పుడు.html': 'yatra-mana-gramaniki.html', 'దేవాలయం-కేంద్రంగా.html': 'devalayam-kendranga.html',
  'programs.html': 'programs.html', 'శ్రీ-భువనేశ్వరి-పీఠమున-కార్యక్రమములు.html': 'peetha-karyakramalu.html',
  'నూతన-ఆలయం-నిర్మాణం.html': 'nutana-alaya-nirmanam.html', 'gallery.html': 'gallery.html',
  'alayam-album.html': 'alayam-album.html', 'pooja-album.html': 'pooja-album.html', 'Ashramam-album.html': 'ashramam-album.html',
  'team.html': 'team.html', 'contact-us.html': 'contact.html', 'pooja-bookings.html': 'pooja-bookings.html',
  'donate.html': 'donate.html', 'privacy-policy.html': 'privacy-policy.html', 'terms-and-conditions.html': 'terms-and-conditions.html',
  'refund-and-cancellation-policy.html': 'refund-policy.html', 'ఆధ్యాత్మికం.html': 'adhyatmikam.html',
  'ధర్మరక్ష.html': 'dharmaraksha.html', 'సామాజికం.html': 'samajikam.html', 'పీఠ-ఆవిర్భావము.html': 'peetha-avirbhavam.html',
  'భువనేశ్వరీ-పీఠ-విలసనక్రమము.html': 'peetha-vilasanakramamu.html',
  'శ్రీ-చిదానంద-సరస్వతి-స్వామి.html': 'chidananda-saraswati-swamy.html',
  'శ్రీ-సత్యానంద-భారతి-​స్వామి.html': 'satyananda-bharati-swamy.html',
  'శ్రీ-చిదానంద-భారతి-​స్వామి.html': 'chidananda-bharati-swamy.html',
  'శ్రీ-సదానంద-భారతి-స్వామి.html': 'sadananda-bharati-swamy.html',
  'శ్రీ-ప్రకాశనంద-భారతి-స్వామి.html': 'prakashananda-bharati-swamy.html',
  'శ్రీ-సత్యానంద-భారతి-స్వామి-2.html': 'satyananda-bharati-swamy-2.html',
};
const BOOKING = 'https://pooja-sbp.mojo.page/sri-bhuvaneswari-peetham';

function mapLink(href) {
  if (!href || href.startsWith('javascript')) return null;
  if (/^(https?:|mailto:|tel:)/.test(href)) return href.replace(/^http:\/\/(?!localhost)/, 'https://');
  let f; try { f = decodeURIComponent(href.split('#')[0]); } catch { f = href; }
  return SLUG[f] || SLUG[f.replace(/​/g, '')] || null;
}

// ---------- images ----------
const imgJobs = new Map(); // src path -> {out, thumb}
function img(src, thumb = false) {
  if (!src) return null;
  let p; try { p = decodeURIComponent(src); } catch { p = src; }
  if (!/\.(png|jpe?g)$/i.test(p) || !fs.existsSync(path.join(SRC, p))) return null;
  const name = p.replace(/^(files|photoset)\//, '').replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const job = imgJobs.get(p) || { out: `img/${name}.webp`, thumb: false };
  if (thumb) job.thumb = true;
  imgJobs.set(p, job);
  return thumb ? job.out.replace('img/', 'img/t/') : job.out;
}
// Zoho gallery thumbnails are ".name.ext_m.ext"; recover the full-size file
const fullOf = s => s && s.replace(/\/\.([^/]+)_m\.\w+$/, '/$1');

// ---------- html cleaning ----------
const KEEP = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h3', 'h4', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'blockquote']);
function cleanHtml(html) {
  const $ = cheerio.load(html, null, false);
  $('style,script,noscript').remove();
  $('*').get().reverse().forEach(e => {
    let tag = e.tagName;
    if (/^h[1-6]$/.test(tag)) { e.tagName = tag = 'h3'; }
    if (tag === 'div' && !$(e).children('div,p,ul,ol,table,h3').length) e.tagName = tag = 'p';
    if (!KEEP.has(tag)) return $(e).replaceWith($(e).contents());
    for (const a of Object.keys(e.attribs)) if (!(tag === 'a' && a === 'href')) $(e).removeAttr(a);
    if (tag === 'a') { const h = mapLink($(e).attr('href')); h ? $(e).attr('href', h) : $(e).replaceWith($(e).contents()); }
  });
  $('p').each((i, e) => { if (!$(e).text().replace(/[\s​]/g, '')) $(e).remove(); });
  return $.html().replace(/<br>\s*<\/(p|li)>/g, '</$1>').replace(/&nbsp;/g, ' ').replace(/​/g, '').trim();
}

// ---------- element walker ----------
function renderElems($, root) {
  const out = [], dropped = new Set();
  const leaves = root.find('[data-element-type]').filter((i, e) => {
    const t = $(e).attr('data-element-type');
    if (!['heading', 'text', 'image', 'button', 'iframe', 'gallery', 'box'].includes(t)) return false;
    return !$(e).parentsUntil(root).filter('[data-element-type=box],[data-element-type=gallery]').length;
  });
  leaves.each((i, e) => {
    const t = $(e).attr('data-element-type'), el = $(e);
    if (t === 'heading') {
      const h = el.find('h1,h2,h3,h4,h5,h6').first(), txt = h.text().replace(/​/g, '').trim();
      if (!txt || txt === 'Title') return;
      const href = mapLink(h.find('a').attr('href'));
      out.push(`<h2>${href ? `<a href="${href}">${esc(txt)}</a>` : esc(txt)}</h2>`);
    } else if (t === 'text') {
      const c = cleanHtml(el.find('.zptext').html() || el.html()); if (c) out.push(c);
    } else if (t === 'image') {
      const im = el.find('img').first(), src = img(im.attr('data-src') || im.attr('src'));
      if (!src) return;
      const tag = `<img src="${src}" alt="${esc(im.attr('alt') || '')}" loading="lazy">`;
      const href = mapLink(im.closest('a').attr('href'));
      out.push(`<figure>${href ? `<a href="${href}">${tag}</a>` : tag}</figure>`);
    } else if (t === 'button') {
      const a = el.find('a').first(), href = mapLink(a.attr('href')), txt = a.text().trim();
      if (href && txt) out.push(`<p><a class="btn" href="${href}">${esc(txt === 'Read More' ? 'ఇంకా చదవండి' : txt)}</a></p>`);
    } else if (t === 'iframe') {
      let src = el.find('iframe').attr('src') || '';
      if (!src || src.includes('facebook.com/plugins')) return; // ponytail: FB page plugin dropped (heavy + tracking); link in footer instead
      // Drive videos currently answer "file does not exist" — hide them with their caption heading until re-shared
      if (src.includes('drive.google.com')) { if ((out[out.length - 1] || '').startsWith('<h2')) dropped.add(out.pop()); return; }
      src = src.replace(/\?si=[^&]*$/, '');
      out.push(`<div class="video"><iframe src="${src}" loading="lazy" allowfullscreen title="video"></iframe></div>`);
    } else if (t === 'gallery') {
      const items = el.find('img').map((i, im) => {
        const s = fullOf($(im).attr('data-src') || $(im).attr('src')), full = img(s), th = img(s, true);
        const cap = ($(im).attr('alt') || '').trim();
        return full ? `<a href="${full}" target="_blank"><img src="${th}" alt="${esc(cap)}" loading="lazy">${cap && cap !== 'peetam' ? `<span>${esc(cap)}</span>` : ''}</a>` : '';
      }).get().filter(Boolean);
      if (items.length) out.push(`<div class="gallery">${[...new Set(items)].join('')}</div>`);
    } else if (t === 'box') {
      const inner = renderElems($, el).join('');
      if (!inner) return;
      const href = mapLink(el.find('a[href]').filter((i, a) => mapLink($(a).attr('href'))).first().attr('href'));
      out.push(href ? `<a class="card" href="${href}">${inner.replace(/<\/?a\b[^>]*>/g, '')}</a>` : `<div class="card">${inner}</div>`);
    }
  });
  // drop Zoho's duplicated desktop/mobile copies, then group consecutive cards
  const seen = new Set(), uniq = out.filter(b => !seen.has(b) && seen.add(b))
    .filter(b => !dropped.has(b))
    .filter((b, i, a) => !(b === '<h2>వీడియోలు</h2>' && (a[i + 1] || '<h2').startsWith('<h2'))); // empty "videos" heading
  const grouped = [], isCard = b => /^<(a|div) class="card"/.test(b);
  uniq.forEach((b, i) => grouped.push((isCard(b) && !isCard(uniq[i - 1] || '') ? '<div class="cards">' : '') + b + (isCard(b) && !isCard(uniq[i + 1] || '') ? '</div>' : '')));
  return grouped;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------- template ----------
const tpl = fs.readFileSync(PARTS + '/layout.html', 'utf8');
function page(file, title, desc, body) {
  const html = tpl.replace(/{{title}}/g, esc(title)).replace(/{{desc}}/g, esc(desc))
    .replace('{{url}}', file === 'index.html' ? '' : file.replace(/\.html$/, '')) // Cloudflare serves /page for page.html
    .replace('{{body}}', () => body);
  fs.writeFileSync(path.join(OUT, file), html);
}
function describe(body) {
  const t = cheerio.load(body)('p').map((i, e) => cheerio.load(e).text()).get().join(' ').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, 155).replace(/\s\S*$/, '') + '…' : 'శ్రీ భువనేశ్వరి పీఠం - శ్రీ చిదానంద ఆశ్రమం, కేసరపల్లి, గన్నవరం.';
}

// ---------- run ----------
fs.mkdirSync(OUT + '/img/t', { recursive: true });
const EXTRA = { // fixes + extra links for migrated pages
  'mahapadayatra.html': `<ul class="links"><li><a href="yatra-lakshyam.html">యాత్ర లక్ష్యం</a></li><li><a href="bharatadesame-oka-devalayam.html">భారతదేశమే ఒక దేవాలయం - ప్రతి దేవాలయం ఒక భారతదేశం</a></li><li><a href="yatra-bhagaswamyam.html">యువచైతన్య మహాపాదయాత్రలో మన భాగస్వామ్యం</a></li><li><a href="yatra-mana-gramaniki.html">యాత్ర మన గ్రామానికి వచ్చినప్పుడు</a></li><li><a href="devalayam-kendranga.html">దేవాలయం కేంద్రంగా చేయూతగిన కొన్ని సేవా కార్యక్రమాలు</a></li></ul>`,
};
for (const [src, out] of Object.entries(SLUG)) {
  const own = path.join(PARTS, out.replace('.html', '.body.html'));
  if (fs.existsSync(own)) continue; // hand-written page, rendered below
  const $ = cheerio.load(fs.readFileSync(path.join(SRC, src), 'utf8'));
  const title = $('title').text().replace(/\s*\|\s*Bhuvaneswari Peetham\s*$/, '').replace(/​/g, '').trim();
  let blocks = renderElems($, $('[data-theme-content-container]'));
  // sadananda card on guru-parampara wrongly pointed at satyananda in Zoho
  if (out === 'guru-parampara.html') blocks = blocks.map(b => b.includes('సదానంద') ? b.replace('satyananda-bharati-swamy.html', 'sadananda-bharati-swamy.html') : b);
  const first = blocks.findIndex(b => b.startsWith('<h2'));
  let h1 = title;
  if (first >= 0) { h1 = blocks[first].replace(/<[^>]+>/g, ''); blocks.splice(first, 1); }
  const body = `<main id="main" class="wrap prose"><h1>${h1}</h1>\n${blocks.join('\n')}\n${EXTRA[out] || ''}</main>`;
  page(out, title, describe(body), body);
}
for (const f of fs.readdirSync(PARTS).filter(f => f.endsWith('.body.html'))) {
  const raw = fs.readFileSync(path.join(PARTS, f), 'utf8');
  const [, title, desc] = raw.match(/^<!--\s*(.*?)\s*\|\s*(.*?)\s*-->/);
  const body = raw.replace(/^<!--.*?-->\s*/, '').replace(/{{img:([^}]+)}}/g, (m, p) => img(p) || '');
  page(f.replace('.body.html', '.html'), title, desc, body);
  if (f === '404.body.html') { const p = path.join(OUT, '404.html'); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('<head>', '<head>\n<base href="/">\n<meta name="robots" content="noindex">')); } // served at any depth
}
// Old Zoho URLs (/aalayam, /ధర్మరక్ష …) -> new pages. Netlify / Cloudflare Pages "_redirects" format.
const SITE = 'https://www.sribhuvaneswaripeetham.org/';
fs.writeFileSync(path.join(OUT, '_redirects'), Object.entries(SLUG).filter(([s]) => s !== 'index.html').map(([s, o]) => {
  const old = '/' + s.replace(/\.html$/, '');
  const u = encodeURI(old), to = '/' + o.replace(/\.html$/, ''); // browsers send Telugu paths percent-encoded
  return u === to ? '' : `${u}  ${to}  301`;
}).filter(Boolean).join('\n') + '\n');
const pages = fs.readdirSync(OUT).filter(f => f.endsWith('.html') && f !== '404.html');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${SITE}${p === 'index.html' ? '' : p.replace(/\.html$/, '')}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
for (const f of ['style.css', 'site.js', 'updates.js']) fs.copyFileSync(path.join(PARTS, f), path.join(OUT, f));
img('files/logo/unnamed -2-.png'); img('QR Code.png'); img('files/home/1-1.png');
fs.copyFileSync(path.join(SRC, 'favicon.png'), path.join(OUT, 'favicon.png'));

(async () => {
  for (const [p, job] of imgJobs) {
    const dst = path.join(OUT, job.out);
    if (!fs.existsSync(dst)) await sharp(path.join(SRC, p)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dst);
    if (job.thumb) { const t = path.join(OUT, job.out.replace('img/', 'img/t/')); if (!fs.existsSync(t)) await sharp(path.join(SRC, p)).resize({ width: 480, height: 360, fit: 'cover' }).webp({ quality: 72 }).toFile(t); }
  }
  console.log('pages:', fs.readdirSync(OUT).filter(f => f.endsWith('.html')).length, 'images:', imgJobs.size);
})();
