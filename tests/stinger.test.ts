import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

// The stinger's files (specs/broadcast_001.md §2.6, §5 card 3), read as bytes:
// broadcast/obs/stinger.webm is VP9 with an alpha channel — flagged on the track
// AND carried in the blocks — 42 frames at 60 fps, 700 ms; broadcast/obs/stinger.ogg
// is the ~700 ms paper-turn. No ffmpeg needed: a small EBML walk and the Ogg pages.
// (That `npm run broadcast:stinger` makes the same bytes every time is checked by
// `node broadcast/stinger.mjs --check`, which renders twice and compares.)

type El = { id: number; start: number; end: number; data: number };

/** EBML: a variable-length integer at p (keepMarker for IDs). */
function vint(b: Buffer, p: number, keepMarker: boolean): [number, number] {
	const first = b[p];
	let len = 1;
	while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
	let v = keepMarker ? first : first & (0xff >> len);
	for (let i = 1; i < len; i++) v = v * 256 + b[p + i];
	// an all-ones size is "unknown" — the rest of the parent
	if (!keepMarker && v === 2 ** (7 * len) - 1) v = -1;
	return [v, len];
}

function children(b: Buffer, start: number, end: number): El[] {
	const out: El[] = [];
	let p = start;
	while (p < end) {
		const [id, il] = vint(b, p, true);
		const [size, sl] = vint(b, p + il, false);
		const data = p + il + sl;
		const e = size < 0 ? end : data + size;
		out.push({ id, start: p, end: e, data });
		p = e;
	}
	return out;
}

const uint = (b: Buffer, e: El) => {
	let v = 0;
	for (let i = e.data; i < e.end; i++) v = v * 256 + b[i];
	return v;
};
const float = (b: Buffer, e: El) => (e.end - e.data === 4 ? b.readFloatBE(e.data) : b.readDoubleBE(e.data));
const find = (els: El[], id: number) => els.filter((e) => e.id === id);

const ID = {
	Segment: 0x18538067, Info: 0x1549a966, TimecodeScale: 0x2ad7b1, Duration: 0x4489,
	Tracks: 0x1654ae6b, TrackEntry: 0xae, TrackType: 0x83, CodecID: 0x86, Video: 0xe0, AlphaMode: 0x53c0,
	Cluster: 0x1f43b675, SimpleBlock: 0xa3, BlockGroup: 0xa0, Block: 0xa1, BlockAdditions: 0x75a1,
};

describe('broadcast/obs/stinger.webm', () => {
	const b = readFileSync('broadcast/obs/stinger.webm');
	const [segment] = find(children(b, 0, b.length), ID.Segment);
	const top = children(b, segment.data, segment.end);
	const tracks = find(children(b, find(top, ID.Tracks)[0].data, find(top, ID.Tracks)[0].end), ID.TrackEntry).map((t) => children(b, t.data, t.end));
	const video = tracks.find((t) => uint(b, find(t, ID.TrackType)[0]) === 1)!;

	test('is VP9 with the alpha channel flagged on the video track', () => {
		expect(b.subarray(find(video, ID.CodecID)[0].data, find(video, ID.CodecID)[0].end).toString()).toBe('V_VP9');
		const v = find(video, ID.Video)[0];
		const alpha = find(children(b, v.data, v.end), ID.AlphaMode);
		expect(alpha.length).toBe(1);
		expect(uint(b, alpha[0])).toBe(1);
	});

	test('carries alpha in every video frame (BlockAdditions), 42 frames at 60 fps', () => {
		const videoTrack = 1;
		let frames = 0;
		let withAlpha = 0;
		for (const cluster of find(top, ID.Cluster)) {
			for (const e of children(b, cluster.data, cluster.end)) {
				if (e.id === ID.BlockGroup) {
					const g = children(b, e.data, e.end);
					const block = find(g, ID.Block)[0];
					if (vint(b, block.data, false)[0] !== videoTrack) continue;
					frames++;
					if (find(g, ID.BlockAdditions).length) withAlpha++;
				} else if (e.id === ID.SimpleBlock && vint(b, e.data, false)[0] === videoTrack) frames++;
			}
		}
		expect(frames).toBe(42);
		expect(withAlpha).toBe(42);
	});

	test('is 700 ms long (the Opus track rounds up to its 20 ms packets)', () => {
		const info = children(b, find(top, ID.Info)[0].data, find(top, ID.Info)[0].end);
		const scale = uint(b, find(info, ID.TimecodeScale)[0]);
		const ms = (float(b, find(info, ID.Duration)[0]) * scale) / 1e6;
		expect(ms).toBeGreaterThanOrEqual(700);
		expect(ms).toBeLessThan(720);
	});
});

describe('broadcast/obs/stinger.ogg', () => {
	test('is Ogg Opus, about 700 ms', () => {
		const b = readFileSync('broadcast/obs/stinger.ogg');
		expect(b.subarray(0, 4).toString()).toBe('OggS');
		expect(b.indexOf('OpusHead')).toBeGreaterThan(0);
		// the last page's granule position (48 kHz samples), less the pre-skip
		const last = b.lastIndexOf('OggS');
		const granule = Number(b.readBigUInt64LE(last + 6));
		const preSkip = b.readUInt16LE(b.indexOf('OpusHead') + 10);
		const ms = ((granule - preSkip) / 48000) * 1000;
		expect(ms).toBeGreaterThanOrEqual(690);
		expect(ms).toBeLessThanOrEqual(720);
	});
});
