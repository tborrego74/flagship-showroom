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

    node tools/dev.mjs

Then open http://localhost:4173. After changing a demo's hero, refresh the screen images with `node tools/screens.mjs` (needs Playwright).

## Photography

The Solmère House demo uses real photographs from Unsplash (Unsplash License, free for commercial use). The web-sized copies live in `demos/luxury/img` and the photographers are credited on `demos/luxury/credits.html`. For a paying client, replace these with their own photography.

## Visit tracking and the admin page

`js/track.js` records anonymous visits (no cookies, names or IP addresses) and posts them to `/api/t`. Records are stored as small JSON files in a Vercel Blob store. `/admin` shows them and is protected by Google sign-in.

Vercel environment variables:

- `BLOB_READ_WRITE_TOKEN`: added automatically when a Blob store is connected to the project.
- `GOOGLE_CLIENT_ID`: a Google OAuth web client ID whose authorised JavaScript origin is the site's address.
- `ADMIN_EMAILS`: comma-separated Google addresses allowed to sign in.

To test locally run `node tools/dev.mjs` and open http://localhost:4173/admin/. Local runs skip sign-in and store visits in `.data/`. Signing in on `/admin` (or opening the site once with `?notrack`) stops that device from being counted.

## Free website waitlist

`/waitlist` is the signup page for the free website offer (share it as `/waitlist?utm_source=facebook` so the source is recorded). The form posts to `/api/waitlist`, which stores each signup as a JSON file under `waitlist/` in the same Blob store, with a long random file name. A hidden honeypot field and a minimum fill time quietly drop bot submissions. Signups are only read back by `/api/signups`, which needs the admin Google sign-in, and they show at the top of `/admin` with a CSV download. The share image is `assets/og/waitlist.jpg`, rendered from `tools/og-waitlist.html`.
