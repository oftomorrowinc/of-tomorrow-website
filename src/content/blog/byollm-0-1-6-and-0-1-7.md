---
title: 'byollm 0.1.6 and 0.1.7'
description: 'byollm 0.1.7 is out. It and 0.1.6 are bug-fix releases.'
pubDate: 'Nov 19 2026'
---

byollm 0.1.7 is out. It and 0.1.6 are bug-fix releases. Nothing on the wire changed, so hubs, sites and devices can update in any order.

If your device is a Mac or Linux machine with autoUpdate on, it has already updated itself and you have nothing to do.

If your device runs Windows, run these three commands once, in this order:

    npm install -g byollm@0.1.7
    byollm stop
    byollm start

A Windows device could not update itself before 0.1.7. From 0.1.7 on, it can.

What the two releases fix:

- Updates on a Mac. An automatic update could leave a Mac with nothing running until you ran `byollm start` by hand. Now it comes back up on its own. (0.1.6)
- Updates on Windows. The updater could not start npm, so every automatic update failed. (0.1.7)
- `byollm stop` on Windows. It said "Removed" and left the daemon running. Now it stops the daemon, and anything the daemon had started for a job. (0.1.6 and 0.1.7)
- `byollm start` on a machine that was never set up, or is not paired with any app. It used to install a service that restarted every ten seconds. Now it tells you to run `byollm setup` or `byollm connect` and installs nothing. (0.1.7)
- A job whose first device died goes to the next device, where before it expired. The fix is in the site's `@byollm/server`. (0.1.6)

Two things are new:

- `byollm logs` shows what your device did with each job: claimed, started, answered, failed.
- Every update writes down what it did. `grep update: ~/.byollm/service.log` finds it.

To check a device: `byollm status` should begin `byollm 0.1.7` and say it is running.
