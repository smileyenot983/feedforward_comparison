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

## Evaluation

This is the original 20-scene, 10-view experiment. It does not present the later
30-view preparation/filtering results or constitute an official benchmark.

### Camera inputs and placement

`[CO3D cameras]` means the model received images plus the supplied CO3D camera
positions, orientations and calibration. `[RGB only]` means inference received
images alone. Images-only MapAnything and Pi3X predict cameras; CO3D cameras are
used afterward for similarity alignment and evaluation.

Both VGGT-Omega variants reuse one RGB-only prediction. One cloud places its
predicted depths using supplied CO3D cameras; the other uses predicted cameras.
Camera placement is listed separately in their names.

GGPT refines Pi3X with matching and camera optimization, retaining corrected
world XYZ. Its camera-conditioned, RGB-only and fast-matcher variants use
separate retained-pixel intersections.

### Metrics and aggregation

- **Object / background disagreement:** relative cross-view depth disagreement,
  including occluded points. Consistent views can still have incorrect geometry.
- **Object depth error:** relative difference
  `|prediction - reference| / reference` on valid foreground CO3D depth pixels.
  CO3D's COLMAP reference depths can contain errors.
- **Aggregation:** scene-balanced median of per-scene medians. Reference-depth
  error uses frame medians within each scene. Unscorable scenes are omitted.
- **Runtime / GPU memory:** saved inference time and peak allocated GPU memory.
  Grids and execution paths differ. GGPT time includes Pi3X, matching, camera
  optimization and refinement.
- **Missing values:** `—` means unavailable or not applicable. The sparse CO3D
  baseline has no self-comparison error or inference timing.

Object means foreground; background is the rest of the image. The original
CO3D baseline has object scores for 20 scenes and background scores for 18.
Per-row scene counts, inputs and camera sources remain in `metrics.json`.

### Scoring groups

Scores across these groups use different evaluation pixels and are not directly
comparable.

| Group | Evaluation pixels |
| --- | --- |
| Shared scoring pixels | Common 512 grid and intersection of the five primary model masks; six configurations with different camera inputs. |
| MapAnything [RGB only] | Native grid and its own retained mask. |
| Pi3X [RGB only] | Native grid; retained intersection with conditioned MapAnything / DA3 masks. |
| Pi3X + GGPT [CO3D cameras] | Native XYZ rasterization and a three-variant common raster mask. |
| Pi3X + GGPT [RGB only] | Native XYZ rasterization and its own three-variant common raster mask. |
| Pi3X + GGPT (fast) [RGB only] | RoMaV2-fast; native XYZ rasterization and its own three-variant raster mask. |
| Original CO3D reference | Sparse original depths with their own validity mask. |

### Pointcloud display

Clouds combine all selected views without surface fusion or smoothing. Each
scene uses a shared display transform, scale and viewpoint across methods.
Object-only display hides background points; each model retains its saved
geometry-validity mask.

Display points were sampled at stride 3 and capped at 60,000 foreground and
20,000 background points per method. These samples are separate from scoring
pixels. Use **Fit scene** to inspect distant points.

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
