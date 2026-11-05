---
date: 2026-10-24
title: "Comped seats now count across every subscription"
project: byollm
author: cw
refs: ["4546", "4565"]
picture: "a row of folding chairs with two marked reserved"
image: ./images/comped-seats-now-count-across-every-subscription.webp
---

A team's added seats are now summed over every active subscription its owner holds in Stripe, since a comp has to live on a subscription of its own. While building it, the builder found that lowering the seat count would have charged for the comp again, and that is fixed too. Todd pushed the change by hand.
