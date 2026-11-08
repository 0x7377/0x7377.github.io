// Minimal BibTeX parser for a hand-maintained publications.bib.
// Supports @type{key, field = {...} | "..." | bare}, nested braces, and % comments.

export interface BibEntry {
  type: string;
  key: string;
  /** Raw field values (braces/quotes stripped once), keys lowercased. */
  raw: Record<string, string>;
}

export function parseBibtex(src: string): BibEntry[] {
  const text = src.replace(/^[ \t]*%.*$/gm, '');
  const entries: BibEntry[] = [];
  let i = 0;

  const skipWs = () => { while (i < text.length && /\s/.test(text[i])) i++; };

  const readBraced = (): string => {
    // text[i] === '{'
    let depth = 0;
    const start = i + 1;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) { i++; return text.slice(start, i - 1); }
      }
    }
    throw new Error('Unbalanced braces in publications.bib');
  };

  const readQuoted = (): string => {
    // text[i] === '"'
    let depth = 0;
    const start = ++i;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      else if (text[i] === '"' && depth === 0) { i++; return text.slice(start, i - 1); }
    }
    throw new Error('Unterminated quoted value in publications.bib');
  };

  while ((i = text.indexOf('@', i)) !== -1) {
    i++;
    const typeMatch = /^[A-Za-z]+/.exec(text.slice(i));
    if (!typeMatch) continue;
    const type = typeMatch[0].toLowerCase();
    i += type.length;
    skipWs();
    if (text[i] !== '{' && text[i] !== '(') continue;
    if (type === 'comment' || type === 'string' || type === 'preamble') {
      readBraced();
      continue;
    }
    i++;
    const keyEnd = text.indexOf(',', i);
    const key = text.slice(i, keyEnd).trim();
    i = keyEnd + 1;

    const raw: Record<string, string> = {};
    for (;;) {
      skipWs();
      if (text[i] === '}' || text[i] === ')') { i++; break; }
      const nameMatch = /^[A-Za-z][\w-]*/.exec(text.slice(i));
      if (!nameMatch) throw new Error(`Bad field in entry "${key}"`);
      const name = nameMatch[0].toLowerCase();
      i += name.length;
      skipWs();
      if (text[i] !== '=') throw new Error(`Expected "=" after "${name}" in "${key}"`);
      i++;
      skipWs();
      let value: string;
      if (text[i] === '{') value = readBraced();
      else if (text[i] === '"') value = readQuoted();
      else {
        const bare = /^[^,}\s]+/.exec(text.slice(i))![0];
        i += bare.length;
        value = bare;
      }
      raw[name] = value.replace(/\s+/g, ' ').trim();
      skipWs();
      if (text[i] === ',') i++;
    }
    entries.push({ type, key, raw });
  }
  return entries;
}

/** Turn a BibTeX value into display text. */
export function clean(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/\\&/g, '&')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/[{}]/g, '')
    .trim();
}

export interface Author { first: string; last: string; raw: string }

export function splitAuthors(value: string): Author[] {
  return value.split(/\s+and\s+/).map((name) => {
    const raw = name.trim();
    if (raw.includes(',')) {
      const [last, first] = raw.split(',').map((s) => clean(s));
      return { first, last, raw };
    }
    const parts = clean(raw).split(' ');
    return { first: parts.slice(0, -1).join(' '), last: parts.at(-1) ?? '', raw };
  });
}

/** "Chul-Ho" -> "C.-H.", "Seonwoo" -> "S.", "Y." -> "Y." */
export function initials(first: string): string {
  return first
    .split(' ')
    .filter(Boolean)
    .map((word) => word.split('-').map((p) => (p.endsWith('.') ? p : `${p[0]}.`)).join('-'))
    .join(' ');
}

/** BibTeX text for download, without site-only fields. */
export function toBibtex(entry: BibEntry, siteFields: readonly string[]): string {
  const fields = Object.entries(entry.raw).filter(([k]) => !siteFields.includes(k));
  const width = Math.max(...fields.map(([k]) => k.length));
  const body = fields.map(([k, v]) => `  ${k.padEnd(width)} = {${v}}`).join(',\n');
  return `@${entry.type}{${entry.key},\n${body}\n}\n`;
}
