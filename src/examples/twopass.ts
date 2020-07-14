import { box, rectangle, flattenMatrix, edgeDetectKernel, gaussianKernel, embossKernel, sumMatrix, normalKernel } from '../engine/engine.shapes';
import { clearBackground, bindBufferToAttribute, bindTextureToUniform, bindProgram, bindValueToUniform, createFramebuffer, bindOutputCanvasToFramebuffer, bindFramebuffer, createTexture, createShaderProgram, getUniformLocation, createFloatBuffer, getAttributeLocation, bindTextureToFramebuffer } from '../engine/webgl';
import { displayImageOn } from '../engine/engine.helpers';
const basic3dVertexShaderSource = require('./shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('./shaders/basic3d.frag.glsl').default;
const convVSS = require('./shaders/conv.vert.glsl').default;
const convFSS = require('./shaders/conv.frag.glsl').default;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const helperCanvas = document.getElementById('helperCanvas') as HTMLCanvasElement;
const letterImage = document.getElementById('letterTexture') as HTMLImageElement;
const boxImage = document.getElementById('boxTexture') as HTMLImageElement;
const whiteImage1 = document.getElementById('whiteImage') as HTMLImageElement;
const whiteImage2 = document.getElementById('whiteImage') as HTMLImageElement;


/**
 * From https://community.khronos.org/t/how-can-i-use-the-texture-in-the-framebuffer-as-the-new-texture/76866/5
 * To apply a two-pass process to a texture, the procedure is basically:

    1. Bind source texture to a texture unit.
        1.1 Use first-pass program, set sampler uniform to texture unit.
    2. Bind intermediate texture to framebuffer.
    3. Render a quad.
    4. Bind intermediate texture to a texture unit.
    5. Bind destination texture to framebuffer.
    6. Use second-pass program, set sampler uniform to texture unit.
    7. Render a quad.

    If you want to display the final texture in the window, you then need:

    - Unbind framebuffer.
    - Bind destination texture to a texture unit.
    - Use display program, set sampler uniform to texture unit.
    - Render a quad.
 *
 */


const main = () => {

    const gl = canvas.getContext('webgl');
    if (!gl) {
        throw new Error('no context');
    }
    const program = createShaderProgram(gl, convVSS, convFSS);
    bindProgram(gl, program);

    // 1.1. Bind source texture to a texture unit
    const boxTexture = createTexture(gl, boxImage);
    const srcTexLoc = getUniformLocation(gl, program, 'u_sourceTexture');
    bindTextureToUniform(gl, boxTexture.texture, 0, srcTexLoc);
    displayImageOn(helperCanvas, boxImage);

    // 1.2. Bind intermediate texture to framebuffer.
    const intermedTex = createTexture(gl, whiteImage1);
    const fb = createFramebuffer(gl);
    const fbo = bindTextureToFramebuffer(gl, intermedTex, fb);
    bindFramebuffer(gl, fbo);

    // 1.3. Render (edge detect)
    const bx = rectangle(.9, .9);

    const coords = createFloatBuffer(gl, bx.vertices);
    const coordsLoc = getAttributeLocation(gl, program, 'a_coord');
    bindBufferToAttribute(gl, coordsLoc, coords);

    const texCoords = createFloatBuffer(gl, bx.texturePositions);
    const texCoordsLoc = getAttributeLocation(gl, program, 'a_textureCoord');
    bindBufferToAttribute(gl, texCoordsLoc, texCoords);

    const texSize = [boxImage.naturalWidth, boxImage.naturalHeight];
    const texSizeLoc = getUniformLocation(gl, program, 'u_textureSize');
    bindValueToUniform(gl, texSizeLoc, '2f', texSize);

    const kernel = edgeDetectKernel();
    const kernelLoc = getUniformLocation(gl, program, 'u_kernel[0]');
    bindValueToUniform(gl, kernelLoc, '1fv', flattenMatrix(kernel));

    const kernelWeight = sumMatrix(kernel);
    const kernelWeightLoc = getUniformLocation(gl, program, 'u_kernelWeight');
    bindValueToUniform(gl, kernelWeightLoc, '1f', [kernelWeight]);

    clearBackground(gl, [.7, .7, .7, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);

    // 2.1. Bind intermediate texture to input-texture-location.
    bindTextureToUniform(gl, intermedTex.texture, 0, srcTexLoc);

    // 2.2. Bind destination texture to framebuffer.
    const destTex = createTexture(gl, whiteImage2);
    const fbo2 = bindTextureToFramebuffer(gl, destTex, fb);
    bindFramebuffer(gl, fbo2);

    // 2.3. Render
    bindValueToUniform(gl, texSizeLoc, '2f', [whiteImage1.naturalWidth, whiteImage1.naturalHeight]);

    const kernel2 = embossKernel();
    bindValueToUniform(gl, kernelLoc, '1fv', flattenMatrix(kernel2));

    bindValueToUniform(gl, kernelWeightLoc, '1f', [sumMatrix(kernel2)]);

    clearBackground(gl, [.7, .7, .7, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);


    // 3.1. Unbind framebuffer.
    bindOutputCanvasToFramebuffer(gl);

    // 3.2. Bind destination texture to a texture unit.
    bindTextureToUniform(gl, destTex.texture, 0, srcTexLoc);

    // 3.3. Render
    bindValueToUniform(gl, texSizeLoc, '2f', [whiteImage2.naturalWidth, whiteImage2.naturalHeight]);

    const kernel3 = normalKernel();
    bindValueToUniform(gl, kernelLoc, '1fv', flattenMatrix(kernel3));

    bindValueToUniform(gl, kernelWeightLoc, '1f', [sumMatrix(kernel3)]);

    clearBackground(gl, [.7, .7, .7, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);
};

setTimeout(main, 500);


