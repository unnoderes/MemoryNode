# Releasing MemoryNode

Pull requests and pushes to `main` that change the packaged product run
`sdk-ci.yml`. The workflow tests the backend and SDK on supported Python and
operating-system combinations, builds the static console, creates the sdist and
wheel, audits both distributions, and installs the wheel outside the repository.
It never publishes to PyPI.

## One-time repository setup

1. Create a protected GitHub Environment named `pypi`.
2. In the PyPI `memorynode` project, add a trusted publisher with owner
   `unnoderes`, repository `MemoryNode`, workflow `sdk-release.yml`, and
   environment `pypi`.
3. Keep required reviewers on the `pypi` environment until several releases
   have completed successfully.

No long-lived PyPI token is required. The publish job receives a short-lived
OIDC credential and has no repository write permission.

## Prepare a release

1. Update `sdk/python/src/memorynode/_version.py`. It is the only runtime and
   build version source.
2. If dependencies changed, run `uv lock --project sdk/python` and commit the
   updated `sdk/python/uv.lock`.
3. Pin frontend direct dependencies. Any frontend dependency change must keep
   `frontend/package.json` and `frontend/package-lock.json` synchronized;
   `scripts/build_release.py` verifies this with `npm ci`.
4. Update human-facing release text where appropriate, including the public
   README and portal.
5. Run `python scripts/check_release_version.py`.
6. Merge the release preparation commit to `main` and wait for SDK CI to pass.
7. Tag that exact commit and push the tag:

   ```powershell
   git tag v0.8.0
   git push origin v0.8.0
   ```

The tag must exactly equal `v` plus the package version. `sdk-release.yml`
requires the tagged commit to belong to `main`, confirms that the exact version
does not already exist on PyPI, builds and tests one artifact set, verifies the
same wheel on Linux and Windows, publishes through trusted publishing, and only
then creates the matching GitHub Release with distributions and checksums.

PyPI versions are immutable. Do not move or reuse a release tag, enable
`skip-existing`, or retry a partially published version with different files.
If publication is defective, preserve the evidence and prepare a new version.
