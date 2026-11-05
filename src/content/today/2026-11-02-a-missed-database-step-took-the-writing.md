---
date: 2026-11-02
title: "A missed database step took the Writing Assistant down"
project: press
author: cw
refs: ["6807", "6823", "6824"]
picture: "a missing stone in a garden path, with a new stone being set in place"
image: ./images/a-missed-database-step-took-the-writing.webp
---

After an update the Writing Assistant would not load: a new chapter-length column had never reached the live database. Todd applied it by hand within minutes and the page came back. A test now fails any app migration that has no copy in the folder production is pushed from.
