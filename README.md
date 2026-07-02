# Personal Academic Website

Static personal academic site designed for GitHub Pages.

## Structure

- `index.html`: public website
- `admin/index.html`: browser-based content editor
- `data/site.json`: site content source of truth
- `assets/images/`: portrait and gallery image assets

## Editing workflow

1. Open `admin/index.html` in a browser or local server.
2. Update profile, homepage text, publications, and gallery collections.
3. Export the generated `site.json`.
4. Replace `data/site.json` in the repo with the exported file.
5. Commit any new image assets referenced in the JSON.
6. Push to GitHub.

## Hidden gallery

The gallery is intentionally absent from the main navigation.

- Set `gallery.secretPath` in `data/site.json`.
- Visit `/<secretPath>` on the deployed site to reveal it.

Example: `https://yourusername.github.io/nocturne-room`

## GitHub Pages

This is a plain static site. You can deploy it directly with GitHub Pages from the repository root.
