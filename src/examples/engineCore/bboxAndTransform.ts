import { Shader, Program, Framebuffer, Attribute, Uniform, Texture } from '../../engine/engine.core';
import { getCurrentFramebuffersPixels } from '../../engine/webgl';
import { rectangleA } from '../../engine/engine.shapes';
import { flattenRecursive } from '../../engine/math';



const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('no context');
}


const calcBbox = (dataPoints: number[][]): number[] => {
    const xs = dataPoints.map(p => p[0]);
    const ys = dataPoints.map(p => p[1]);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    return [xMin, yMin, xMax, yMax];
};

const dataPoints = [
    [6.591796875,       51.15178610143037,      Math.random() * 10],
    [7.9541015625,      51.944264879028765,     Math.random() * 10],
    [10.634765625,      50.792047064406866,     Math.random() * 10],
    [12.6123046875,     51.86292391360244,      Math.random() * 10],
    [12.568359375,      47.989921667414194,     Math.random() * 10],
    [8.61328125,        49.468124067331644,     Math.random() * 10],
    [10.8544921875,     49.66762782262194,      Math.random() * 10],
    [8.3056640625,      50.261253827584724,     Math.random() * 10],
    [5.756835937499999, 49.5822260446217,       Math.random() * 10]
];

const bbox = calcBbox(dataPoints);

const transformationMatrix = [
    [.5, 0, 0, 0],
    [0, .5, 0, 0],
    [0, 0, .5, 0],
    [.6, -.3, 0, 1]
];







const fb = new Framebuffer(gl, canvas.width, canvas.height);

const rasterizerProgram = new Program(gl, `
    precision mediump float;
    attribute vec3 a_datapoint;
    uniform vec4 u_bbox;
    varying float v_value;

    vec2 worldCoords2clipBbx(vec2 point, vec4 bbox) {
        float xPerct = (point.x - bbox.x) / (bbox.z - bbox.x);
        float yPerct = (point.y - bbox.y) / (bbox.w - bbox.y);
        float xClip = 2.0 * xPerct - 1.0;
        float yClip = 2.0 * yPerct - 1.0;
        return vec2(xClip, yClip);
    }

    void main() {
        v_value = a_datapoint.z;
        vec2 pos = worldCoords2clipBbx(a_datapoint.xy, u_bbox);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
    }
`, `
    precision mediump float;
    varying float v_value;

    void main() {
        gl_FragColor = vec4(v_value / 10.0, 0.0, 0.0, 1.0);
    }
`);
const rasterizerShader = new Shader(rasterizerProgram, [
    new Attribute(gl, rasterizerProgram, 'a_datapoint', dataPoints)
], [
    new Uniform(gl, rasterizerProgram, 'u_bbox', 'vec4', bbox)
], []);

const arrangerProgram = new Program(gl, `
    precision mediump float;
    attribute vec3 a_pos;
    attribute vec2 a_texPos;
    uniform mat4 u_transformation;
    varying vec2 v_texPos;

    void main() {
        vec4 newPos = u_transformation * vec4(a_pos.xyz, 1.0);
        v_texPos = a_texPos;
        gl_Position = newPos;
    }
`, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texPos;

    void main() {
        gl_FragColor = texture2D(u_texture, v_texPos);
    }
`);
const arrangerShader = new Shader(arrangerProgram, [
    new Attribute(gl, arrangerProgram, 'a_pos', rectangleA(2, 2).vertices),
    new Attribute(gl, arrangerProgram, 'a_texPos', rectangleA(2, 2).texturePositions),
], [
    new Uniform(gl, arrangerProgram, 'u_transformation', 'mat4', flattenRecursive(transformationMatrix))
], [
    new Texture(gl, arrangerProgram, 'u_texture', fb.fbo.texture, 0)
]);


rasterizerShader.bind(gl);
rasterizerShader.render(gl, [0, 0, 0, 0], fb.fbo);

const data = getCurrentFramebuffersPixels(canvas);

arrangerShader.bind(gl);
arrangerShader.render(gl, [0, 0, 0, 0]);
