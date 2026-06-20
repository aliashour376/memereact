# MemeReact Versioning

This project uses Git branches for active work and Git tags for saved releases.

## Current Version Markers

- `v1.0.0` is the previous stable release.
- `v2.0.0` is the stable reaction-clip and pose-guide release.
- `master` is the production branch deployed to GitHub Pages.

## Release Rules

- Commit often while working on `v2`.
- Do not create a tag every time the app is tested or run.
- Create tags only for meaningful checkpoints that should be easy to return to.
- Use prerelease tags for test releases before a stable version:
  - `v2.0.0-alpha.1`
  - `v2.0.0-beta.1`
  - `v2.0.0-rc.1`
- Use `v2.0.0` when the first stable v2 release is ready.
- Use `v2.0.1` for a small bug fix after `v2.0.0`.
- Use `v2.1.0` for a new backward-compatible feature after `v2.0.0`.
- Use `v3.0.0` for a major redesign or incompatible change.

## Common Commands

Save a stable release:

```powershell
git -C C:\Users\aasho\projects\memereact tag -a v2.0.0 -m "MemeReact v2.0.0"
git -C C:\Users\aasho\projects\memereact push origin v2.0.0
```

Return to the saved v1 code without changing branches:

```powershell
git -C C:\Users\aasho\projects\memereact switch --detach v1.0.0
```

Start a new branch from v1:

```powershell
git -C C:\Users\aasho\projects\memereact switch -c fix-v1 v1.0.0
```

Return to v2 work:

```powershell
git -C C:\Users\aasho\projects\memereact switch v2
```
