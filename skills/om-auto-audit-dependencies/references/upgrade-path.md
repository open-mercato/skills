# Working out the upgrade path

How `om-auto-audit-dependencies` turns a kept finding into the concrete change a
future implementer makes (step 4). It reads manifests; it never edits them.

## 1. Pick the target version

- Start from the finding's `target` (or the native tool's recommended version).
  It must clear **every** kept advisory, not only the first one.
- Confirm the target is published in the package's public registry. The bundled
  scanner checks advisory candidates, not registry release availability. After
  ignore filtering, re-check candidates against the effective kept set, keeping
  active ignored advisories out of the blocking set. Unrated remaining advisories
  prevent a claim that a candidate is known safe.
- When `target` is `null`, no candidate was verified. Check the advisory data
  before saying that no fixed release is published. If that cannot be established,
  say **upgrade target unverified**, give the evidence limit, and file a mitigation
  or investigation task; never invent a version or assert that a fix cannot exist.
- When `target_clears_all` equals `target`, say the upgrade also clears the
  below-threshold advisories; when it differs, mention the higher version as an
  option and do not file for the remainder.

## 2. Classify the jump

Compare the installed and target versions:

| Jump | Meaning for the issue |
|---|---|
| patch / same minor | drop-in; low risk |
| minor (`0.x` counts the minor as major) | usually compatible; check the changelog |
| major | 💥 breaking — the issue must say so and link the package changelog or migration guide when the registry page names one |

When the target is a major jump but some advisories have a fix inside the
current major line (from each advisory's `fixed` list), list that interim
version too, with the advisories it would still leave open.

## 3. Turn it into the change

**Direct dependency** — find the declaring manifest next to the lockfile
(`pubspec.yaml`, `package.json`, `Cargo.toml`, `pyproject.toml`, `Gemfile`,
`composer.json`, `go.mod`, `*.gradle*`, `*.csproj`) and quote the current
constraint with its path and line:

- Constraint already admits the target (for example `^4.17.0` admits `4.17.21`)
  → the change is a lockfile refresh of that one package; name the ecosystem's
  single-package update command in the issue as the implementer's step.
- Constraint excludes the target → give the new constraint in the manifest's own
  syntax, written the way the file already writes constraints.

**Transitive dependency** (`direct: false`, or `null` and not declared in any
manifest) — find which direct dependency pulls it in from the lockfile's
dependency graph, then:

- if a newer version of that parent already depends on a fixed version, the path
  is "bump the parent to `<version>`";
- otherwise name the ecosystem's override mechanism (dependency overrides /
  overrides / resolutions / constraints, whichever the manifest's tool uses) as
  a temporary pin, and say it should be removed once the parent catches up.

When the graph cannot be determined from the lockfile, say which parent is
likely from the manifest and mark the path as unverified.

## 4. Record the path

Per finding keep: installed → target, jump class, the manifest file and line (or
parent), the exact constraint change or override, the advisories it clears, and
any advisories it leaves open. Step 5 renders this into the issue body.
