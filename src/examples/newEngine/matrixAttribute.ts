import { Context, Program, AttributeData, renderLoop, ArrayBundle } from '../../engine/engine.core';
import { flatten3, transposeMatrix } from '../../engine/math';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}


const matrices0 = [
    transposeMatrix([
        [0.8, 0.0,  0.9,  0.0 ],
        [0.8, 0.0,  0.0,  0.0 ],
        [0.8, 0.0,  0.0,  0.0 ],
        [1,   0.0,  0.0,  0.0 ],
    ]), transposeMatrix([
        [-0.8, 0.0,  0.0,  0.0 ],
        [-0.8, 0.0,  0.9,  0.0 ],
        [-0.8, 0.0,  0.0,  0.0 ],
        [1,    0.0,  0.0,  0.0 ],
    ]), transposeMatrix([
        [ 0.8, 0.0,  0.0,  0.0 ],
        [-0.8, 0.0,  0.0,  0.0 ],
        [ 0.8, 0.0,  0.9,  0.0 ],
        [ 1,   0.0,  0.0,  0.0 ],
    ])
];


const context = new Context(gl, true);

const bundle = new ArrayBundle(new Program(`#version 300 es
    in mat4 a_matrix;
    out vec4 v_color;

    void main() {
        vec4 pos = a_matrix[0];
        gl_Position = pos;
        v_color = a_matrix[2];
    }
`, `#version 300 es
    precision highp float;
    out vec4 outputColor;
    in vec4 v_color;

    void main() {
        outputColor = vec4(v_color.xyz, 1.0);
    }
`), {
    'a_matrix': new AttributeData(flatten3(matrices0), 'mat4', false)
}, {}, {},
'triangles',
3);

bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
let time = 0;
renderLoop(100, (tDelta: number) => {
    time += tDelta;
    bundle.draw(context);
});