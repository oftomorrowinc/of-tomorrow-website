// The pictures' contact sheet (specs/news_001.md §4, card 3's record): every
// picture in src/content/today/images/, newest story first, four across at
// 240 px with its story's date and slug under it, on the magazine's paper.
// `npm run today:contact` → specs/assets/news-001/03-pictures.png;
// `npm run today:contact -- --out=<png>` writes it elsewhere (card 4: 04-pictures.png, the backfill).
import { readdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { tokens } from './picture.mjs';

const DIR = 'src/content/today';
const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'specs/assets/news-001/03-pictures.png';
const TILE = 240, GAP = 24, CAP = 40, COLS = 4;
const t = tokens();

const stories = readdirSync(DIR)
	.filter((f) => f.endsWith('.md'))
	.map((f) => ({ f, image: readFileSync(`${DIR}/${f}`, 'utf8').match(/^image: \.\/(images\/.+)$/m)?.[1] }))
	.filter((s) => s.image)
	.sort((a, b) => b.f.slice(0, 10).localeCompare(a.f.slice(0, 10)) || a.f.localeCompare(b.f));

const rows = Math.ceil(stories.length / COLS);
const width = COLS * TILE + (COLS + 1) * GAP;
const height = rows * (TILE + CAP) + (rows + 1) * GAP;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const layers = [];
for (const [i, s] of stories.entries()) {
	const left = GAP + (i % COLS) * (TILE + GAP);
	const top = GAP + Math.floor(i / COLS) * (TILE + CAP + GAP);
	layers.push({ input: await sharp(`${DIR}/${s.image}`).resize(TILE, TILE).png().toBuffer(), left, top });
	const slug = s.f.slice(11, -3);
	const label = slug.length > 34 ? `${slug.slice(0, 33)}…` : slug;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${CAP}"><text x="0" y="16" font-family="Helvetica" font-size="12" font-weight="bold" fill="${t.ink}">${s.f.slice(0, 10)}</text><text x="0" y="32" font-family="Helvetica" font-size="11" fill="${t['body-muted']}">${esc(label)}</text></svg>`;
	layers.push({ input: Buffer.from(svg), left, top: top + TILE + 4 });
}
await sharp({ create: { width, height, channels: 3, background: t.paper } }).composite(layers).png().toFile(OUT);
console.log(`${OUT} ${stories.length} pictures`);
