---
date: 2026-10-23
title: "A broken team page, fixed the same day"
project: byollm
author: cw
refs: ["4203", "4226", "4127", "4228"]
picture: "a mended chain link on a workbench"
image: ./images/a-broken-team-page-fixed-the-same-day.webp
---

A database change reached production before the code that expected it, and the byollm dashboard's team page stopped loading. It was fixed the same day, with a test that reproduces the exact failure. Seats now come from Stripe alone, and the team id has a copy button beside the API keys.
