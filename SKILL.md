---
name: mol
description: Build or modify apps with $mol/MAM and related stack. Use when the user asks how to do something in $mol (view.tree, view.ts, css.ts), how to structure a MAM module, how to connect Giper Baza, how to build/admin apps on Giper Baza, or how to package/run with Tauri. Triggers include queries like "как на моле сделать …", "$mol view.tree", "MAM структура", "Giper Baza CRUD/roles/auth", "админка на Giper Baza", or "Tauri + $mol".
---

# $mol Skill Workflow

## 1) Clarify the goal

- Ask for the exact feature, target module path, and whether Giper Baza or Tauri is involved.
- If the request is vague ("сделать что угодно"), propose 2-3 concrete options and ask to choose.

## 2) Pick the right reference

- Use `references/MOL_QUICK_START.md` for core $mol/MAM structure, view.tree syntax, components, best practices, and debugging.
- Use `references/MOL_GIPER_BAZA_GUIDE.md` for data modeling, auth/roles, CRUD, sync, and backend-style patterns.
- Use `references/GIPER_BAZA_ADMIN_GUIDE.md` for admin panels, roles, UI patterns, and admin CRUD flows.
- Use `references/TAURI_SETUP.md` for desktop setup, build, and CI.
- **ALWAYS** read `references/DIMA_STYLE.md` before writing any code — it defines the idiomatic $mol coding style (parametrized components via `*`, `@$mol_mem_key`, minimal CSS, no `.make()`).

## 3) Implement in a MAM module

- Follow the module structure and naming rules from `MOL_QUICK_START.md`.
- Create or update:
    - `index.html` in the module root
    - `*.view.tree` for layout
    - `*.view.ts` for logic (use `@$mol_mem`, `@$mol_action`)
    - `*.view.css.ts` for styles
    - `*.meta.tree` for meta config when needed
- Use `view.tree` bindings correctly:
    - `<=` for one-way, `<=>` for two-way
    - `*` for list/collection properties
    - `null` to remove nodes conditionally

## 4) Data with Giper Baza (if needed)

- Model data with `class ... extends $giper_baza_entity.with({ ... })`.
- Keep CRUD in `@$mol_mem` / `@$mol_action` methods.
- Use presets/roles if data must be shared across lands or users.
- Follow auth/roles guidance from the Giper Baza references.

## 5) Validate & debug

- Don't run the build unless you're asked to.
- Always check `yourproject/-/web.audit.js` after build; fix all warnings/errors.
- Add tests in `*.test.ts` when logic is non-trivial.

## 6) Tauri (if requested)

- Follow `references/TAURI_SETUP.md` for setup, dev, and build steps.
- Ensure `frontendDist` points to the built `-/` folder.
- For CI builds use `b-on-g/tauri-mol-workflow-template`:

```yaml
# As action (single platform, use matrix for multi-platform)
- uses: b-on-g/tauri-mol-workflow-template@master
  with:
    module: "appname/app"          # MAM module path
    platform: desktop              # desktop | android | ios

# As reusable workflow (all platforms out of the box)
jobs:
  tauri:
    uses: b-on-g/tauri-mol-workflow-template/.github/workflows/tauri_reusable.yml@master
    with:
      mam_module_path: appname/app
    secrets: inherit
```

## 7) SEO / Prerendering (if requested)

- $mol SPAs need prerendering for search engine indexing — Googlebot sees empty `<div>` without it.
- Use `b-on-g/mol-prerender-action` after `mam_build`, before deploy:

```yaml
- uses: b-on-g/mol-prerender-action@main
  with:
    base-url: "https://example.github.io/app/"  # prod URL for sitemap
    screens: |                                    # screen IDs, one per line
      campaign
      shop
      leaderboard
```

- Auto-detects build dir and root selector from `index.html`.
- Generates static HTML per screen, `sitemap.xml`, and `robots.txt`.
- `route-format`: `#!` (default) or `?` — matches `$mol_state_arg` format.
- Title and description extracted from each rendered page automatically.

## Output expectations

- Provide minimal, runnable edits in the target module.
- If the user asks for examples, include a small `view.tree` + `view.ts` pair.
- Prefer concrete file paths and exact command lines.
