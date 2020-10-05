# WebGl Experiments

This is just a simple repository of me experimenting with WebGl, engines, and linear algebra.

## TODOs
 - bindVertexArray: 
   - by uploading all of a models data in a vertex-array, we don't need to use that many bind-calls per model.
     Instead of one bind call per attribute per model, its just one bindVertexArray-call per model.
     Rewrite engine accordingly.