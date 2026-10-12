/* Send-ready checker: pure functions on an HTML string. German messages. No network, no storage. Uses the browser DOMParser (or a passed-in parser in tests). */
(function (root) {
  var VAGUE = /^(hier|hier klicken|klicke hier|mehr|mehr lesen|weiter|link|click here|read more|more)$/i;
  var PLACEHOLDER = /lorem ipsum|dolor sit amet|text hier|platzhalter|your text here|coming soon|xxx/i;
  var CTA = /(kontakt|anfrage|anfragen|termin|buchen|bestellen|kaufen|jetzt|starten|angebot|anrufen|schreib|contact|book|buy|start|get)/i;

  function text(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

  function check(html, parse) {
    var doc = (parse || function (h) { return new DOMParser().parseFromString(h, 'text/html'); })(html);
    var items = [], penalty = 0;
    function add(level, title, fix, p) { items.push({ level: level, title: title, fix: fix }); penalty += p || 0; }

    var title = doc.querySelector('title');
    var t = title ? text(title) : '';
    if (!t) add('high', 'Seitentitel fehlt', 'Gib der Seite einen Titel mit 30 bis 60 Zeichen. Er erscheint im Browser-Tab und bei Google.', 12);
    else if (t.length < 15 || t.length > 65) add('mid', 'Seitentitel hat ' + t.length + ' Zeichen', 'Besser sind etwa 30 bis 60 Zeichen und ein klarer Inhalt.', 5);

    var md = doc.querySelector('meta[name="description"]');
    if (!md || !(md.getAttribute('content') || '').trim()) add('mid', 'Meta-Beschreibung fehlt', 'Schreibe 1 bis 2 Sätze, was die Seite bietet. Google zeigt sie unter dem Titel.', 6);

    var h1 = doc.querySelectorAll('h1');
    if (h1.length === 0) add('high', 'Keine Hauptüberschrift (H1)', 'Jede Seite braucht genau eine H1, die sagt, worum es geht.', 12);
    else if (h1.length > 1) add('mid', h1.length + ' Hauptüberschriften (H1)', 'Nutze nur eine H1. Die anderen werden H2.', 6);

    var imgs = [].slice.call(doc.querySelectorAll('img'));
    var noAlt = imgs.filter(function (i) { return !(i.getAttribute('alt') || '').trim(); });
    if (noAlt.length) add('high', noAlt.length + ' von ' + imgs.length + ' Bildern ohne Alt-Text', 'Beschreibe jedes Bild in einem Satz. Das hilft Screenreadern und der Suche. Reine Deko-Bilder: alt="" ist dann okay.', Math.min(15, 4 + noAlt.length * 2));

    var links = [].slice.call(doc.querySelectorAll('a'));
    var vague = links.filter(function (a) { return VAGUE.test(text(a)); });
    if (vague.length) add('mid', vague.length + ' Link(s) mit unklarem Text', 'Ersetze "hier klicken" oder "mehr" durch den Zweck, zum Beispiel "Preise ansehen".', Math.min(10, 3 + vague.length * 2));
    var emptyLinks = links.filter(function (a) { return !text(a) && !a.querySelector('img[alt]:not([alt=""])') && !(a.getAttribute('aria-label') || '').trim(); });
    if (emptyLinks.length) add('mid', emptyLinks.length + ' Link(s) ohne sichtbaren Text', 'Jeder Link braucht einen Text oder ein aria-label.', 5);

    var hasCta = [].slice.call(doc.querySelectorAll('a,button')).some(function (e) { return CTA.test(text(e)); });
    if (!hasCta) add('mid', 'Kein klarer nächster Schritt', 'Füge einen Button oder Link hinzu, der sagt, was der Besucher tun soll (zum Beispiel "Termin anfragen").', 8);

    var contact = links.some(function (a) { var h = a.getAttribute('href') || ''; return /^mailto:|^tel:/i.test(h) || /kontakt|contact/i.test(h + ' ' + text(a)); });
    if (!contact) add('mid', 'Keine Kontaktmöglichkeit gefunden', 'Verlinke eine E-Mail, eine Telefonnummer oder eine Kontaktseite.', 6);

    var imp = links.some(function (a) { return /impressum|imprint/i.test((a.getAttribute('href') || '') + ' ' + text(a)); });
    var dsg = links.some(function (a) { return /datenschutz|privacy/i.test((a.getAttribute('href') || '') + ' ' + text(a)); });
    if (!imp) add('high', 'Impressum-Link fehlt', 'Für geschäftliche Seiten in Deutschland ist ein Impressum meist Pflicht. Lass es prüfen, ich gebe keine Rechtsberatung.', 10);
    if (!dsg) add('high', 'Datenschutz-Link fehlt', 'Eine Datenschutzerklärung ist meist Pflicht. Lass sie prüfen, ich gebe keine Rechtsberatung.', 8);

    var body = text(doc.body || doc.documentElement);
    if (PLACEHOLDER.test(body)) add('high', 'Platzhaltertext gefunden', 'Suche nach "Lorem ipsum", "Text hier" oder "Coming soon" und ersetze es durch echten Text.', 12);

    var lang = (doc.documentElement.getAttribute('lang') || '').trim();
    if (!lang) add('mid', 'Sprache der Seite nicht gesetzt', 'Setze lang="de" im html-Tag.', 3);
    if (!doc.querySelector('meta[name="viewport"]')) add('mid', 'Viewport-Angabe fehlt', 'Ohne sie sieht die Seite auf dem Handy winzig aus.', 6);

    if (!items.length) items.push({ level: 'ok', title: 'Keine Probleme gefunden', fix: 'Diese Prüfung ist nur ein Anfang. Schau die Seite trotzdem einmal auf dem Handy an.' });
    var order = { high: 0, mid: 1, ok: 2 };
    items.sort(function (a, b) { return order[a.level] - order[b.level]; });
    return { score: Math.max(0, 100 - penalty), items: items };
  }

  var api = { check: check };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SendReady = api;
})(typeof self !== 'undefined' ? self : this);
