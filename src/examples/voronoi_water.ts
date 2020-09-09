import { Program, Shader, renderLoop, Attribute, Uniform, Framebuffer, Texture } from '../engine/engine.core';
import { rectangleA, triangleA, edgeDetectKernel } from '../engine/engine.shapes';
import { flattenMatrix } from '../engine/math';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('no context');
}

const program = new Program(gl, `
    attribute vec3 a_vertex;
    void main() {
        gl_Position = vec4(a_vertex.xyz, 1.);
    }
`, `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_size;

    vec2 random2(vec2 p) {
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
    }

    void main() {
        vec2 relCoord = gl_FragCoord.xy / u_size;

        // tiling the space
        float scale = 5.;
        vec2 tileIndex = floor(scale * relCoord);
        vec2 innerCoord = fract(scale * relCoord);

        float minDist = 100.;
        for (int y= -1; y <= 1; y++) {
            for (int x= -1; x <= 1; x++) {
                vec2 offset = vec2(float(x), float(y));
                vec2 centerPoint = random2(tileIndex + offset);
                centerPoint = 0.5 + 0.5*sin(u_time + 6.2831*centerPoint);
                float dist = distance(centerPoint + offset, innerCoord);
                minDist = min(dist, minDist);
            }
        }
        float d2 = minDist * minDist;
        gl_FragColor = vec4(0., 0.1, d2 + 0.2, 1.);
    }
`);

const tri = triangleA(1.6, 1.3);
const shader = new Shader(program, [
    new Attribute(gl, program, 'a_vertex', tri.vertices)
], [
    new Uniform(gl, program, 'u_size', 'vec2', [canvas.width, canvas.height]),
    new Uniform(gl, program, 'u_time', 'float', [0.])
], []);


const buffer = new Framebuffer(gl, canvas.width, canvas.height);

const program2 = new Program(gl, `
    attribute vec3 a_vertex;
    attribute vec3 a_textureCoord;
    varying vec2 v_textureCoord;

    void main() {
        v_textureCoord = vec2(a_textureCoord.xy);
        gl_Position = vec4(a_vertex.xyz, 1.);
    }
`, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_textureCoord;
    uniform vec2 u_size;
    uniform float u_kernel[9];

    void main() {
        vec2 relCoord = gl_FragCoord.xy / u_size;
        vec2 onePixel = 1. / u_size;

        float threshold = 0.8;

        float maxEdginess = 0.;
        int maxEdginessDistance = 0;
        for (int i = 1; i < 6; i++) {
            vec4 colorSum =
                texture2D(u_texture, v_textureCoord + onePixel * vec2(-1, -1) * float(i)) * u_kernel[0] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 0, -1) * float(i)) * u_kernel[1] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 1, -1) * float(i)) * u_kernel[2] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2(-1,  0) * float(i)) * u_kernel[3] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 0,  0) * float(i)) * u_kernel[4] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 1,  0) * float(i)) * u_kernel[5] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2(-1,  1) * float(i)) * u_kernel[6] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 0,  1) * float(i)) * u_kernel[7] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 1,  1) * float(i)) * u_kernel[8] ;

            float colorSumF = dot(colorSum, colorSum);
            if (colorSumF > maxEdginess) {
                maxEdginess = colorSumF;
                maxEdginessDistance = i;
            }
        }

        float edginess = 1. / float(maxEdginessDistance);
        gl_FragColor = edginess * vec4(.1, .1, .6, 1.) + (1. - edginess) * texture2D(u_texture, v_textureCoord);
    }
`);

const rect = rectangleA(2., 2.);
const shader2 = new Shader(program2, [
    new Attribute(gl, program2, 'a_vertex', rect.vertices),
    new Attribute(gl, program2, 'a_textureCoord', rect.texturePositions)
], [
    new Uniform(gl, program2, 'u_size', 'vec2', [canvas.width, canvas.height]),
    new Uniform(gl, program2, 'u_kernel', 'float[]', flattenMatrix(edgeDetectKernel()))
], [
    new Texture(gl, program2, 'u_texture', buffer.fbo.texture, 0)
]);



let t = 0.;
renderLoop(10, (tDelta: number) => {
    t += tDelta;
    shader.updateUniformData(gl, 'u_time', [t]);
    shader.bind(gl);
    shader.render(gl, [.9, .9, .9, 1.], buffer.fbo);
    shader2.bind(gl);
    shader2.render(gl, [.9, .9, .9, 1.]);
});