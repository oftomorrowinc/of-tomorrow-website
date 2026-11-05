// The OBS scene collection (specs/broadcast_001.md §5 card 3): writes
// broadcast/obs/of-tomorrow-weekly.json — six scenes over one camera source,
// the browser sources, the camera's transforms, the stinger as the default
// transition, and the scene hotkeys — so a new machine is one import
// (Scene Collection → Import). `npm run broadcast:obs`.
//
//   --root <dir>   the checkout the file:// URLs point at (default: this repo)
//   --base <url>   point the pages at a site instead, e.g.
//                  https://broadcast.oftomorrow.net/ (card 4); the stinger stays a file
//   --out <file>   where to write (default broadcast/obs/of-tomorrow-weekly.json)
//
// Two are committed: of-tomorrow-weekly.json (file:// — works offline, today) and
// of-tomorrow-weekly-hosted.json (the pages at broadcast.oftomorrow.net, card 4;
// named "… (hosted)" so both can be imported). A hosted dock drives only hosted
// pages — localStorage is per origin — so a machine uses one or the other.
//
// OBS stores absolute URLs and paths, so the file is made for one checkout; the
// committed one is for ~/Github/of-tomorrow-website on Todd's machine. Same
// arguments, same bytes: UUIDs come from the names, nothing reads the clock.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const NAME = 'Of Tomorrow Weekly';
const W = 1920;
const H = 1080;

/** A stable UUID (v5-shaped) from a name. */
const uuid = (name) => {
	const h = createHash('sha1').update(`oftomorrow.broadcast/${name}`).digest('hex');
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// ---- the camera's transforms (README "The scenes") ---------------------------
// All by bounds, so they hold for any 16:9 camera; the tile's crop is in source
// pixels, so the camera is asked for 1920×1080 (its preset, below).
// OBS: align/bounds_align 5 = top-left, 0 = centre; bounds_type 3 = scale to
// cover ("outer"), 1 = stretch.
const ZOOM = 1.3;
// Todd's face in the full frame: in the right third, a little above centre.
const FACE = { x: 1280, y: 430 };
export const TRANSFORMS = {
	// 1 Camera — the full frame; Todd sits in the right third.
	full: { pos: { x: 0, y: 0 }, bounds: { x: W, y: H } },
	// 2 Camera zoom — 130 % about his face, so the face stays where it was.
	zoom: { pos: { x: Math.round(FACE.x * (1 - ZOOM)), y: Math.round(FACE.y * (1 - ZOOM)) }, bounds: { x: W * ZOOM, y: H * ZOOM } },
	// 3 Split — the same zoom with his face centred in the right 55 % (x 864–1920);
	// split.html's paper panel covers the left 45 %.
	split: { pos: { x: Math.round(864 + 1056 / 2 - FACE.x * ZOOM), y: Math.round(500 - FACE.y * ZOOM) }, bounds: { x: W * ZOOM, y: H * ZOOM } },
	// 5 Full + tile — the zoomed shot cropped to 5:7 about his face (540×756 of
	// the 1920×1080 frame), in the page's 300×420 hole at (1548, 588).
	tile: {
		pos: { x: 1548, y: 588 },
		bounds: { x: 300, y: 420 },
		crop: { left: 1010, top: 92, right: 1920 - 1010 - 540, bottom: 1080 - 92 - 756 },
	},
	// 6 Framed — the media in framed.html's 1440×810 window at (240, 116).
	window: { pos: { x: 240, y: 116 }, bounds: { x: 1440, y: 810 }, fit: 'inner' },
};

/** The dock's keys and OBS's: one table for the README and the file. ⌃⌥ keeps
 *  the scene keys off anything typed into the dock or a source's properties. */
export const SCENES = [
	{ name: 'Camera', key: '1', items: ['Webcam:full'] },
	{ name: 'Camera zoom', key: '2', items: ['Webcam:zoom'], override: { transition: 'Cut', duration: 300 } },
	{ name: 'Split', key: '3', items: ['Webcam:split', 'Split page'] },
	{ name: 'Full', key: '4', items: ['Full page'], override: { transition: 'Fade', duration: 300 } },
	{ name: 'Full + tile', key: '5', items: ['Webcam:tile', 'Full page + tile'], override: { transition: 'Fade', duration: 300 } },
	{ name: 'Framed', key: '6', items: ['Archive clip:window', 'Framed page'] },
];
// Above every scene's own items: the frame, and the lower-third over it.
const ON_TOP = ['Frame', 'Lower third'];

const BROWSER = {
	Frame: 'camera.html',
	'Split page': 'split.html',
	'Full page': 'full.html?mode=list',
	'Full page + tile': 'full.html?mode=list&tile=1',
	'Framed page': 'framed.html?caption=From%20the%20archive',
	// out=1: it loads hidden, and comes in on the dock's In (or I).
	'Lower third': 'lower.html?out=1',
};
export const STINGER = { name: 'Of Tomorrow stinger', point: 350 };

const hotkeysAudio = () => ({ 'libobs.mute': [], 'libobs.unmute': [], 'libobs.push-to-mute': [], 'libobs.push-to-talk': [] });

function source(name, id, settings, extra = {}) {
	return {
		name,
		uuid: uuid(name),
		id,
		versioned_id: id,
		settings,
		mixers: 255,
		sync: 0,
		flags: 0,
		volume: 1.0,
		balance: 0.5,
		enabled: true,
		muted: false,
		'push-to-mute': false,
		'push-to-mute-delay': 0,
		'push-to-talk': false,
		'push-to-talk-delay': 0,
		hotkeys: hotkeysAudio(),
		deinterlace_mode: 0,
		deinterlace_field_order: 0,
		monitoring_type: 0,
		private_settings: {},
		...extra,
	};
}

function item(name, id, t) {
	const tr = t ?? TRANSFORMS.full;
	const crop = tr.crop ?? { left: 0, top: 0, right: 0, bottom: 0 };
	return {
		name,
		source_uuid: uuid(name),
		visible: true,
		locked: false,
		rot: 0.0,
		scale_ref: { x: W, y: H },
		align: 5,
		bounds_type: tr.fit === 'inner' ? 2 : 3,
		bounds_align: 0,
		bounds_crop: true,
		crop_left: crop.left,
		crop_top: crop.top,
		crop_right: crop.right,
		crop_bottom: crop.bottom,
		id,
		group_item_backup: false,
		pos: { x: tr.pos.x, y: tr.pos.y },
		scale: { x: 1.0, y: 1.0 },
		bounds: { x: tr.bounds.x, y: tr.bounds.y },
		scale_filter: 'disable',
		blend_method: 'default',
		blend_type: 'normal',
		show_transition: { duration: 300 },
		hide_transition: { duration: 300 },
		private_settings: {},
	};
}

/** @param {{ root?: string, base?: string | null }} [options] */
export function collection({ root = repoRoot(), base = null } = {}) {
	const page = (p) => (base ? new URL(p, base).href : `${pathToFileURL(join(root, 'broadcast', p.split('?')[0])).href}${p.includes('?') ? '?' + p.split('?')[1] : ''}`);
	const sources = [];

	// The camera: one source in every scene that shows it, a transform per scene.
	// No device: OBS can't carry one machine's camera to another — pick it once.
	sources.push(source('Webcam', 'macos-avcapture', { use_preset: true, preset: 'AVCaptureSessionPreset1920x1080' }));

	for (const [name, p] of Object.entries(BROWSER)) {
		sources.push(
			source(name, 'browser_source', {
				url: page(p),
				is_local_file: false,
				width: W,
				height: H,
				css: '', // the pages set their own transparency (README)
				shutdown: false,
				restart_when_active: false,
				reroute_audio: false,
				webpage_control_level: 1,
			}),
		);
	}

	// The framed scene's media source, with OBS's own b&w (README "b&w"): a page
	// can't filter a source beneath it, so the clip carries the filter. Pick a file.
	sources.push(
		source(
			'Archive clip',
			'ffmpeg_source',
			{ is_local_file: true, local_file: '', looping: true, restart_on_activate: true, close_when_inactive: false, hw_decode: true },
			{
				filters: [
					{
						...source('Archive clip · B&W', 'color_filter_v2', { saturation: -1.0, contrast: 0.2 }),
						hotkeys: {},
					},
				],
			},
		),
	);

	SCENES.forEach((s) => {
		const names = [...s.items, ...ON_TOP];
		const items = names.map((n, i) => {
			const [name, t] = n.split(':');
			return item(name, i + 1, t ? TRANSFORMS[t] : undefined);
		});
		const hotkeys = { 'OBSBasic.SelectScene': [{ control: true, alt: true, key: `OBS_KEY_${s.key}` }] };
		items.forEach((it) => {
			hotkeys[`libobs.show_scene_item.${it.id}`] = [];
			hotkeys[`libobs.hide_scene_item.${it.id}`] = [];
		});
		const scene = source(s.name, 'scene', { id_counter: items.length, custom_size: false, items }, { hotkeys, mixers: 0 });
		if (s.override) scene.private_settings = { transition: s.override.transition, transition_duration: s.override.duration };
		sources.push(scene);
	});

	return {
		name: base ? `${NAME} (hosted)` : NAME,
		current_scene: SCENES[0].name,
		current_program_scene: SCENES[0].name,
		scene_order: SCENES.map((s) => ({ name: s.name })),
		sources,
		groups: [],
		// The mic. A collection made in OBS gets one from the first-run setup; an
		// imported one only has what it carries. "default" = the system input.
		AuxAudioDevice1: source('Mic/Aux', 'coreaudio_input_capture', { device_id: 'default' }),
		transitions: [
			{
				name: STINGER.name,
				id: 'obs_stinger_transition',
				versioned_id: 'obs_stinger_transition',
				settings: {
					path: join(root, 'broadcast', 'obs', 'stinger.webm'),
					transition_point_type: 0, // time (ms)
					transition_point: STINGER.point,
					audio_monitoring: 0,
					audio_fade_style: 0, // fade out the old audio, in the new, across the cut
					hw_decode: false,
					preload: true,
				},
			},
		],
		current_transition: STINGER.name,
		transition_duration: 300,
		quick_transitions: [
			{ name: 'Cut', duration: 300, hotkeys: [], id: 1, fade_to_black: false },
			{ name: 'Fade', duration: 300, hotkeys: [], id: 2, fade_to_black: false },
			{ name: STINGER.name, duration: 700, hotkeys: [], id: 3, fade_to_black: false },
		],
		saved_projectors: [],
		preview_locked: false,
		scaling_enabled: false,
		scaling_level: 0,
		scaling_off_x: 0.0,
		scaling_off_y: 0.0,
		modules: {},
		version: 2,
	};
}

function repoRoot() {
	return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
}

export const DEFAULT_OUT = join(repoRoot(), 'broadcast', 'obs', 'of-tomorrow-weekly.json');
export const serialise = (c) => JSON.stringify(c, null, 4) + '\n';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const arg = (k) => {
		const i = process.argv.indexOf(k);
		return i > 0 ? process.argv[i + 1] : undefined;
	};
	const root = resolve(arg('--root') ?? repoRoot());
	const out = arg('--out') ?? DEFAULT_OUT;
	writeFileSync(out, serialise(collection({ root, base: arg('--base') ?? null })));
	console.log(out, '←', arg('--base') ?? root);
}
