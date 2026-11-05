// A minimal obs-websocket v5 client (no auth), on Node's built-in WebSocket —
// enough for broadcast/obs/walk.mjs to drive an OBS the way a person would.
export async function connect(url, { timeout = 30000 } = {}) {
	const deadline = Date.now() + timeout;
	for (;;) {
		try {
			return await open(url);
		} catch (e) {
			if (Date.now() > deadline) throw e;
			await new Promise((r) => setTimeout(r, 500));
		}
	}
}

function open(url) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url, 'obswebsocket.json');
		const pending = new Map();
		const listeners = [];
		let n = 0;
		ws.onerror = () => reject(new Error(`no obs-websocket at ${url}`));
		ws.onmessage = (m) => {
			const { op, d } = JSON.parse(m.data);
			if (op === 0) ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, eventSubscriptions: 0x3ff } }));
			else if (op === 2) resolve(client);
			else if (op === 5) listeners.forEach((l) => l(d));
			else if (op === 7) {
				const p = pending.get(d.requestId);
				pending.delete(d.requestId);
				if (!p) return;
				if (d.requestStatus.result) p.ok(d.responseData ?? {});
				else p.fail(new Error(`${d.requestType}: ${d.requestStatus.code} ${d.requestStatus.comment ?? ''}`));
			}
		};
		const client = {
			call(requestType, requestData = {}) {
				const requestId = String(++n);
				return new Promise((ok, fail) => {
					pending.set(requestId, { ok, fail });
					ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
				});
			},
			on(fn) {
				listeners.push(fn);
			},
			close() {
				ws.close();
			},
		};
	});
}
