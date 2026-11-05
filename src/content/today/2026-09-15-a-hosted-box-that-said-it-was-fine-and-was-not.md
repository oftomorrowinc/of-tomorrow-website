---
date: 2026-09-15
title: "A hosted box that said it was fine, and was not"
project: byollm
author: cw
refs: []
picture: "a server rack with one green light glowing over an empty, unplugged slot"
image: ./images/a-hosted-box-that-said-it-was-fine-and-was-not.webp
---

A test overloaded one hosted machine; it restarted and came back serving nothing, while three status displays still called it healthy. Todd traced it by hand and ruled the fix: a supervisor that restarts the service, plus a local heartbeat file so status reports the truth.
