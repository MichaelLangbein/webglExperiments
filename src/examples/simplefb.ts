import { rectangle, flattenMatrix, sumMatrix, triangle } from '../engine/engine.shapes';
import { clearBackground, bindBufferToAttribute, bindTextureToUniform, bindProgram, bindValueToUniform, createFramebuffer, bindOutputCanvasToFramebuffer, bindFramebuffer, createTexture, createShaderProgram, getUniformLocation, createFloatBuffer, getAttributeLocation, setup3dScene, createEmptyTexture, bindTextureToFramebuffer } from '../engine/webgl';
import { createTextCanvas } from '../engine/engine.helpers';
import { downloadBlob } from '../engine/utils/other';
const passVSS = require('../engine/shaders/passthrough.vert.glsl').default;
const passFSS = require('../engine/shaders/passthrough.frag.glsl').default;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const textImage = createTextCanvas('test', 256, 256, 'blue');



// 0. Setup
const gl = canvas.getContext('webgl');
setup3dScene(gl);
const bx = triangle(1., 1.);

const program = createShaderProgram(gl, passVSS, passFSS);
bindProgram(gl, program);

const coords = createFloatBuffer(gl, bx.vertices);
const coordsLoc = getAttributeLocation(gl, program, 'a_vertex');
bindBufferToAttribute(gl, coordsLoc, coords);

const texCoords = createFloatBuffer(gl, bx.texturePositions);
const texCoordsLoc = getAttributeLocation(gl, program, 'a_textureCoord');
bindBufferToAttribute(gl, texCoordsLoc, texCoords);

// 1.1. Bind source texture to shader's input-texture.
const boxTexture = createTexture(gl, textImage);
const srcTexLoc = getUniformLocation(gl, program, 'u_texture');
bindTextureToUniform(gl, boxTexture.texture, 1, srcTexLoc);

// 1.2. Catch output in framebuffer.
const fb = createFramebuffer(gl);
const fbTexture = createEmptyTexture(gl, canvas.width, canvas.height);
const fbo = bindTextureToFramebuffer(gl, fbTexture, fb);
bindFramebuffer(gl, fbo);

// 1.3. Render
clearBackground(gl, [.7, .7, .7, 1]);
gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);

// 1.4. Unbind framebuffer.
bindOutputCanvasToFramebuffer(gl);

// 2.0. Setup second pass

// 2.2. Bind intermediate texture to shader's input-texture.
bindTextureToUniform(gl, fbTexture.texture, 2, srcTexLoc);

// 2.3. Render
clearBackground(gl, [.4, .5, .7, 1]);
gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);


canvas.toBlob((blob: Blob) => {
    downloadBlob(blob, 'canvas_this_frame.png');
});


setTimeout(() => {
    canvas.toBlob((blob: Blob) => {
        downloadBlob(blob, 'canvas_next_frame.png');
    });
}, 0);
