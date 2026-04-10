# Jody Rutter Portfolio

Static portfolio website for Jody Rutter, built to be hosted on GitHub Pages.

## Local preview

From this folder, run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Photography generation

The drone gallery uses resized copies stored inside the repo, while the originals remain untouched
in `E:\Drone`.

To rebuild the gallery and manifest:

```powershell
.\scripts\generate-photography.ps1
```

## Repository recommendation

If you want this to be your main GitHub Pages site, create the repository as:

```text
jodyrutter.github.io
```

That gives you the cleanest public URL:

```text
https://jodyrutter.github.io
```

## Deploy steps

1. Create the GitHub repository.
2. Initialize this folder as a git repository if needed.
3. Commit and push the contents to the `main` branch.
4. In GitHub, open `Settings` > `Pages`.
5. Under `Build and deployment`, choose `Deploy from a branch`.
6. Select the `main` branch and the `/(root)` folder.
7. Wait a few minutes for the site to publish.

## Notes

- `.nojekyll` is included so GitHub Pages serves the site directly as static files.
- All asset links are relative, so the site can also work from a project-style Pages repo if you choose a different repository name.
