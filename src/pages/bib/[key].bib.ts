// Serves /bib/<key>.bib for each entry in src/data/publications.bib (site-only fields removed).
import type { APIRoute, GetStaticPaths } from 'astro';
import { publications } from '../../lib/data';

export const getStaticPaths = (() =>
  publications.map((p) => ({ params: { key: p.key }, props: { bibtex: p.bibtex } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.bibtex as string, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
