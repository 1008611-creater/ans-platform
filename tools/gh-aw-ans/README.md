# ANS review compiler patch

This is a local patch to GitHub Agentic Workflows v0.89.21, at the exact upstream commit in `manifest.json`. It is **not an unmodified official binary**. The bundled MIT notice covers the upstream source used by the patch.

The upstream detector builder drops explicit `sandbox.agent.token-steering` and `sandbox.agent.model-fallback` values. The patch copies only those values into the detector sandbox, preserving unset/false/true/template semantics and independent pointers. It does not copy mounts, commands, environment or the ability to disable isolation. Regression tests cover the builder and both external and inline generated execution steps.

## Rebuild

Requires Node.js, Git and Go (the upstream `go.mod` selects its toolchain). Obtain an upstream checkout containing the pinned commit, then run from ANS:

```sh
node scripts/build-review-compiler.mjs --source /absolute/path/to/gh-aw --output /absolute/path/to/new-build-directory
```

The script clones into a new output directory, checks out the exact commit with LF source files, checks the patch and test SHA-256 values, applies the patch, runs the affected tests and builds the binary. It never changes the supplied checkout or removes an existing output directory. Go may download its toolchain and modules. Configure `GOPATH`, `GOMODCACHE` and `GOCACHE` outside a space-constrained system drive when needed.

The output contains the patched source, binary and a build receipt with hashes. The binary reports the **upstream base version** v0.89.21 so the official blocked-version check remains effective; identify this distribution through this manifest, source patch, filename and receipt. Do not represent its version output as proof of an official binary.

To compile a candidate repository, run the resulting binary **from that repository**:

```sh
/absolute/path/to/gh-aw-ans-model-policy compile --no-check-update --action-mode action --action-tag v0.89.21
```

Use `.exe` on Windows. Compile all workflows so repository-wide failure-issue expiry remains accurate. Check the generated action setup SHA against `manifest.json`, both actual AWF configurations, credential exclusions, budgets, permissions and the strict detector failure gate before activation. Do not hand-edit generated lock files.

This tooling does not store credentials, invoke a model, activate workflows, merge PRs or deploy ANS. Credential transfer and billable inference require the user's explicit authorization. A local build or generated workflow does not establish real provider compatibility, price, model identity or a successful GitHub run.