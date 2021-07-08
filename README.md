# WebGl Experiments

This is just a simple repository of me experimenting with WebGl, engines, and linear algebra.

## Optimizations: 

  - drawElements: Saves on vertices.
  - Context: wraps around WebGL2RenderingContext, maintains state. Saves on upload- and bind-calls.
  - VertexArrays: binding all attributes of a Bundle with a single call. Saves on bind-calls.
  - InstancedDrawing: loops over one attribute-array multiple times. Saves on draw-calls.
  - Sorting objects before passing to engine: reduces context-switches; saves on upload- and bind-calls.


## TODOs:

  - DataObjects: update hash when data changes?
  - Textures: allow to update and instantiate with number[][][]
  - polygons:
    - handle multipolygons
  - DataObjects: 
    - when same data, in form of an attribute, is part of two Bundles, the Context mistakenly doesn't upload data the second time.
    - I've for now solved this with a randomized hash for attributes, but now the hash is no longer idempotent. Is that a problem?
      - better: integrate variableName & variableType into hash.
