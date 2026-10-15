# ANS 3D showcase sources

The page comes from ANS PR #112, original head `b1bb26374d87cc84e4b9da2329b319bfa125a966`. Embedded React, Three and motion modules were extracted into same-origin files; retained source license headers are unchanged. Applicable upstream license texts are in `licenses/`; provenance and known version limits are recorded in `THIRD-PARTY-SOURCES.json`. Absence of a source map means the exact version of every compiled helper is not established, and is not claimed.

The user-owned person model is pinned to `1008611-creater/jianli-3d` commit `b99e67867192b8b3617465f4609fc057086d3973`, path `public/assets/models/me.bin` (GLB bytes despite its old extension). `MODEL-SOURCE.json` records original and packaged hashes. Geometry, textures and compressed binary data were preserved exactly; the original showcase focus/camera nodes and complete authored camera tracks were added. No image pixels were edited. This user-owned asset is not asserted to have a third-party open-source model license.

The dinosaur remains the existing ANS model `/mascot/3d/dinosaur.glb`; existing project provenance applies. No different mascot was substituted. The unused embedded font and markdown dependency were removed.

Runtime fixes remove the Request/fetch interception, use same-origin model paths, preserve pinch zoom, add a renderer error boundary and static navigation fallback, provide keyboard greeting and dialog focus management, and honor reduced motion. All introductory copy is an entry-point description; no timing, unsupported voice/model integration, fixed project-count or automatic-refund promises remain.
