# Eject recipe contract

What `om-eject-and-customize` needs from a dependency before it will eject
anything, where it looks, and when it stops. Loaded by workflow steps 1, 2,
and 5.

## Resolution (step 1)

1. **Detect the ecosystem** from the manifest and lockfile at the repository
   root, or at the workspace member that consumes the dependency. Detect the
   package manager and its install location; never assume one.
2. **Resolve the installed copy** the repository's own code resolves — from
   the consuming root, not an arbitrary hoisted or cached duplicate. Follow
   symlinks and confirm the resolved root is the dependency's own directory.
3. **Read the exact version** from the installed copy's own manifest; fall
   back to the lockfile only when nothing is materialized, and say so.
4. **Check for duplicates.** Another installed copy at a different version, or
   mixed versions across a family of related packages → stop and report both
   locations and versions. Never read the recipe from one copy and code from
   another.
5. **Not installed / not materialized** (dependencies not installed yet,
   zero-install archives, a remote-only cache) → stop and tell the user to
   install dependencies first. Never fetch the dependency or its docs from the
   network.

## Locating the recipe (step 2)

Search in this order and stop at the first source that yields a recipe:

1. The repository `AGENTS.md` Task Router — a row routing eject or
   customization of this dependency to a repo-owned or dependency-shipped file.
2. `knowledge.sources` `path` entries (repo-owned guides) that describe eject
   for this dependency — valid only while any version stamp they carry matches
   the installed version.
3. `knowledge.sources` `dependency` entries matching this dependency: the
   configured `files` (default `["AGENTS.md"]`) under the resolved root, plus
   the nearest nested `AGENTS.md` between the part being ejected and that root.
   Follow the dependency's own Task Router or links to an eject guide inside
   the resolved root only.

Every file read must stay inside the repository or the resolved dependency
root after symlink resolution. Read only the files needed for this part.

## Required recipe fields

A source counts as an eject recipe only when it supplies all of these for the
part in question:

| Field | What it answers |
|---|---|
| Ejectable unit | Which parts can be ejected and how they are named. The target must be one of them. |
| Supported procedure | The command (or tool) the dependency provides for ejecting, run from the repository root — or an explicit statement that manual copy of named files is the supported procedure. |
| Landing location | Where the repository-owned copy goes. |
| Registration | How the repository switches from the installed part to its own copy (a registry entry, config key, import path). |
| Stays upstream | Contracts the copy must keep: stable identifiers, persisted schemas and migrations, public APIs, access rules, optional-part degradation. |

Optional fields, used when present: smaller alternatives to try first
(extension points, overrides, add-on packages), post-eject steps
(regeneration, cache purge), focused checks after eject, and how to record
the upstream version.

## Stop rules

- **No recipe found** → stop. Report where you looked, the installed version,
  and the smaller options that remain (extension points, an upstream change
  request). Do not reconstruct a recipe from the installed source, and do not
  copy files by hand.
- **Recipe incomplete** (a required field missing) → stop and name the
  missing fields. The user may point at a better source; re-run step 2 on it.
- **Recipe contradicts itself or the installed code** (e.g. the documented
  command does not exist at this version) → stop and report both sources with
  the version. Code is current behavior; docs are intended behavior.
- **Target not ejectable** per the recipe → stop and say which parts are.

## Command safety (step 5)

Before presenting a recipe command for approval, check it:

- It runs from the repository root, uses the repository's own detected
  toolchain or a binary the dependency ships, and writes only to the landing
  location, the registration file, and paths the recipe names.
- It does not reach the network, pipe downloaded content into a shell, read
  credential stores or `.env` files, change global state, or escalate
  privileges.
- Every interpolated value (part name, path) matches `^[A-Za-z0-9._/@-]+$`
  and is quoted.

A command that fails any check is not run: show it, say which check failed,
and stop. Present the passing command verbatim; run exactly what the user
approved.
