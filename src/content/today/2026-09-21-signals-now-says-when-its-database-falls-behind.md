---
date: 2026-09-21
title: "Signals now says when its database falls behind"
project: signals
author: cw
refs: []
picture: "a ship's gauge with its needle just below the line"
image: ./images/signals-now-says-when-its-database-falls-behind.webp
---

When the app shipped ahead of its database, the only sign was a log nobody read. Now the board shows one line naming the missing migrations and the command to run, and stays silent when all is current. A failure caused by the gap says so, instead of looking like a random error.
