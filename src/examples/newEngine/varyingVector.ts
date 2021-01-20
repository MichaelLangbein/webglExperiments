import { Context, Index, Program, AttributeData, renderLoop, ElementsBundle } from '../../engine2/engine.core';
import { boxE } from '../../engine2/engine.shapes';
import { flatten2 } from '../../utils/math';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const box = boxE(1, 1, 1);


const context = new Context(gl, true);

const bundle = new ElementsBundle(new Program(`#version 300 es
    precision mediump float;
    in vec4 a_position;
    flat out float v_color[4];

    void main() {
        v_color[0] = a_position.x;
        v_color[1] = 0.1;
        v_color[2] = 0.5;
        v_color[3] = 1.0;
        gl_Position = a_position;
    }
`, `#version 300 es
    precision mediump float;
    out vec4 outputColor;
    flat in float v_color[4];

    void main() {
        outputColor = vec4(v_color[0], v_color[1], v_color[2], v_color[3]);
    }
`), {
    'a_position': new AttributeData(new Float32Array(flatten2(box.vertices)), 'vec4', false),
}, {}, {},
'triangles',
new Index(new Uint32Array(flatten2(box.vertexIndices))));

bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
renderLoop(60, (tDelta: number) => {
    bundle.draw(context);
});