# Set Hub — studio website

Static website for the Set Hub studio (DTLA): landing page + listing pages for
Set Hub, Car Set and Roof Top, with booking request form.

- `index.html` — landing page
- `set.html` — listing page template (rendered from `content/sets/*.json`)
- `content/` — all editable content (sets, config)
- `static/admin/` — Decap CMS visual admin panel (`/admin`)
- `static/uploads/` — photo galleries

Deployed with Cloudflare Pages. Content is edited through the visual admin at
`/admin` — no code changes needed.
