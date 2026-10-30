# dsh-plugin-continue

A DeepSeek Harness Web plugin that adds a compact **「继续」(Continue)** dropdown at the far left of the composer's tool row, plus a **「常用指令」(Common instructions)** page in Settings.

Built and verified against **DSH 0.1.7-rc.2** (`@deepseek-ai/dsh-client-*` `0.1.7-rc.2`). The plugin must be rebuilt whenever DSH changes its client exports — see [Compatibility](#compatibility) below.

- The composer control is now a **dropdown**: open it and pick any instruction (the built-in `继续` plus every custom instruction) to send that phrase — exactly as if you had typed it and pressed Send.
- The **Settings → 常用指令** page manages custom instructions: add, edit, and delete phrases. The built-in `继续` instruction is always present and cannot be edited or removed.
- Instructions persist in the browser (`localStorage`), so they survive page reloads.

It is a dual-face `dsh.client` plugin: an empty host half (so the Loader can mount the row) plus a browser half that registers into the composer's `conversation.input.left` slot and the settings panel's `settings.section` slot.

## Install on a machine with an installed DSH

The package declares `dsh.bundle`, so installing it into the `web` profile also mounts its patch row automatically.

```sh
# from npm (publish it first, then):
dsh plugin --profile web add dsh-plugin-continue

# or straight from a local tarball / folder / git:
dsh plugin --profile web add ./dsh-plugin-continue-0.3.1.tgz
dsh plugin --profile web add ../dsh-plugin-continue
dsh plugin --profile web add git+https://github.com/<you>/dsh-plugin-continue
```

Then start (or restart) the web surface:

```sh
dsh web
```

Open the URL `dsh web` prints. The dropdown appears at the left of the composer, and the settings page appears in the Settings panel.

If you prefer to mount it yourself instead of relying on the bundle declaration, add this row to `$DSH_HOME/profiles/web/cordis.patch.yml` after installing the package as a dependency:

```yaml
- insert:
    - id: ui-continue
      name: 'dsh-plugin-continue'
```

## Build (only needed when you change the source)

The repository-internal `clientBundle` tsdown preset is not published, so this package ships its own `build.mjs` that reproduces the exact browser-bundle contract (`window.__ModuleLoader__.load({ id, factory })`, CJS closure factory, platform modules external).

```sh
npm install     # brings esbuild + type-only devDependencies
npm run build   # emits lib/index.js and lib/client.js
npm run typecheck
npm run pack    # produces ./dsh-plugin-continue-0.3.1.tgz
```

> Note: if `npm run build` is blocked from spawning esbuild's service (sandboxed shells), build directly with the native binary:
>
> ```sh
> node_modules/.bin/esbuild src/index.ts --bundle --format=esm --platform=node --target=es2022 --outfile=lib/index.js
> # and the browser half with --external for each platform module + the module-loader banner/footer (see build.mjs)
> ```

## Notes

- The built-in instruction sends the literal `继续`; custom instructions send whatever phrase you entered.
- The button belongs to the default composer: a whole-composer takeover (e.g. plan review) temporarily replaces it.

## Compatibility

The browser half resolves `@deepseek-ai/dsh-client-ui-primitives` (and the other platform modules) from the running DSH shell's frozen module table at **runtime** — those imports are not bundled. A client export that was renamed or removed by a DSH upgrade therefore still builds fine but renders as `undefined` in the browser.

So after any DSH upgrade:

```sh
npm install        # devDependencies pin the matching @deepseek-ai/dsh-client-* version
npm run typecheck  # the only gate that catches renamed/removed exports (esbuild does not typecheck)
npm run build; npm run pack
dsh plugin --profile web add ./dsh-plugin-continue-0.3.1.tgz
dsh --profile web --dump-config | Select-String continue   # must print the ui-continue row
```

Known upgrade breakage, and the fixes already applied here:

| DSH | What broke | Fix |
|---|---|---|
| 0.1.7-rc.2 | profile layout moved to `$DSH_HOME/profiles/<name>` with `dsh.profile.bundles`; the plugin was no longer mounted | re-run `dsh plugin add` (the `dsh.bundle.patch` declaration re-registers it) |
| 0.1.7-rc.2 | `ui-primitives` renamed icons from size suffixes to stroke suffixes (`IconEditOutline16` → `IconEditOutlineRegular`) | use `Icon*Regular` / `Icon*Medium` with the `size` prop |

The plugin needs **no `dsh web` restart** after being (re-)installed: the host picks up the profile change and open pages receive the new client module over the HMR transport.
