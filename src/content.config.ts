import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader } from 'astro/loaders';
import { fence, liftBody, PROJECTS } from './lib/today';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
		}),
});

// Today at Of Tomorrow (specs/news_001.md §2): one story per file,
// src/content/today/<yyyy-mm-dd>-<slug>.md. The body is the `body:` field or
// the file's prose (the daily task, signals' daily-stories.ts, writes it as
// prose), never both: the loader lifts the prose into `body` so the schema
// and its fences see it either way. The fences (§5) run here, so a story that
// breaks one fails the build.
function stories(): Loader {
	const inner = glob({ base: './src/content/today', pattern: '*.md' });
	return {
		name: 'today',
		load: (ctx) =>
			inner.load({
				...ctx,
				parseData: (props) => {
					const raw = props.filePath ? readFileSync(resolve(fileURLToPath(ctx.config.root), props.filePath), 'utf8') : '';
					return ctx.parseData({ ...props, data: liftBody(props.data, raw) });
				},
			}),
	};
}

const today = defineCollection({
	loader: stories(),
	schema: ({ image }) =>
		z
			.object({
				// The day the thing happened, not the day it was written.
				date: z.coerce.date(),
				title: z.string().min(1).max(60),
				body: z.string().min(1).max(320),
				project: z.enum(PROJECTS),
				// The voice, signed on the story: todd, cw, owl, kevin, lis, a builder's name.
				author: z.string().regex(/^[a-z][a-z0-9-]*$/),
				// ./images/<slug>.webp; the monogram tile when absent (§4).
				image: image().optional(),
				// Card or decision numbers, for us: shown as plain "#7294", never a link.
				// (The daily task writes them as strings, "7292"; either reads as the number.)
				refs: z.array(z.coerce.number().int().positive()).optional(),
				// A public link: a release note, a blog post, a page.
				link: z.string().url().optional(),
				// The one-line subject the picture is drawn from (§4, card 3).
				picture: z.string().max(160).optional(),
				// Set by the loader only when a file has both a body: field and prose; the fence refuses it.
				bodyProse: z.string().optional(),
			})
			.superRefine((story, ctx) => {
				for (const message of fence(story)) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
			}),
});

export const collections = { blog, today };
