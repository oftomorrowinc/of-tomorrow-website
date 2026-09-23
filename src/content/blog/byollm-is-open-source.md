---
title: 'BYOLLM is open source'
description: 'BYOLLM – Bring Your Own LLM – lets you use your own AI on websites you authorize. A small program on your machine lets you use your own models and subscripti...'
pubDate: 'Sep 25 2026'
---

BYOLLM – Bring Your Own LLM – lets you use your own AI on websites you
authorize. A small program on your machine lets you use your own models and
subscriptions on any BYOLLM-integrated site, including new models the moment
you get access – no site updates required.

As of this week it is open source: `byollm` 0.1.1 on npm, MIT licensed, six
packages, protocol version 2.

## What it is, in one picture

Your web app stays hosted. The user runs a small daemon that connects *out*
to your backend, claims only their own jobs, and runs them on whatever model
they have – Ollama, MLX, llama.cpp, or the Claude or ChatGPT plan they
already pay for. Nothing to open on their network. Jobs are typed data, never
code.

```
your web app  ──enqueue──▶  your backend (@byollm/server)
                                  │
                         your job queue (Supabase, Postgres, memory…)
                                  ▼
user's device  ──outbound poll──▶ claim ─▶ run locally ─▶ result
```

## For people who use AI apps

Your favorite model, everywhere you go. New models the moment you get them –
not when a site gets around to adding them. Your prompts go to your own
device, encrypted end-to-end; byollm.cloud can't read them. Sites never
learn which model you use, and your subscriptions are never shared. And
sites that don't pay for AI can charge you less – or nothing.

The age of zero marginal cost apps Satya Nadella declared as dead, we can now declare reborn.

## For people who build sites

Zero AI bills: your users bring their own compute. No floating money – you
don't pay LLM bills up front and hope to collect later, and you never ask
people to prepay just to try you. Free trials that cost you nothing to
offer. One small integration; your users choose the models.

```ts
// app/api/byollm/[...route]/route.ts
import { createHandler } from "@byollm/server/next";
import { store } from "@/lib/byollm";
export const { POST } = createHandler({
  store,
  verificationUrl: "https://your-app.com/settings/runners",
});

// enqueue from anywhere in your app
const job = await app.enqueue({
  kind: "llm.generate",
  audience: "private",   // this user's device only
  owner: userId,
  payload: { prompt },
});
const { outcome } = await job.result({ onNoRunner: promptUserToConnect });
```

## Why I built it

I kept building small apps – for myself, for managing my wife's book ads, for one
problem at a time – and not shipping them, because keeping a catalog of
small apps alive on somebody else's API costs money every month whether
anyone uses them or not. Language models are excellent at small,
single-purpose tools and bad at large ones. So the unit of building should
be the small app, and the craft is in how small apps connect. BYOLLM is the
piece that makes a catalog of them cost nothing to keep online: the
inference runs on the user's own compute. And developers can launch their own apps online and use their own subscriptions too. Add a few lines during app creation and all your llm plumbing just works.

## What is open, and what is hosted

Everything that decides who runs what is open source and readable: the
daemon (`byollm`), the server adapter (`@byollm/server`), the wire contract
(`@byollm/protocol`), the reference relay (`@byollm/relay`), the control
plane (`@byollm/control-plane`) and the conformance kit
(`@byollm/conformance`). A server is BYOLLM-compatible when the conformance
kit passes against it.

byollm.cloud is the hosted relay and control plane, for people who would
rather not run that part themselves. It is opening in waves. If you want in
early: byollm.cloud/early-access, in the order people joined.

## Where it is early

The protocol is version 2 as of 0.1.0; the software is still early. These
packages run one hosted service and a small number of integrations; beyond
that they have little mileage. If you integrate one and something is
wrong, the repository is where to say so.

Things that we know are limiting now: No tool use. Devices have to stay online. ???? We actually have plans to fix all of these, but we wanted to get this live and let people watch us, and contribute to, building in public.

byo-llm.com · github.com/oftomorrowinc/byollm · npmjs.com/package/byollm

*(The "Where it is early" paragraph is the byo-llm.com banner, verbatim, so
the blog and the site say the same thing. The code sample is byo-llm.com's
with `audience: "private"` – the site's copy is being corrected to match
this week; if the site still says `"self"` when you publish, hold the post
until it does, or the two will disagree in public.)*

---
