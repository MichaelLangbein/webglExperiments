import { Program, Shader, renderLoop, Framebuffer, Attribute, Uniform, Texture } from '../engine/engine.core';
import { rectangle, flattenMatrix } from '../engine/engine.shapes';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');

const rect = rectangle(2.0, 2.0);



// --------- Step 1: interpolating field between datapoints. ------------------------------------------

const interpolProgram = new Program(gl, `
    attribute vec4 a_observation;
    varying vec2 v_value;

    void main() {
        v_value = (a_observation.zw / 2.0) + 0.5;
        gl_Position = vec4(a_observation.xy, 0.0, 1.0);
    }
`, `
    precision mediump float;
    varying vec2 v_value;

    void main() {
        gl_FragColor = vec4(v_value.xy, 0.0, 1.0);
    }
`);

const interpolShader = new Shader(interpolProgram, [
    new Attribute(gl, interpolProgram, 'a_observation', [
        // locx, locy,   valx, valy
        [-0.4,   0.8,    0.1,  0.1 ],  // a
        [-0.6,  -0.2,    0.4,  0.5 ],  // b
        [ 0.2,   0.4,    0.2,  0.05],  // c

        [ 0.2,   0.4,    0.2,  0.05],  // c
        [-0.6,  -0.2,    0.4,  0.5 ],  // b
        [ 0.8,  -0.2,    0.3, -0.2 ],  // d

        [ 0.8,  -0.2,    0.3, -0.2 ],  // d
        [-0.6,  -0.2,    0.4,  0.5 ],  // b
        [-0.1,  -0.8,    0.5, -0.1 ],  // e
    ])
], [], []);

const interpolFb = new Framebuffer(gl, canvas.width, canvas.height);



// -------------- Step 2: Start-positions of particles ------------------------------------------------

const startParticleProgram = new Program(gl, `
    attribute vec2 a_vertex;
    void main() {
        gl_Position = vec4(a_vertex.xy, 0.0, 1.0);
        gl_PointSize = 10.0;
    }
`, `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`);

const startParticleShader = new Shader(startParticleProgram, [
    new Attribute(gl, startParticleProgram, 'a_vertex', [
        [-0.25, 0.25], [-0.25, -0.25], [0.25, -0.25], [0.25, 0.25]
    ], gl.POINTS)
], [], []);

const particleFb1 = new Framebuffer(gl, canvas.width, canvas.height);
const particleFb2 = new Framebuffer(gl, canvas.width, canvas.height);



// ------------------ Step 3: moving particles along force field ------------------------------------

const particleProgram = new Program(gl, `
    attribute vec3 a_vertex;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;
    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertex.xyz, 1.0);
    }
`, `
    precision mediump float;
    uniform sampler2D u_forceTexture;
    uniform sampler2D u_particleTexture;
    uniform float u_deltaT;
    varying vec2 v_textureCoord;

    void main() {
        vec2 speed = ((texture2D(u_forceTexture, v_textureCoord) - 0.5 ) * 2.0).xy;
        vec2 samplePoint = v_textureCoord - speed * u_deltaT * 0.1;
        samplePoint = mod(samplePoint, 1.0);
        gl_FragColor = texture2D(u_particleTexture, samplePoint);
    }
`);

const particleShader = new Shader(particleProgram, [
    new Attribute(gl, particleProgram, 'a_vertex', rect.vertices),
    new Attribute(gl, particleProgram, 'a_textureCoord', rect.texturePositions)
], [
    new Uniform(gl, particleProgram, 'u_deltaT', '1f', [0.01])
], [
    new Texture(gl, particleProgram, 'u_forceTexture', interpolFb.fbo.texture, 0),
    new Texture(gl, particleProgram, 'u_particleTexture', particleFb1.fbo.texture, 1)
]);




// ------------------ Step 4: Mixing background-field and particles ------------------------------------

const textureMixProgram = new Program(gl, `
    attribute vec3 a_vertex;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;
    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertex.xyz, 1.0);
    }
`, `
    precision mediump float;
    uniform sampler2D u_bgTexture;
    uniform sampler2D u_particleTexture;
    varying vec2 v_textureCoord;
    void main() {
        vec4 bgColor = texture2D(u_bgTexture, v_textureCoord);
        vec4 particleColor = texture2D(u_particleTexture, v_textureCoord);
        vec3 colorMix = max(particleColor.xyz, bgColor.xyz);
        gl_FragColor = vec4(colorMix.xyz, 1.0);
    }
`);
const textureMixShader = new Shader(textureMixProgram, [
    new Attribute(gl, textureMixProgram, 'a_vertex', rect.vertices),
    new Attribute(gl, textureMixProgram, 'a_textureCoord', rect.texturePositions)
], [], [
    new Texture(gl, textureMixProgram, 'u_bgTexture', interpolFb.fbo.texture, 0),
    new Texture(gl, textureMixProgram, 'u_particleTexture', particleFb1.fbo.texture, 1)
]);






// Setup
interpolShader.bind(gl);
interpolShader.render(gl, null, interpolFb.fbo);
startParticleShader.bind(gl);
startParticleShader.render(gl, null, particleFb1.fbo);
textureMixShader.bind(gl);
textureMixShader.render(gl);


// Animation loop
let i = 0;
let fbIn;
let fbOut;
renderLoop(20, (deltaT: number) => {
    i += 1;

    // framebuffer ping-pong
    if (i % 2 === 1) {
        fbIn = particleFb1;
        fbOut = particleFb2;
    } else {
        fbIn = particleFb2;
        fbOut = particleFb1;
    }

    // particle shader
    particleShader.textures[1].texture = fbIn.fbo.texture;
    particleShader.updateUniformData(gl, 'u_deltaT', [deltaT]);
    particleShader.bind(gl);
    particleShader.render(gl, null, fbOut.fbo);

    // texture to output
    textureMixShader.textures[1].texture = fbOut.fbo.texture;
    textureMixShader.bind(gl);
    textureMixShader.render(gl);
});