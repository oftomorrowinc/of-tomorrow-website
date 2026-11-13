---
date: 2026-11-05
title: "A tool budget in byollm 0.1.5 now holds everywhere"
project: byollm
author: cw
refs: ["7440", "7247", "7483"]
picture: "a jar of tokens with the last one taken out"
---

The 0.1.5 beta keeps a job's limit on tool calls across every device that runs it, and a call past the limit is refused before it reaches the site. The model is told plainly that the budget is spent and finishes its answer, where before it heard that the site had not answered. The beta now waits on Todd's tag.
