// Loads and validates everything in src/data at build time.
// A typo or missing required field fails the build with a clear message.

import { parse as parseYaml } from 'yaml';
import { z } from 'astro/zod';
import { parseBibtex, clean, splitAuthors, initials, toBibtex } from './bibtex';
import profileSrc from '../data/profile.yaml?raw';
import newsSrc from '../data/news.yaml?raw';
import projectsSrc from '../data/projects.yaml?raw';
import cvSrc from '../data/cv.yaml?raw';
import bibSrc from '../data/publications.bib?raw';

/** Prefix a site-internal path with the configured base (works for user and project Pages sites). */
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function load<T extends z.ZodType>(file: string, src: string, schema: T): z.infer<T> {
  const parsed = parseYaml(src);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`src/data/${file} is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

const link = z.object({ label: z.string(), url: z.string() });

export const profile = load('profile.yaml', profileSrc, z.object({
  name: z.string(),
  description: z.string(),
  self_names: z.array(z.string()),
  intro: z.array(z.string()).min(1),
  links: z.array(link),
  photo: z.string().default(''),
  writing_url: z.string().url(),
}));

export const news = load('news.yaml', newsSrc, z.array(z.object({
  date: z.string(),
  text: z.string(),
})));

export const projects = load('projects.yaml', projectsSrc, z.array(z.object({
  title: z.string(),
  description: z.string(),
  meta: z.string().optional(),
  links: z.array(link).default([]),
})));

const details = z.array(z.string()).default([]);

export const cv = load('cv.yaml', cvSrc, z.object({
  education: z.array(z.object({
    degree: z.string(), school: z.string(), place: z.string().optional(), year: z.string(), details,
  })),
  experience: z.array(z.object({
    role: z.string(), org: z.string(), place: z.string().optional(), period: z.string(), details,
  })),
  teaching: z.array(z.object({
    role: z.string(), org: z.string(), place: z.string().optional(), period: z.string(), details,
  })),
  awards: z.array(z.object({
    title: z.string(), event: z.string().optional(), org: z.string().optional(), date: z.string(),
  })),
  certifications: z.array(z.object({
    name: z.string(), issuer: z.string(), date: z.string(),
  })),
}));

// ---------- publications ----------

const SITE_FIELDS = ['label', 'group', 'corresponding', 'award', 'pdf', 'code'] as const;

export interface Publication {
  key: string;
  label: string;
  group: 'international' | 'domestic';
  title: string;
  authors: { name: string; self: boolean; corresponding: boolean }[];
  venue: string;
  award: string;
  links: { label: string; url: string }[];
  bibtex: string;
}

function venueOf(type: string, f: Record<string, string>): string {
  // `note` (e.g. "in proceeding") stands in for the year of a paper that is not yet published.
  const when = clean(f.year) || clean(f.note);
  if (type === 'inproceedings' || type === 'conference') return `${clean(f.booktitle)} ${when}`;
  const where = clean(f.journal || f.howpublished || f.publisher);
  return [where, when].filter(Boolean).join(', ');
}

export const publications: Publication[] = parseBibtex(bibSrc).map(({ type, key, raw }) => {
  for (const required of ['title', 'author', 'label', 'group']) {
    if (!raw[required]) throw new Error(`publications.bib: "${key}" is missing "${required}"`);
  }
  if (!raw.year && !raw.note) throw new Error(`publications.bib: "${key}" needs "year" (or "note" if not yet published)`);
  const group = raw.group;
  if (group !== 'international' && group !== 'domestic') {
    throw new Error(`publications.bib: "${key}" has group "${group}" (use international | domestic)`);
  }
  const links: Publication['links'] = [];
  if (raw.url) links.push({ label: 'paper', url: raw.url });
  if (raw.eprint && /arxiv/i.test(raw.archiveprefix ?? '')) {
    links.push({ label: 'arXiv', url: `https://arxiv.org/abs/${raw.eprint}` });
  }
  if (raw.pdf) links.push({ label: 'pdf', url: raw.pdf });
  if (raw.code) links.push({ label: 'code', url: raw.code });
  links.push({ label: 'bibtex', url: withBase(`bib/${key}.bib`) });

  const corresponding = clean(raw.corresponding);
  return {
    key,
    label: clean(raw.label),
    group,
    title: clean(raw.title),
    authors: splitAuthors(raw.author).map((a) => {
      const full = `${a.last}, ${a.first}`;
      return {
        name: `${initials(a.first)} ${a.last}`.trim(),
        self: profile.self_names.includes(full),
        corresponding: corresponding === full,
      };
    }),
    venue: venueOf(type, raw),
    award: clean(raw.award),
    links,
    bibtex: toBibtex({ type, key, raw }, SITE_FIELDS),
  };
});
