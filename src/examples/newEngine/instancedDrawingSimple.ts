import { Context, InstancedElementsBundle, Index, Program, AttributeData, renderLoop, ElementsBundle, InstancedAttributeData } from '../../engine/engine.core';
import { boxE } from '../../engine/engine.shapes';
import { flatten2 } from '../../engine/math';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const box = boxE(0.25, 0.25, 0.25);

const translations = [
    [-0.5,  0.5, 0, 0],
    [ 0.5,  0.5, 0, 0],
    [ 0.5, -0.5, 0, 0],
    [-0.5, -0.5, 0, 0],
];


const context = new Context(gl, true);

const bundle = new InstancedElementsBundle(new Program(`#version 300 es
    precision mediump float;
    in vec4 a_position;
    in vec4 a_translation;

    void main() {
        vec4 pos = a_position + a_translation;
        gl_Position = pos;
    }
`, `#version 300 es
    precision mediump float;
    out vec4 outputColor;

    void main() {
        outputColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`), {
    'a_position': new AttributeData(flatten2(box.vertices), 'vec4', false),
    'a_translation': new InstancedAttributeData(flatten2(translations), 'vec4', false, 1)
}, {}, {},
'triangles',
new Index(box.vertexIndices), 4);

bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
renderLoop(60, (tDelta: number) => {
    bundle.draw(context);
});