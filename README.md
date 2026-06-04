# TasteOS for Magnific

Magnific-native personal newsroom demo for the UPSCALE CONF Hackathon.

## Demo

- Standalone HTML demo: [`demo.html`](demo.html)
- Local React demo: `npm install && npm run dev`, then open `http://localhost:5173`
- GitHub Pages demo: `https://hax0rgurl.github.io/tasteos-magnific/demo.html`

The product idea: an agent looks at who a creator is, what they make, what already exists in their Magnific archive, and what Magnific workflows are available. It proposes the most valuable next creative actions, drafts content through Magnific, and learns from approve / disapprove / revise feedback.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

The app runs in demo mode without credentials. To execute against the Magnific REST API, set:

```bash
export MAGNIFIC_API_KEY="..."
npm run dev
```

## Hackathon demo path

1. The creator profile defines what the person makes, taste rules, and forbidden material.
2. The agent scans the Magnific archive and available stock/workflow options.
3. Opportunities are ranked by confidence, taste fit, privacy safety, critic checks, and expected value.
4. The user approves, disapproves, or requests revision.
5. Approval creates a Magnific workflow handoff. With `MAGNIFIC_API_KEY`, the backend can call Magnific image generation directly.

## Magnific backbone

The app is intentionally built around Magnific:

- Archive source: the creator's Magnific account/library through Magnific MCP or account-backed API access.
- Stock/source availability: Magnific Stock Content API for resources, videos, icons, music, and templates.
- Creation workflows: Magnific image, video, audio, upscale, resize, crop, background removal, and custom reference tools.
- Taste loop: local feedback updates future ranking before any autonomous workflow is allowed.

## Why this is not a generic content generator

TasteOS does not start from an empty prompt box. It starts from a creator's archive and tries to answer:

> Given everything this person has created, what is the most valuable thing they should do next?

The important output is judgment: what to make, why now, what existing work to reuse, which Magnific workflow to run, and whether the draft is safe enough to show.
