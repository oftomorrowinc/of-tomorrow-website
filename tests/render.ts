// Render a page or component to HTML with Astro's Container API, and parse it
// so a test can ask the markup questions the way a browser test would.
import { experimental_AstroContainer as AstroContainer, type ContainerRenderOptions } from 'astro/container';
import { getContainerRenderer as reactRenderer } from '@astrojs/react';
import { loadRenderers } from 'astro:container';
import { JSDOM } from 'jsdom';

type Component = Parameters<AstroContainer['renderToString']>[0];

let container: Promise<AstroContainer> | undefined;

function get(): Promise<AstroContainer> {
	container ??= (async () =>
		AstroContainer.create({
			renderers: await loadRenderers([reactRenderer()]),
		}))();
	return container;
}

export async function html(component: Component, opts: ContainerRenderOptions = {}): Promise<string> {
	return (await get()).renderToString(component, opts);
}

/** The rendered page as a document. Scripts are not run. */
export async function render(component: Component, opts: ContainerRenderOptions = {}): Promise<Document> {
	return new JSDOM(await html(component, opts)).window.document;
}

/** Collapsed text, as a reader sees it. */
export const text = (el: Element | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
export const all = (root: ParentNode, sel: string): Element[] => [...root.querySelectorAll(sel)];
