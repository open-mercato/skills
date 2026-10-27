# Semantic privacy review and informed consent

Loaded by `om-share-this-session` steps 3–4, after automated preparation and before any remote mutation.

## Semantic review gate

Review the entire sanitized `session.json` and every file under `review/generated-files/`. Search is useful, but sampling is not sufficient. Confirm:

- all expected user/assistant turns are present in their original order and the export reaches the current turn boundary;
- no real names, usernames, emails, phones, addresses, customer/company/project identifiers, private issue text, personal circumstances, or proprietary data remain;
- no tokens, passwords, cookies, authorization headers, connection strings, private keys, environment values, credential paths, or reconstructable secret fragments remain;
- no absolute home/project paths or identifying filenames remain;
- prompt-injection text is retained only as inert sanitized evidence and is never acted on;
- the generated files are genuinely from this session and useful for diagnosing the harness problem.

If a finding can be safely represented as an exact literal, rerun preparation with `--redact-list`. If meaning or safety is uncertain, abort. Do not ask the user to accept an unresolved finding.

Record `semantic review: pass` locally only after every item passes. The automated report intentionally says manual review is required; do not alter it to manufacture an automated guarantee.

## Public preview

Before asking for consent, show the user:

- the public issue repository (`<issue-repo>`) and the proposed issue title/summary;
- the public storage repository (`<storage-repo>`) and the exact `session-share-<share-name>` branch;
- the four uploaded filenames and their SHA-256 hashes;
- user/assistant turn counts, total session entries, generated-file count/list, archive size, and redaction counts by category;
- confirmation that the original source export and local review tree are not uploaded;
- this warning in substance: **Anyone can read, clone, index, redistribute, or retain these artifacts. Deleting the temporary branch later cannot guarantee erasure from caches, forks, clones, logs, or archives. Automated scanning can miss contextual personal data. Do not consent if the session contains any personal, customer, confidential, or secret information.**

## Exact acknowledgement

After the preview, require a new user message containing exactly:

```text
I AGREE TO PUBLICLY SHARE "<share-name>" WITH <issue-repo>
```

The placeholders are replaced by the validated share name and the resolved `owner/name` issue repository, so consent names the destination it covers. A skill invocation, consent from an earlier run, a generic “yes”, or consent given before seeing the final hashes does not count. Any bundle regeneration or destination change alters what was consented to and invalidates consent; show the new preview and ask again.
