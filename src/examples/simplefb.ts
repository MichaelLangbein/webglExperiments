import { rectangle, flattenMatrix, sumMatrix } from '../engine/engine.shapes';
import { clearBackground, bindBufferToAttribute, bindTextureToUniform, bindProgram, bindValueToUniform, createFramebuffer, bindOutputCanvasToFramebuffer, bindFramebuffer, createTexture, createShaderProgram, getUniformLocation, createFloatBuffer, getAttributeLocation, setup3dScene, createEmptyTexture, bindTextureToFramebuffer } from '../engine/webgl';
const passVSS = require('../engine/shaders/passthrough.vert.glsl').default;
const passFSS = require('../engine/shaders/passthrough.frag.glsl').default;
const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const boxImage = document.getElementById('boxTexture') as HTMLImageElement;
const letterImage = document.getElementById('letterTexture') as HTMLImageElement;



const main = () => {


    // 0. Setup
    const gl = canvas.getContext('webgl');
    setup3dScene(gl);
    const bx = rectangle(1., 1.);

    const program = createShaderProgram(gl, passVSS, passFSS);
    bindProgram(gl, program);

    const coords = createFloatBuffer(gl, bx.vertices);
    const coordsLoc = getAttributeLocation(gl, program, 'a_vertex');
    bindBufferToAttribute(gl, coordsLoc, coords);

    const texCoords = createFloatBuffer(gl, bx.texturePositions);
    const texCoordsLoc = getAttributeLocation(gl, program, 'a_textureCoord');
    bindBufferToAttribute(gl, texCoordsLoc, texCoords);

    // 1.1. Bind source texture to shader's input-texture.
    const boxTexture = createTexture(gl, letterImage);
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
};

setTimeout(main, 500);


