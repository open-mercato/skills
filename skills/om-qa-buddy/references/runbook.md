# The interactive runbook — early publish and final update

Detailed procedure and template for step 4 (early) and step 8 (final) of
`om-qa-buddy`. This is the deliverable that lets a human tester work
**in parallel** with the AI session instead of waiting for it to finish.

## Runs at two moments

1. **Early publish** — right after step 3 (`test-plan.md` exists), before
   step 5 boots the app or step 6 clicks anything. Every case is already
   fully written (steps, exact URLs, test data, expected result, priority,
   role/login) — nothing else is required yet. No AI verdict exists at this
   point; the Bugs section is a one-line placeholder. Hand the user the file
   path now and say plainly that they can start testing against it
   immediately, in parallel with the AI's own run.
2. **Final update** — after step 7 (bug files, if any). Overwrite the
   **same file path** with the AI verdict and evidence filled in per case,
   and the Bugs section populated.

## Why the identity must stay stable between the two writes

The tester's own Pass/Fail/Skip clicks live in the browser's `localStorage`,
scoped to this file. That storage survives the file being overwritten as
long as three things stay identical between the early and final write:

- the exact same file path (`$ARTIFACTS_DIR/runbook.html` — never a new
  path for the final update, since a different path is a different
  storage scope in most browsers);
- the same `KEY_PREFIX` string (derive it from the stable run identity —
  the PR number or branch/issue slug — never from the run id, which
  changes nothing here since both writes happen in the same run anyway);
- the same `data-tc` id per case, derived from the case's own ID in
  `test-plan.md` — **never** from its position in the list, so inserting or
  reordering a case can't shift another case's stored verdict onto the
  wrong card.

A case added between the early and final version (rare — the plan should
already be complete before publishing) simply starts unjudged, like any
other case on first load.

## The three sections

1. **What this change does** — the plain-language brief from step 2. No
   file/function names, no jargon; written for someone who has never seen
   this area.
2. **Test cases to cover** — every case from `test-plan.md`, most-critical
   first. Each card carries: role + login, a colored status bar (grey until
   judged), numbered steps with an exact clickable URL on each, prepared
   test data, the expected result, an AI status line, and the Pass/Fail/Skip
   buttons (the tester's own verdict, independent of the AI status line —
   so the runbook shows the human went through *every* case, including the
   ones AI already ran).

   AI status line, one of:
   - Early publish, every case: `AI: session in progress — not run yet.`
   - Final, ran and passed: `AI: OK — confirmed working. Please double-check.`
   - Final, ran and failed: `AI: FAIL — <one line>. Please double-check.`
   - Final, genuinely human-only (keyboard-only input, visual judgment, an
     external credential the session doesn't have): `AI: not run this
     session — needs a human.` Still gets a full step-by-step; never
     dropped from the runbook.
3. **Bugs found during testing** — one block per file from
   `references/bug-report-template.md`, repro-ready. Empty at the early
   publish (`Session in progress — bugs will appear here.`); populated only
   at the final update.

Top of the runbook, always: a sticky progress bar (percentage of cases
judged), live Pass/Fail/Skip counts, a reset link, and an estimated retest
time split into "human-only cases" vs. "double-check of AI-run cases"
(count cases per AI-status bucket and multiply by a short per-case
estimate, e.g. 2 minutes).

## Self-contained HTML template

Single file, inline CSS and JS, no external requests — so it opens from a
local path with nothing else running. Generate one `.card` per test case;
everything in `{{ }}` is filled in from `test-plan.md` and step 2's brief.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>QA Runbook — {{ target title }}</title>
<style>
  :root { --bg:#fff; --fg:#1a1a1a; --muted:#666; --border:#e2e2e2; --card:#fafafa;
          --grey:#9e9e9e; --green:#2e7d32; --red:#c62828; --amber:#e08e00; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#15181c; --fg:#e8e8e8; --muted:#9aa0a6; --border:#2a2f36; --card:#1c2026; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:16px 16px 96px; background:var(--bg); color:var(--fg);
         font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif; }
  h1,h2 { margin:0 0 8px; }
  .bar { position:sticky; top:0; background:var(--bg); border-bottom:1px solid var(--border);
         padding:12px 0; margin-bottom:16px; z-index:10; }
  .progress { height:8px; background:var(--border); border-radius:4px; overflow:hidden; }
  .progress > div { height:100%; background:var(--green); transition:width .2s; }
  .counts { font-size:13px; color:var(--muted); margin-top:6px; display:flex; gap:12px; flex-wrap:wrap; }
  .card { border:1px solid var(--border); background:var(--card); border-radius:8px; padding:14px; margin:12px 0; }
  .status-bar { height:6px; border-radius:3px; margin-bottom:10px; background:var(--grey); }
  .status-bar.pass { background:var(--green); }
  .status-bar.fail { background:var(--red); }
  .status-bar.skip { background:var(--amber); }
  .ai-status { font-size:13px; color:var(--muted); margin:6px 0; }
  .verdict-btns button { padding:6px 14px; margin-right:6px; border:1px solid var(--border);
          border-radius:6px; background:var(--bg); color:var(--fg); cursor:pointer; }
  .verdict-btns button.active-pass { background:var(--green); color:#fff; }
  .verdict-btns button.active-fail { background:var(--red); color:#fff; }
  .verdict-btns button.active-skip { background:var(--amber); color:#fff; }
  .reset { background:none; border:none; color:var(--muted); text-decoration:underline; cursor:pointer; }
</style>
</head>
<body>
  <div class="bar">
    <h1>{{ target title }}</h1>
    <div class="progress"><div id="progress-fill" style="width:0%"></div></div>
    <div class="counts">
      <span id="count-summary">0 / {{ case count }} judged</span>
      <span>Est. retest: {{ human-only minutes }} min human-only + {{ double-check minutes }} min double-check</span>
      <button class="reset" onclick="if(confirm('Reset all your verdicts?')) resetAll()">reset my verdicts</button>
    </div>
  </div>

  <section>
    <h2>What this change does</h2>
    <p>{{ plain-language brief from step 2 }}</p>
  </section>

  <section>
    <h2>Test cases to cover</h2>
    <!-- one .card per case from test-plan.md, most-critical first -->
    <div class="card" data-tc="{{ case id, e.g. TC-XXX-001 }}">
      <div class="status-bar"></div>
      <strong>{{ case id }} — {{ title }}</strong> <span style="color:var(--muted)">({{ priority }})</span>
      <p>Role: {{ role }} · Login: {{ email }} / {{ password }}</p>
      <ol>{{ numbered steps, each with an exact clickable URL }}</ol>
      <p><strong>Test data:</strong> {{ prepared IDs/links/JSON }}</p>
      <p><strong>Expected:</strong> {{ expected result }}</p>
      <p class="ai-status">{{ AI status line — one of the states above }}</p>
      <div class="verdict-btns">
        <button onclick="setVerdict('{{ case id }}','pass')">Pass</button>
        <button onclick="setVerdict('{{ case id }}','fail')">Fail</button>
        <button onclick="setVerdict('{{ case id }}','skip')">Skip</button>
      </div>
    </div>
  </section>

  <section>
    <h2>Bugs found during testing</h2>
    <div id="bugs">{{ "Session in progress — bugs will appear here." at early publish; one repro-ready block per bugs/*.md at the final update }}</div>
  </section>

<script>
(function(){
  var KEY_PREFIX = 'qa-buddy:{{ stable run identity, e.g. pr-1234 or branch-slug }}:';
  var ids = Array.prototype.map.call(document.querySelectorAll('[data-tc]'), function(el){ return el.getAttribute('data-tc'); });
  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
  window.setVerdict = function(id, verdict) {
    safe(function(){ localStorage.setItem(KEY_PREFIX + id, verdict); });
    render();
  };
  window.resetAll = function() {
    ids.forEach(function(id){ safe(function(){ localStorage.removeItem(KEY_PREFIX + id); }); });
    render();
  };
  function render() {
    var judged = 0, pass = 0, fail = 0, skip = 0;
    ids.forEach(function(id){
      var v = safe(function(){ return localStorage.getItem(KEY_PREFIX + id); }, null);
      var card = document.querySelector('[data-tc="' + CSS.escape(id) + '"]');
      if (!card) return;
      card.querySelector('.status-bar').className = 'status-bar' + (v ? ' ' + v : '');
      var btns = card.querySelectorAll('.verdict-btns button');
      btns.forEach(function(b){ b.className = ''; });
      if (v) {
        judged++;
        if (v === 'pass') { pass++; btns[0].className = 'active-pass'; }
        if (v === 'fail') { fail++; btns[1].className = 'active-fail'; }
        if (v === 'skip') { skip++; btns[2].className = 'active-skip'; }
      }
    });
    document.getElementById('progress-fill').style.width = (ids.length ? (100 * judged / ids.length) : 0) + '%';
    document.getElementById('count-summary').textContent = judged + ' / ' + ids.length + ' judged — ' + pass + ' pass, ' + fail + ' fail, ' + skip + ' skipped';
  }
  render();
})();
</script>
</body>
</html>
```

## Opening the runbook

State the absolute path to `$ARTIFACTS_DIR/runbook.html` and say it opens
directly in any browser (`file://` URL) — no server needed, since the
template makes no external requests. Wrap every `localStorage` read/write in
try/catch (already done above) and render correctly with no stored value,
because a private window, cleared site data, or a stricter local-file
storage policy can make it start empty every time — that degrades to "no
verdicts remembered yet," never a broken page.

## Optional: a shareable hosted link

When the environment this skill runs in provides a way to publish an
interactive HTML page as a shareable, live-updatable link (for example
Claude Code's Artifact capability), also publish the same file there in
addition to the local copy, republishing to the **same** URL at the final
update for the identical localStorage-persistence reason above. This is an
enhancement, not a requirement — when no such capability exists (as in a
plain Codex session), the local file is the complete deliverable and nothing
is lost.
