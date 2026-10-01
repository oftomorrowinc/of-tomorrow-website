# Image prompts for oftomorrow.net — the Popular Science "world of tomorrow" look (CW, 2026-10-01)

For Gemini (or any image model). The mockup: https://claude.ai/artifact/K6XmfRWbDQJDweG9fhijKk — the placeholders are numbered to match. The Gemini Imagen plugin on the machine points at retired model ids (404 on imagen-3/4), so Todd runs these by hand for now.

## What makes it read as 1935–1955 and not as "AI retro"

1. **Name the medium, not the era.** "Gouache and airbrush on illustration board" does more than "1940s style". Add "transparent watercolour washes" for lighter pieces, "tempera" for flatter ones.
2. **Name the printing.** "Four-colour letterpress, slight halftone dot, colours a hair out of register, warm cream paper showing through the lights." Period art was seen through period printing; that is most of what the eye recognises.
3. **One light source, hard shadows, a low or high angle.** Cover art was staged like a film still.
4. **Limited palette, said out loud.** Cream, cadmium red, teal, mustard, navy for shadows. Never "vibrant".
5. **No faces, no text.** Faces are where models give themselves away; text in art is always wrong. Hands and backs of heads are fine. Caps and captions get set in type on the page.
6. **Machines with a job.** Dials, a glowing valve, a cutaway, a diagram arrow — Pop Sci showed how things worked. Avoid "futuristic" (model-speak for chrome and neon); say streamlined, finned, riveted, enamelled.
7. **No masthead, no publication name, no publisher.** One run invented a real magazine's nameplate and publisher line on the art (image 7 of the first run). Say it in the prompt and the negative prompt.
8. **Seen from behind, not just "no faces".** Two of nine Gemini pieces drew a face anyway; the ones that said "from behind and to the side" did not.
9. **Negative prompt, every time:** text, lettering, logo, watermark, photorealistic, 3D render, neon, chrome, cyberpunk, lens flare, glossy, smooth digital gradient, faces.

## Prompt 1 — the workbench and the city of tomorrow (hero, 4:3)

> Magazine cover illustration, gouache and airbrush on illustration board, 1940s American popular-science style. A home workbench in a sunlit room: a compact enamelled grey machine the size of a toaster with its front panel open, one glowing amber valve and tidy coloured wiring inside; a man's hands in rolled shirtsleeves, seen from behind and to the side, turning a dial. Through the window behind the bench, a city of tomorrow at dusk: streamlined towers, an elevated monorail curving past, one airship. Limited palette — cream paper, cadmium red, teal, mustard, navy shadows. Single warm light from the left, hard shadows, slightly low angle. Printed look: fine halftone dot, colours a hair out of register, paper texture in the highlights. No text, no faces.

Negative: text, lettering, masthead, publication name, publisher, logo, watermark, photorealistic, 3D render, neon, chrome, cyberpunk, lens flare, glossy, faces, modern laptop, smartphone.

## Prompt 2 — the house of tomorrow, cutaway (company section, 3:4)

> Cutaway diagram illustration in the style of a 1950s popular-science magazine, tempera and ink on board. A two-storey streamlined house seen from the side with the wall removed: in each room a small enamelled machine on a shelf or desk — kitchen, study, child's room, workshop — each with one glowing valve, joined by thin coloured lines that run only inside the house and stop at the walls. A small diagram arrow points at one machine. Limited palette: cream paper, teal, mustard, cadmium red accents, navy linework. Flat even light, clean outlines, numbered-callout feel without numbers. Halftone print texture, slight misregistration. No text, no people.

Negative: text, numbers, lettering, logo, photorealistic, 3D render, neon, chrome, glossy, people, faces.

## Prompt 3 — the translator's desk (Translations Of Tomorrow, 1:1)

> Gouache illustration, 1940s magazine interior-spread style. A writer's desk by a window: an open hardback book, a second copy in another script beside it, a brass desk lamp, and a small streamlined machine with a dial whose pointer sits between two engraved markings. A woman's hands rest on the pages, seen from above the shoulder, no face. Palette cream, teal, mustard, a little cadmium red on the lamp switch, navy shadows. Warm lamplight from the right, soft airbrush gradients, visible brush texture, halftone print grain. No readable text on the pages — suggested lines only.

Negative: readable text, lettering, logo, photorealistic, 3D render, neon, faces, glossy.

## Prompt 4 — the signal tower (BYOLLM Cloud / hosted boxes, 16:9)

> Wide magazine illustration, airbrush and gouache, 1950s popular-science style. A row of identical small enamelled cabinets on a steel rack inside a clean modern building, each with one glowing valve, a thin line running from each cabinet out through a window to a different distant house on a hillside at dusk. Streamlined architecture, riveted steel, warm interior light against a teal evening sky. Palette cream, teal, mustard, navy, one cadmium-red indicator lamp. Low angle, deep perspective down the rack. Halftone dot, slight misregistration, paper texture. No text, no people.

Negative: text, lettering, logo, photorealistic, 3D render, neon, server room, blinking LEDs, cyberpunk, glossy, people.

## Prompt 5 — spot illustrations (section dividers, 1:1, make several)

> Small spot illustration, ink and two-colour gouache (teal and cadmium red on cream), 1940s magazine style, single object centred with a hard drop shadow: [a streamlined desk lamp / a dial with a pointer / a valve tube glowing / a rolled blueprint / a brass key / a finned enamelled box]. Clean outlines, flat colour, halftone shading, no text.

Negative: text, lettering, photorealistic, 3D render, gradient, glossy.

## When one comes back right

Save the prompt, the seed if the tool shows one, and the model name beside the image in `of-tomorrow-website/public/images/art/` with a `.txt` of the same name. The art direction is reproducible only if the prompt is kept with the picture.
