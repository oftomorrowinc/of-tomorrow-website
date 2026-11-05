---
date: 2026-10-20
title: "Signals now applies its own database changes"
project: signals
author: cw
refs: ["2610", "2636", "2637", "2840"]
picture: "a key turning in a lock before a door swings open"
image: ./images/signals-now-applies-its-own-database-changes.webp
---

When Signals lands work that changes its database, it now rehearses the change, applies it only if the rehearsal matches, records exactly what went in, and only then publishes the code. A change already on production can never be quietly edited; any fix is a new change.
