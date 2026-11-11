# Versioning and release checklist


- Bug fixes and minor changes: bump patch (`0.0.x`).
- New features: bump minor (`0.x.0`).
- Breaking changes: bump major (`x.0.0`).
- Version number must be consistent across all project manifests/config files.

## Release checklist

1. Confirm the full quality gate passes (`CLAUDE.md`).
2. Bump the version in `package.json`, `manifest.json` and `versions.json`.
3. Write `releases/vX.Y.Z.md` (version, date; features, changed behaviour,
   fixes; breaking changes; stories and issues; test count) and a line in
   `releases/RELEASES.md`.
4. Commit, tag `x.y.z`, push, publish the GitHub release with `main.js`,
   `manifest.json`, `styles.css` (Obsidian's required assets).
   Never without the owner's word (rule 14).
