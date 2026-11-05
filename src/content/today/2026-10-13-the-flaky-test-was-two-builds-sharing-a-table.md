---
date: 2026-10-13
title: "The flaky test was two builds sharing a table"
project: signals
author: cw
refs: ["838", "900", "861", "877"]
picture: "two chefs reaching for the same mixing bowl"
image: ./images/the-flaky-test-was-two-builds-sharing-a-table.webp
---

A test that failed now and then turned out to be sound: two landings were checking their work against one shared test database at the same moment. Every build now gets a database of its own, and the suites that borrowed their neighbours' fixtures got their own too.
