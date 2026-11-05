// The import walk (rule 26) of broadcast_001 card 3: a clean OBS takes the scene
// collection and is driven through all six scenes by the collection's own
// hotkeys, with the stinger (and the Fade/Cut overrides) between them; OBS's
// program output is recorded to specs/assets/broadcast-001/03-obs-walk.mp4, and
// a still of each scene goes into 03-obs-scenes.png, framed.html's own bw=1 seen
// in OBS into 03-obs-framed-page-bw.png, the timeline into 03-obs-walk.txt.
// `npm run broadcast:obs-walk`.
//
// "Clean" is a brand-new OBS config in a temp dir — never ~/Library/Application
// Support/obs-studio: OBS is started with CFFIXED_USER_HOME pointing there and
// --multi, so it runs beside an OBS already open and touches nothing of it.
// The collection file goes into that config's scenes folder, which is what
// Scene Collection → Import does with it; the walk then switches to it from the
// clean "Untitled" one over obs-websocket (on port 4466, not OBS's 4455).
//
// What the walk adds that the collection doesn't carry, all inside the temp
// config: the content, typed into the page URLs as a person would (the URL
// contract); a stand-in picture under the camera (the walk's OBS has no camera
// permission, and the camera has no device until one is picked), given each
// scene's camera transform so the framing shows; and a colour test clip in the
// framed scene's media source, so its B&W filter shows.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collection, serialise, SCENES, NAME } from './collection.mjs';
import { connect } from './ws.mjs';
import { COMMON, LIST } from '../shoot.mjs';

const OBS = process.env.OBS_BIN ?? '/Applications/OBS.app/Contents/MacOS/OBS';
const PORT = 4466;
const OUT = 'specs/assets/broadcast-001/03-obs-walk.mp4';
const SHEET = 'specs/assets/broadcast-001/03-obs-scenes.png';
const BW = 'specs/assets/broadcast-001/03-obs-framed-page-bw.png';
const TIMELINE = 'specs/assets/broadcast-001/03-obs-walk.txt';
const root = resolve('.');
const home = mkdtempSync(join(tmpdir(), 'bc-obs-'));
const cfg = join(home, 'Library', 'Application Support', 'obs-studio');
const rec = join(home, 'rec');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- a clean OBS config ------------------------------------------------------
mkdirSync(join(cfg, 'basic', 'scenes'), { recursive: true });
mkdirSync(join(cfg, 'basic', 'profiles'), { recursive: true });
mkdirSync(join(cfg, 'plugin_config', 'obs-websocket'), { recursive: true });
mkdirSync(rec);
// The profile we ship (canvas 1920×1080 at 60), plus where to record.
cpSync('broadcast/obs/OfTomorrowWeekly', join(cfg, 'basic', 'profiles', 'OfTomorrowWeekly'), { recursive: true });
writeFileSync(
	join(cfg, 'basic', 'profiles', 'OfTomorrowWeekly', 'basic.ini'),
	`${execFileSync('cat', ['broadcast/obs/OfTomorrowWeekly/basic.ini'])}\n[Output]\nMode=Simple\n\n[SimpleOutput]\nFilePath=${rec}\nRecFormat2=mp4\nRecQuality=Small\nRecEncoder=apple_h264\n`,
);
const support = join(home, 'Library', 'Application Support');
writeFileSync(
	join(cfg, 'global.ini'),
	`[Locations]\nConfiguration=${support}\nSceneCollections=${support}\nProfiles=${support}\n\n[General]\nMacOSPermissionsDialogLastShown=99\nFirstRun=true\nEnableAutoUpdates=false\n`,
);
writeFileSync(
	join(cfg, 'user.ini'),
	'[General]\nFirstRun=true\nEnableAutoUpdates=false\nMacOSPermissionsDialogLastShown=99\n\n[Basic]\nProfile=Of Tomorrow Weekly\nProfileDir=OfTomorrowWeekly\nSceneCollection=Untitled\nSceneCollectionFile=Untitled.json\nConfigOnNewProfile=false\n',
);
writeFileSync(
	join(cfg, 'plugin_config', 'obs-websocket', 'config.json'),
	JSON.stringify({ alerts_enabled: false, auth_required: false, first_load: false, server_enabled: true, server_password: '', server_port: PORT }),
);
// The import: the collection, made for this checkout, into the scenes folder.
writeFileSync(join(cfg, 'basic', 'scenes', 'Of_Tomorrow_Weekly.json'), serialise(collection({ root })));

// ---- the walk's stand-ins ----------------------------------------------------
const standIn = join(home, 'camera-stand-in.png');
{
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	await page.goto(pathToFileURL(resolve('broadcast/walk/stage.html')).href);
	await page.evaluate(() => document.fonts.ready);
	// the figure alone: no pages over it, the tag says what it is
	await page.evaluate(() => {
		document.querySelectorAll('iframe').forEach((f) => f.remove());
		document.querySelector('#scene-camera .tag').textContent = 'Camera stand-in';
	});
	await page.locator('#scene-camera .cam').screenshot({ path: standIn });
	await browser.close();
}
const clip = join(home, 'colour-clip.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1440x810:rate=30:duration=6', '-pix_fmt', 'yuv420p', clip]);

// ---- OBS ---------------------------------------------------------------------
const obs = spawn(OBS, ['--multi'], { env: { ...process.env, CFFIXED_USER_HOME: home }, stdio: 'ignore', cwd: '/Applications/OBS.app/Contents/MacOS' });
process.on('exit', () => obs.exitCode === null && obs.kill('SIGKILL'));
const o = await connect(`ws://127.0.0.1:${PORT}`, { timeout: 60000 });
// obs-websocket answers before OBS has loaded its scenes (207: not ready).
for (let i = 0; ; i++) {
	const ok = await o.call('GetSceneList').then(() => true, (e) => (i < 60 && /207/.test(e.message) ? false : Promise.reject(e)));
	if (ok) break;
	await sleep(500);
}
const version = (await o.call('GetVersion')).obsVersion;
console.log(`OBS ${version}, clean config in ${home}`);
const log = [];
const t0 = Date.now();
const mark = (what) => {
	const line = `${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s  ${what}`;
	log.push(line);
	console.log(line);
};

try {
	await o.call('StartRecord');
	mark('recording · the clean OBS: collection "Untitled", one empty scene');
	await sleep(1500);

	await o.call('SetCurrentSceneCollection', { sceneCollectionName: NAME });
	await sleep(1500);
	const scenes = (await o.call('GetSceneList')).scenes.map((s) => s.sceneName).reverse();
	mark(`collection "${NAME}": ${scenes.join(' · ')}`);
	if (scenes.join('|') !== SCENES.map((s) => s.name).join('|')) throw new Error(`scenes: ${scenes}`);
	const tr = await o.call('GetCurrentSceneTransition');
	mark(`default transition: ${tr.transitionName} (${tr.transitionKind}, cut at ${tr.transitionSettings.transition_point} ms)`);

	// The content, through the URL contract.
	for (const { inputName } of (await o.call('GetInputList', { inputKind: 'browser_source' })).inputs) {
		const { inputSettings } = await o.call('GetInputSettings', { inputName });
		let url = inputSettings.url + (inputSettings.url.includes('?') ? '&' : '?') + COMMON;
		if (/split|full/.test(url)) url += `&${LIST}`;
		if (/lower/.test(url)) url = url.replace('out=1', 'title=Todd%20Sampson&sub=Founder%2C%20Of%20Tomorrow&n=7');
		if (/framed/.test(url)) url = url.replace('From%20the%20archive', 'From%20the%20archive%20%C2%B7%20a%20colour%20test%20clip%2C%20through%20the%20B%26W%20filter');
		await o.call('SetInputSettings', { inputName, inputSettings: { url } });
	}
	await o.call('SetInputSettings', { inputName: 'Archive clip', inputSettings: { local_file: clip } });

	// The stand-in under the camera, with the camera's transform in each scene.
	let made = false;
	const SETTABLE = ['positionX', 'positionY', 'rotation', 'scaleX', 'scaleY', 'alignment', 'boundsType', 'boundsAlignment', 'boundsWidth', 'boundsHeight', 'cropLeft', 'cropRight', 'cropTop', 'cropBottom', 'cropToBounds'];
	for (const sceneName of scenes) {
		const items = (await o.call('GetSceneItemList', { sceneName })).sceneItems;
		const cam = items.find((i) => i.sourceName === 'Webcam');
		if (!cam) continue;
		const { sceneItemTransform: t } = await o.call('GetSceneItemTransform', { sceneName, sceneItemId: cam.sceneItemId });
		let id;
		if (!made) {
			id = (await o.call('CreateInput', { sceneName, inputName: 'Webcam stand-in (walk only)', inputKind: 'image_source', inputSettings: { file: standIn } })).sceneItemId;
			made = true;
		} else id = (await o.call('CreateSceneItem', { sceneName, sourceName: 'Webcam stand-in (walk only)' })).sceneItemId;
		await o.call('SetSceneItemTransform', { sceneName, sceneItemId: id, sceneItemTransform: Object.fromEntries(SETTABLE.map((k) => [k, t[k]])) });
		await o.call('SetSceneItemIndex', { sceneName, sceneItemId: id, sceneItemIndex: 1 });
		mark(`${sceneName}: camera at ${t.positionX},${t.positionY} bounds ${t.boundsWidth}×${t.boundsHeight}` + (t.cropLeft ? ` crop ${t.cropLeft}/${t.cropTop}/${t.cropRight}/${t.cropBottom}` : ''));
	}
	await sleep(2000);

	// Scene 1–6 by the collection's hotkeys (⌃⌥1…6), each held, each checked.
	const stills = [];
	const order = [...SCENES.keys(), 0];
	for (const i of order) {
		const s = SCENES[i];
		await o.call('TriggerHotkeyByKeySequence', { keyId: `OBS_KEY_${s.key}`, keyModifiers: { control: true, alt: true } });
		await sleep(2600);
		const now = (await o.call('GetCurrentProgramScene')).sceneName;
		mark(`⌃⌥${s.key} → ${now}` + (s.override ? ` (override: ${s.override.transition} ${s.override.duration} ms)` : ' (stinger)'));
		if (now !== s.name) throw new Error(`⌃⌥${s.key} gave "${now}", not "${s.name}"`);
		if (stills.length < SCENES.length) {
			const shot = (await o.call('GetSourceScreenshot', { sourceName: s.name, imageFormat: 'png', imageWidth: 1920, imageHeight: 1080 })).imageData;
			const f = join(home, `scene-${s.key}.png`);
			writeFileSync(f, Buffer.from(shot.split(',')[1], 'base64'));
			stills.push(f);
		}
	}
	await o.call('StopRecord');
	mark('stopped');

	// framed.html's own b&w: media= in the page, bw=1 — the path that needs no
	// OBS filter. The Archive clip hidden, the page given a colour image (the OT
	// mark), the Framed scene's still read back: grey, or the walk fails.
	{
		const sceneName = 'Framed';
		// on program: OBS doesn't paint a browser source in a scene that isn't showing
		await o.call('TriggerHotkeyByKeySequence', { keyId: 'OBS_KEY_6', keyModifiers: { control: true, alt: true } });
		const clipItem = (await o.call('GetSceneItemList', { sceneName })).sceneItems.find((i) => i.sourceName === 'Archive clip');
		await o.call('SetSceneItemEnabled', { sceneName, sceneItemId: clipItem.sceneItemId, sceneItemEnabled: false });
		const { inputSettings } = await o.call('GetInputSettings', { inputName: 'Framed page' });
		const logo = encodeURIComponent(pathToFileURL(resolve('public/images/logo1.png')).href);
		const base = inputSettings.url.replace(/caption=[^&]*/, 'caption=media%3D%20in%20the%20page%2C%20bw%3D1');
		const spread = async (url) => {
			await o.call('SetInputSettings', { inputName: 'Framed page', inputSettings: { url } });
			await sleep(2500);
			const png = Buffer.from((await o.call('GetSourceScreenshot', { sourceName: sceneName, imageFormat: 'png', imageWidth: 1920, imageHeight: 1080 })).imageData.split(',')[1], 'base64');
			const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
			const i = (521 * info.width + 960) * info.channels;
			return { png, spread: Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) };
		};
		const colour = await spread(`${base}&media=${logo}`);
		const bw = await spread(`${base}&media=${logo}&bw=1`);
		writeFileSync(BW, bw.png);
		mark(`framed.html media= in OBS: window centre R−B spread ${colour.spread} without bw, ${bw.spread} with bw=1`);
		if (!(colour.spread > 60 && bw.spread <= 2)) throw new Error('framed.html bw=1 did not grey the media in OBS');
	}
	await sleep(1500);

	const raw = readdirSync(rec).find((f) => f.endsWith('.mp4'));
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(rec, raw), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', OUT]);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...stills.flatMap((f) => ['-i', f]), '-filter_complex', `${stills.map((_, i) => `[${i}:v]scale=640:360[s${i}]`).join(';')};${stills.map((_, i) => `[s${i}]`).join('')}xstack=inputs=6:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0`, '-frames:v', '1', SHEET]);
	writeFileSync(TIMELINE, `OBS ${version}, a clean config; npm run broadcast:obs-walk\n${log.join('\n')}\n`);
	for (const f of [OUT, SHEET, BW, TIMELINE]) console.log(f);
} finally {
	o.close();
	obs.kill('SIGTERM');
	await sleep(3000);
	if (obs.exitCode === null) obs.kill('SIGKILL');
	if (!process.env.KEEP) rmSync(home, { recursive: true, force: true });
}
