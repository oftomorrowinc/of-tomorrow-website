# The one picture style (specs/news_001.md §4)

Every story's picture is drawn from this prompt. The block below is the
prompt's fixed half, sent word for word on every call by
`scripts/today/picture.mjs`; the story's `picture:` line fills `{subject}`,
and the project's accent (ACCENT in `src/lib/today.ts`, a magazine token)
fills `{accent}`. Only the `picture:` line goes in, never the title or body:
a headline in the prompt is a headline drawn in the picture.

Change the style here and every new picture changes with it. Old pictures
stay as they are until someone re-runs the script on their story.

```prompt
A small square magazine spot illustration, in the manner of an editorial
newspaper or magazine spot drawing. Printed in two colours only on warm cream
paper ({paper}): near-black ink ({ink}) for line and solid areas, and {accent}
as the single spot colour. Shading is done with a coarse round halftone dot
screen, like an old two-colour print; no gradients, no photographic texture,
no other colours. Confident hand-inked outlines, simple flat shapes, generous
empty paper around the subject. One object or one small scene, centred, seen
plainly, nothing cropped at the edges.

Subject: {subject}.

Absolutely no text: no letters, words, numbers, labels, signage, captions,
watermarks or signatures anywhere, even where the subject would normally
carry writing; leave those surfaces blank. No people's faces and no real
people. No logos or brand marks. Square, 1:1.
```
