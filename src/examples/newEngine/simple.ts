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

    void main() {
        vec4 pos = a_position;
        gl_Position = pos;
    }
`, `#version 300 es
    precision mediump float;
    out vec4 outputColor;

    void main() {
        outputColor = vec4(1.0, 0.0, 0.0, 1.0);
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