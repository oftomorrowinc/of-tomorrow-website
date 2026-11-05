import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { fence, PROJECTS } from './lib/today';

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
// src/content/today/<yyyy-mm-dd>-<slug>.md, everything in the frontmatter.
// The fences (§5) run here too, so a story that breaks one fails the build.
const today = defineCollection({
	loader: glob({ base: './src/content/today', pattern: '*.md' }),
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
				refs: z.array(z.number().int().positive()).optional(),
				// A public link: a release note, a blog post, a page.
				link: z.string().url().optional(),
				// The one-line subject the picture is drawn from (§4, card 3).
				picture: z.string().max(160).optional(),
			})
			.superRefine((story, ctx) => {
				for (const message of fence(story)) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
			}),
});

export const collections = { blog, today };
