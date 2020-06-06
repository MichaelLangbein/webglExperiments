import { box, rectangle, flattenMatrix, edgeDetectKernel, gaussianKernel, embossKernel, sumMatrix, normalKernel } from '../engine/engine.shapes';
import { clearBackground, bindBufferToAttribute, bindTextureToUniform, bindProgram, bindValueToUniform, createFramebuffer, bindOutputCanvasToFramebuffer, bindFramebuffer, createTexture, createShaderProgram, getUniformLocation, createFloatBuffer, getAttributeLocation, bindTextureToFramebuffer, createFramebufferWithEmptyTexture, setup3dScene } from '../engine/webgl';
import { displayImageOn } from '../engine/engine.helpers';
const basic3dVertexShaderSource = require('../engine/shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('../engine/shaders/basic3d.frag.glsl').default;
const convVSS = require('../engine/shaders/conv.vert.glsl').default;
const convFSS = require('../engine/shaders/conv.frag.glsl').default;
const passVSS = require('../engine/shaders/passthrough.vert.glsl').default;
const passFSS = require('../engine/shaders/passthrough.frag.glsl').default;
const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const helperCanvas = document.getElementById('helperCanvas') as HTMLCanvasElement;
const letterImage = document.getElementById('letterTexture') as HTMLImageElement;
const boxImage = document.getElementById('boxTexture') as HTMLImageElement;
// const whiteImage1 = document.getElementById('whiteImage') as HTMLImageElement;
// const whiteImage2 = document.getElementById('whiteImage') as HTMLImageElement;


/**
 * From https://community.khronos.org/t/how-can-i-use-the-texture-in-the-framebuffer-as-the-new-texture/76866/5
 */


const main = () => {


    // 0. Setup
    const gl = canvas.getContext('webgl');
    setup3dScene(gl);
    const bx = rectangle(.9, .9);

    const convProgram = createShaderProgram(gl, convVSS, convFSS);
    bindProgram(gl, convProgram);

    const coords = createFloatBuffer(gl, bx.vertices);
    const coordsLoc = getAttributeLocation(gl, convProgram, 'a_vertex');
    bindBufferToAttribute(gl, coordsLoc, coords);

    const texCoords = createFloatBuffer(gl, bx.texturePositions);
    const texCoordsLoc = getAttributeLocation(gl, convProgram, 'a_textureCoord');
    bindBufferToAttribute(gl, texCoordsLoc, texCoords);

    const texSize = [boxImage.naturalWidth, boxImage.naturalHeight];
    const texSizeLoc = getUniformLocation(gl, convProgram, 'u_textureSize');
    bindValueToUniform(gl, texSizeLoc, '2f', texSize);

    const kernel = edgeDetectKernel();
    const kernelLoc = getUniformLocation(gl, convProgram, 'u_kernel[0]');
    bindValueToUniform(gl, kernelLoc, '1fv', flattenMatrix(kernel));

    const kernelWeight = sumMatrix(kernel);
    const kernelWeightLoc = getUniformLocation(gl, convProgram, 'u_kernelWeight');
    bindValueToUniform(gl, kernelWeightLoc, '1f', [kernelWeight]);


    // 1.1. Bind source texture to shader's input-texture.
    const boxTexture = createTexture(gl, boxImage);
    const srcTexLoc = getUniformLocation(gl, convProgram, 'u_texture');
    bindTextureToUniform(gl, boxTexture.texture, 0, srcTexLoc);

    // 1.2. Bind intermediate texture to framebuffer.
    const fb1 = createFramebufferWithEmptyTexture(gl, boxImage.naturalWidth, boxImage.naturalHeight);
    bindFramebuffer(gl, fb1);

    // 1.3. Render (edge detect)
    clearBackground(gl, [.7, .7, .7, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);

    // 1.4. Unbind framebuffer.
    bindOutputCanvasToFramebuffer(gl);


    // 2.0. Setup second pass
    const passProgram = createShaderProgram(gl, passVSS, passFSS);
    bindProgram(gl, passProgram);

    const bx2 = rectangle(.95, .95);

    const coords2 = createFloatBuffer(gl, bx2.vertices);
    const coordsLoc2 = getAttributeLocation(gl, passProgram, 'a_vertex');
    bindBufferToAttribute(gl, coordsLoc2, coords2);

    const texCoords2 = createFloatBuffer(gl, bx2.texturePositions);
    const texCoordsLoc2 = getAttributeLocation(gl, passProgram, 'a_textureCoord');
    bindBufferToAttribute(gl, texCoordsLoc2, texCoords2);

    // 2.2. Bind intermediate texture to shader's input-texture.
    const srcTexLoc2 = getUniformLocation(gl, passProgram, 'u_texture');
    bindTextureToUniform(gl, fb1.texture.texture, 1, srcTexLoc2);

    // 2.3. Render
    clearBackground(gl, [.4, .5, .7, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, bx2.vertices.length);
};

setTimeout(main, 500);


