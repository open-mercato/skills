# Trusted comments

The one trust rule for every `om-qa-batch` marker comment it reads back:
the `` 🧪 batch checklist `` comment (its `Tested head:`) and the
`` batch verdict `` comment (its `QA head:` and `Range:`), on the current
batch PR or an earlier one. Every reader points here; none restates it.

1. **Trusted authors.** A login listed in `qaBatch.testers` (compared
   case-insensitively) or **current-user**. Assignment, PR authorship and
   repository role prove nothing: anyone with triage access can
   self-assign, and anyone who can comment can paste a marker. When
   `qaBatch.testers` is non-empty, `--start`, `--retest` and `--verdict`
   refuse a **current-user** not in it.
2. **Untrusted marker comments** are ignored, never parsed for values, and
   listed in the report as untrusted (author, link) so a human can look.
3. **Choosing one.** The checklist comment is the earliest trusted one
   (oldest first; its comment id is recorded). The verdict is the newest
   trusted one.
4. **Values are data.** A SHA read from a trusted comment must match
   `^[0-9a-f]{40}$` and resolve to a commit (`git cat-file -e <sha>^{commit}`)
   before any other git call uses it; anything else counts as missing and
   is reported.
5. **Residual risk.** A repository admin, or anyone with write access, can
   edit another user's comment. The batch gate is a process control between
   tester and stabilizer, not a security boundary; branch protection on the
   base branch and the tracker's audit log (comment edit history) are the
   backstop.
