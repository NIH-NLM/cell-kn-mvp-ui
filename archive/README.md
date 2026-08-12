# Archive

Superseded code kept in the tree rather than only in git history, so that anyone
still running one of these paths by hand can find it. Nothing here is referenced
by the application, CI, or the active deployment scripts.

Paths mirror where each item used to live.

## `core/sh/` — manual Apache-on-EC2 deploy

A manual SSH deploy: `deploy-mvp.sh` / `deploy-ckn.sh` provisioned an Ubuntu EC2
box, installed Apache with the vhost configs in this directory, and copied the
build across. `conf-mvp/` and `conf-ckn/` hold 40 version-pin files spanning
v0.4.2 through v1.4.2.

**Superseded by** the ECS/S3/CloudFront deployment in `scripts/app/`
(`deploy-frontend.sh`, `deploy-backend.sh`, `deploy-dataset.sh`), described under
"Live Environment" in the root `README.md`.

## `arango_api/sh/` — local ArangoDB container helpers

`start-arangodb.sh` / `stop-arangodb.sh`, called only by the deploy scripts above.

**Superseded by** `scripts/dev/load-dump-local.sh`, documented in `SETUP.md`.

## `cloudformation/` — CloudFormation lint config

Only ever contained `.cfnlintrc.yaml`; the templates it configured are gone.

**Superseded by** the `nlm-ckn-iac` repository, which now owns CloudFormation,
environment provisioning, and account setup (see `scripts/README.md`).

---

If something here is genuinely dead, delete it — git history keeps it. If
something here is still in use, it belongs back in the tree, not in `archive/`.
