# Flagship Showroom

The Borrego Business Systems website showroom: a 3D desk with three laptops and three phones, each opening into a live demo site.

Live at websites.borregobusinesssystems.com.

## How it is built

Plain static files. There is no build step, so Vercel serves the repo root as is (Framework Preset: Other, no build command, output directory empty).

- `index.html`, `js/showroom.js`, `css/showroom.css`: the 3D desk, device interactions and the fly-in to each screen.
- `demos/luxury`: Solmère House. A sea and sky shader that moves from dawn to night on scroll.
- `demos/courier`: Relay Nine. A 3D night city where scrolling drives a delivery route.
- `demos/plumbing`: Halden & Pike. Copper pipework that grows through the steps of a service visit.
- `demos/shared`: the small scroll and motion kit the demos share.
- `vendor`: Three.js, vendored so nothing depends on a CDN.
- `assets/screens`: the images shown on the laptop and phone screens before you step inside.

All three demo brands are fictional.

## Useful links

- `/#luxury`, `/#courier`, `/#plumbing` open straight into a demo. Add `-mobile` (for example `/#courier-mobile`) for the phone view.
- `/?skip` skips the intro animation.

## Local preview

    python3 -m http.server 4173

Then open http://localhost:4173. After changing a demo's hero, refresh the screen images with `node tools/screens.mjs` (needs Playwright).

## Photography

The Solmère House demo uses real photographs from Unsplash (Unsplash License, free for commercial use). The web-sized copies live in `demos/luxury/img` and the photographers are credited on `demos/luxury/credits.html`. For a paying client, replace these with their own photography.
