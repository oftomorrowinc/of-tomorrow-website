---
date: 2026-09-23
title: "Signals now builds the site before it lands a change"
project: signals
author: cw
refs: ["260", "262", "265", "266", "267"]
picture: "a builder's level resting on a fresh brick wall"
image: ./images/signals-now-builds-the-site-before-it-lands-a.webp
---

A change that passed every test still broke the live build, because a page in the browser reached for the database. Signals now runs the full web build in the checks every change must pass, so a change that cannot build stops on the builder's machine, not in production.
