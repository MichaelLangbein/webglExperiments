 # WEBGL

 A rasterization engine that allows to draw points, line segments, or triangles.

 Vertex shaders take whatever coordinates you use and return a 3-d array with elements between -1 and 1.
 Basically, this is a 3d-array, but WebGl does not use the z-axis for real perspective, but only to differentiate
 what pixel lies in front of another.
 This is not like looking in a 3d-box, but rather like looking on multiple stacked sheets on a projector.
 Actually, this is a lie. WebGl uses 4 coordinates: x, y, z and w. The above only holds if you keep w at 1.
 After applying the vertex shader, WebGl divides all coordinates by w, yielding (x/w, y/w, z/w, 1).
 This can be used to calculate projections - google for 'homogeneous coordinates' to find out more.
 Compare this [site](https://www.tomdalling.com/blog/modern-opengl/explaining-homogenous-coordinates-and-projective-geometry/)
 and the shader `basic3d.vert.glsl`.

 ### WebGL knows two data structures:
  - buffers (generic byte arrays): usually positions, normals, texture-coordinates, vertex-colors etc.
    buffers are accessed in shaders as 'attributes'.
    note that buffers contain one entry for each vertex.
  - textures (bitmap images).

 ### Shaders use these data structures in two different ways.
  - Attributes are values, one per vertex.
    For the shader, attributes are read-only.
    Attributes default to [0, 0, 0, 1]
  - Uniforms are values, one per shader.
    For the shader, uniforms are read-only.

 ### Apart from this, shaders know about two more types of data:
  - Varyings are values that are passed from vertex-shader to fragment-shader.
    They are read-only only for the fragment-shader.
  - Const: a compile-time constant.

 A program is just a list of compiled and linked vertex- and fragment-shaders.


 Drawing: there's drawArrays and drawElements.
  - drawArrays is the robust all-rounder.
  - drawElements can be more performant if you share vertices between objects.


## Performance 
 Rendering data is fast, but uploading it into GPU memory is slow.
 Optimizing WebGl performance mostly means: Avoiding having GPU and CPU wait for each other.
 The more the GPU can do in bulk, the better. The more often you have to upload data from CPU to GPU, the worse.
  - So avoid switching programs, buffers and uniforms if you can.
    (You won't be able to avoid switching buffers, because every object is likely different. But sort your objects by their shaders, and you'll save a lot of time.)
  - Try to do translations, rotations and shears inside the vertex-shader instead of altering the object's buffer.
  - If appropriate, create über-shaders and über-buffers, that contain information for more than just one object.

 There is another thing that affects performance:
 WebGL will only run fragment-shaders when the object's pixels aren't already obscured by a larger object in front of it.
 That means it makes sense to first draw large objects that are close to the camera - all objects behind them won't need their fragment-shader executed.

 All `create*` functions unbind variables after setting their values. This is to avoid unwanted side-effects.



 ## WebGL internal components
  - global-state
      - `ARRAY_BUFFER_BINDING`: currently bound buffer
      - `VERTEX_ARRAY_BINDING`: currently bound vertex-array (in WebGL 1 this was always only the global vertex-array, in WebGL 2 you can now create your own ones)
      - `ACTIVE_TEXTURE`: currently bound texture
      - texture-units: a list of pointers to texture-buffers.
      - uniform-buffer-bindings (WebGL2 only): a list of pointers to uniform-buffers.
  - vertex-array: a list of pointers to attribute-buffers (+ metadata like datatype, stride, offset etc.).
      - all attributes must have the same number of elements (though one attribute's elements may be vec2's, while another one's may be vec3's)
      - drawArray: attributes repeat elements in groups of three for drawing triangles
      - drawElements: the indices for the triangles are defined in ELEMENT_ARRAY_BUFFER_BINDING
      - WebGL 2.0: allows you to create your own vertex-arrays, whereas 1.0 always only used one global vertex-array.


## GLSL

### Important variables/functions and their parameter ranges:
  - `gl_Position`: *clippingSpace* aka. *normalized device coordinates*: [-1, 1]^4
  - `gl_FragCoord`: *windowSpace* aka. *viewportSpace*: [0, w]*[0, h]*z*w
  - `gl_FragColor(r, g, b, a)`: r, g, b, a are each in [0, 1]
  - `gl_texture2D(texture, vec2(w, h))`:
      - w, h in [0, 1]. The point [0, 0] is the top-left of the texture. (Note, however, that there is a 'flipping' option.)
      - returns [0, 1]^4
      - inputting data to texture:
             - tex<ubyte4>: [0, 255]*W*H
             - tex<float4>: [10^-38, 10^38]*W*H


## Dimensions

 1. Webgl transforms the clipping-space [-1, 1]^4 to viewport-size
 2. This viewport has an offset relative to the top-left of the canvas-size
 3. The canvas-size is stretched into the canvas-clientSize
Your viewport should match the drawing-buffer-size.
Then the canvas should be matched to the viewport.
Then the canvas-css should be matched to the canvas.

+---------------------------------------------------------+
|                                                         |
|                   viewport.x0                           |
|                      +-----------------------------------------------+
|        viewport.y0   |                                  |            |
|                      |                                  |            |
|                      |                                  |            |
|                      |                                  |            |
|                      |                                  |            |
|                      |                                  |            |
|                      |                                  |            |
|                      |                                  |            |
|                      |                                  |            |
|                      |                                  |            | viewport.height
|                      +-----------------------------------------------+
|                                                         |
|                                                         |        viewport.width
|                                                         |
|                                                         |
|                                                         |
|                                                         | canvas.height
+---------------------------------------------------------+
                                                       canvas.width




After CSS-stretching:
 +---------------------------------------------------------------------------+
 |                                                                           |
 |                         +-------------------------------------------------+
 |                         |                                                 |
 |                         |                                                 |
 |                         |                                                 |
 |                         +-------------------------------------------------+
 |                                                                           |
 |                                                                           |
 |                                                                           |  canvas.clientHeight
 +---------------------------------------------------------------------------+
                                                                      canvas.clientWidth
