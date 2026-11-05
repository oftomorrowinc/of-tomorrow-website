import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { collection, serialise } from '../broadcast/obs/collection.mjs';

// The OBS scene collection (specs/broadcast_001.md §5 card 3), read as OBS reads
// it. That OBS 33 imports it and switches through all six scenes by its hotkeys is
// `npm run broadcast:obs-walk` (a real OBS, recorded); this keeps the file honest
// between walks: in step with its generator, every reference resolving, the
// transforms on the pages' own geometry.

const FILE = 'broadcast/obs/of-tomorrow-weekly.json';
const json = JSON.parse(readFileSync(FILE, 'utf8'));
type Source = { name: string; uuid: string; id: string; settings: any; hotkeys?: any; private_settings?: any; filters?: Source[] };
const sources: Source[] = json.sources;
const byName = (n: string) => sources.find((s) => s.name === n)!;
const scene = (n: string) => byName(n).settings.items as any[];
// The checkout the committed file was made for, from its frame's URL.
const frameUrl: string = byName('Frame').settings.url;
const root = fileURLToPath(frameUrl).replace(/\/broadcast\/camera\.html$/, '');

describe('broadcast/obs/of-tomorrow-weekly.json', () => {
	test('is what broadcast/obs/collection.mjs makes (regenerate: npm run broadcast:obs -- --root ~/Github/of-tomorrow-website)', () => {
		expect(readFileSync(FILE, 'utf8')).toBe(serialise(collection({ root })));
	});

	test('six scenes, in order, Camera first and current', () => {
		const names = ['Camera', 'Camera zoom', 'Split', 'Full', 'Full + tile', 'Framed'];
		expect(json.scene_order.map((s: any) => s.name)).toEqual(names);
		expect(sources.filter((s) => s.id === 'scene').map((s) => s.name)).toEqual(names);
		expect(json.current_scene).toBe('Camera');
		expect(json.current_program_scene).toBe('Camera');
	});

	test('every source name and uuid is unique (OBS looks sources up by name: a scene and a source both called "Camera" collide)', () => {
		const all = [...sources, json.AuxAudioDevice1, ...sources.flatMap((s) => s.filters ?? [])];
		expect(new Set(all.map((s) => s.name)).size).toBe(all.length);
		expect(new Set(all.map((s) => s.uuid)).size).toBe(all.length);
	});

	test('every scene item points at a source by name and uuid; the frame and the lower-third top every scene', () => {
		for (const s of sources.filter((s) => s.id === 'scene')) {
			const items = scene(s.name);
			for (const it of items) expect(byName(it.name)?.uuid, `${s.name} → ${it.name}`).toBe(it.source_uuid);
			// items run bottom → top
			expect(items.slice(-2).map((i) => i.name), s.name).toEqual(['Frame', 'Lower third']);
			expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
			expect(s.settings.id_counter).toBe(items.length);
		}
	});

	test('the browser sources: 1920×1080, the pages in this repo, custom CSS empty, never shut down or refreshed', () => {
		const browsers = sources.filter((s) => s.id === 'browser_source');
		expect(browsers.map((b) => b.name).sort()).toEqual(['Frame', 'Framed page', 'Full page', 'Full page + tile', 'Lower third', 'Split page']);
		for (const b of browsers) {
			const u = new URL(b.settings.url);
			expect(u.protocol).toBe('file:');
			const page = relative(root, fileURLToPath(u));
			expect(existsSync(page), page).toBe(true);
			expect(b.settings).toMatchObject({ is_local_file: false, width: 1920, height: 1080, css: '', shutdown: false, restart_when_active: false });
		}
		expect(new URL(byName('Full page + tile').settings.url).searchParams.get('tile')).toBe('1');
		expect(new URL(byName('Full page').settings.url).searchParams.get('tile')).toBeNull();
		// the lower-third loads out, and comes in on the dock's In
		expect(new URL(byName('Lower third').settings.url).searchParams.get('out')).toBe('1');
	});

	test('the camera: one source, no device (picked once per machine), asked for 1920×1080; its transforms', () => {
		const cam = byName('Webcam');
		expect(cam.id).toBe('macos-avcapture');
		expect(cam.settings.device ?? '').toBe('');
		expect(cam.settings.preset).toBe('AVCaptureSessionPreset1920x1080');
		const t = (sceneName: string) => scene(sceneName).find((i) => i.name === 'Webcam');
		// full frame
		expect(t('Camera')).toMatchObject({ pos: { x: 0, y: 0 }, bounds: { x: 1920, y: 1080 }, bounds_type: 3 });
		// zoom 130 % about the face at (1280, 430): the face stays put
		const z = t('Camera zoom');
		expect(z.bounds).toEqual({ x: 1920 * 1.3, y: 1080 * 1.3 });
		expect(z.pos.x + 1280 * 1.3).toBeCloseTo(1280, 0);
		expect(z.pos.y + 430 * 1.3).toBeCloseTo(430, 0);
		// split: the zoom with the face in the middle of the right 55 %, covering it
		const sp = t('Split');
		expect(sp.pos.x + 1280 * 1.3).toBeCloseTo(864 + 1056 / 2, 0);
		expect(sp.pos.x + sp.bounds.x).toBeGreaterThanOrEqual(1920);
		expect(sp.pos.y).toBeLessThanOrEqual(0);
		expect(sp.pos.y + sp.bounds.y).toBeGreaterThanOrEqual(1080);
		// the tile: params.js's TILE (1920−72−300, 1080−72−420), 300×420, a 5:7 crop of the frame
		const tile = t('Full + tile');
		expect([tile.pos.x, tile.pos.y, tile.bounds.x, tile.bounds.y]).toEqual([1548, 588, 300, 420]);
		const cw = 1920 - tile.crop_left - tile.crop_right;
		const ch = 1080 - tile.crop_top - tile.crop_bottom;
		expect(cw / ch).toBeCloseTo(300 / 420, 5);
		expect(tile.crop_left + cw / 2).toBeCloseTo(1280, 0); // the face, centred
		expect(tile.bounds_crop).toBe(true);
		// and the pages agree on where the tile is
		expect(readFileSync('broadcast/params.js', 'utf8')).toMatch(/TILE = \{ x: 1920 - 72 - 300, y: 1080 - 72 - 420, w: 300, h: 420/);
		// no camera where the page has no hole for it
		expect(scene('Full').some((i) => i.name === 'Webcam')).toBe(false);
	});

	test('framed: the media source fills framed.html\'s window and carries the B&W colour correction', () => {
		const m = scene('Framed').find((i) => i.name === 'Archive clip');
		expect([m.pos.x, m.pos.y, m.bounds.x, m.bounds.y]).toEqual([240, 116, 1440, 810]);
		expect(readFileSync('broadcast/framed.html', 'utf8')).toMatch(/x: p\.tile \? 96 : 240, y: 116, w: 1440, h: 810/);
		const [f] = byName('Archive clip').filters!;
		expect(f.id).toBe('color_filter_v2');
		expect(f.settings.saturation).toBe(-1);
		expect(f.settings.contrast).toBeGreaterThan(0);
	});

	test('the stinger is the default transition: the rendered webm, cut at 350 ms; split→full fades 300 ms, the zoom cuts', () => {
		expect(json.current_transition).toBe('Of Tomorrow stinger');
		const [st] = json.transitions;
		expect(st.id).toBe('obs_stinger_transition');
		expect(st.settings.path).toBe(join(root, 'broadcast/obs/stinger.webm'));
		expect(st.settings).toMatchObject({ transition_point_type: 0, transition_point: 350 });
		expect(byName('Full').private_settings).toEqual({ transition: 'Fade', transition_duration: 300 });
		expect(byName('Full + tile').private_settings).toEqual({ transition: 'Fade', transition_duration: 300 });
		expect(byName('Camera zoom').private_settings).toEqual({ transition: 'Cut', transition_duration: 300 });
	});

	test('hotkeys: ⌃⌥1…⌃⌥6 select the six scenes', () => {
		json.scene_order.forEach(({ name }: { name: string }, i: number) => {
			expect(byName(name).hotkeys['OBSBasic.SelectScene'], name).toEqual([{ control: true, alt: true, key: `OBS_KEY_${i + 1}` }]);
		});
	});

	test('the hosted variant: the pages at broadcast.oftomorrow.net (card 4), the stinger still a file, a name of its own', () => {
		const hosted = readFileSync('broadcast/obs/of-tomorrow-weekly-hosted.json', 'utf8');
		expect(hosted).toBe(serialise(collection({ root, base: 'https://broadcast.oftomorrow.net/' })));
		const c = JSON.parse(hosted);
		expect(c.name).toBe('Of Tomorrow Weekly (hosted)');
		const url = (n: string) => c.sources.find((s: Source) => s.name === n)!.settings.url;
		expect(url('Full page + tile')).toBe('https://broadcast.oftomorrow.net/full.html?mode=list&tile=1');
		expect(url('Frame')).toBe('https://broadcast.oftomorrow.net/camera.html');
		expect(c.transitions[0].settings.path).toBe(join(root, 'broadcast/obs/stinger.webm'));
	});
});
