# CO3D reconstruction comparison

[**Open the interactive comparison →**](https://smileyenot983.github.io/feedforward_comparison/)

A standalone static comparison of Pi3X, Depth Anything 3, Pow3R, MapAnything and
VGGT-Omega on 20 CO3D scenes with 10 views per scene. Includes synchronized WebGL
pointclouds, scene thumbnails, shareable selections and saved
metrics grouped by evaluation protocol. All 11 variants, including RGB-only and
GGPT results, are available directly in the main method selectors. All metric
rows appear in one visible table, grouped by scoring settings.

This is an exploratory saved experiment, not an official benchmark. Primary
Pi3X, DA3, MapAnything and Pow3R received CO3D camera inputs. VGGT-Omega received
RGB only. Its two cloud variants use CO3D or predicted cameras after inference.
The page explains these differences and the evaluation masks explicitly.

## Preview locally

From this directory:

```sh
python3 -m http.server 8001 --bind 127.0.0.1
```

Open <http://localhost:8001/>. Serve over HTTP; the landing page loads
`gallery.json` using fetch. No build, packages, inference server or model weights
are required. All runtime assets live inside this directory; it can be moved
independently of the training repository and `local_output/`.

For SSH access, run the server on the remote host, and on your own computer:

```sh
ssh -N -L 8001:127.0.0.1:8001 r.khafizov@YOUR_SERVER
```

## Publish to GitHub Pages

Use this directory's contents as the root of a separate public repository.
In that repository's **Settings → Pages**, choose **Deploy from a branch**,
then select **main** and **/ (root)** and save. The included `.nojekyll` file
keeps this a plain static site. No GitHub Actions workflow is necessary.

The page supports a project URL such as
`https://USERNAME.github.io/REPOSITORY/`; paths are relative to the site root.
Only publish this export, not the parent comparison folder, which contains
historical experiments and exceeds the Pages size limit.

## Contents and provenance

- `index.html`, `styles.css`, `app.js`: public landing page and navigation.
- `viewer.css`, `viewer-controls.js`: embedding and controls around the existing
  synchronized renderer.
- `CATEGORY/SEQUENCE/viewer.html`: saved renderer and original embedded geometry.
- `CATEGORY/SEQUENCE/previews/`: original preview PNGs, including extra variants.
- `CATEGORY/SEQUENCE/metadata.json`: scene display metadata and saved metrics.
- `gallery.json`: scene list and unchanged aggregate metrics.
- `metrics.json`: original per-scene and aggregate measurements.
- `provenance.json`: original viewer and geometry-payload SHA-256 checksums.

No predictions or evaluation scores were recomputed for this export. Embedded
pointcloud payloads and preview pixels are unchanged. This page does not present
the later 30-view preparation/filtering experiment. Original private galleries
and experiment files remain separate.

Dataset: [Common Objects in 3D (CO3D)](https://github.com/facebookresearch/co3d).
Official model repositories are linked from the page. Existing dataset and
method attributions apply to the included results.
