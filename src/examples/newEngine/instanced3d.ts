import { Context, InstancedElementsBundle, Index, Program, AttributeData,
    renderLoop, ElementsBundle, InstancedAttributeData, UniformData } from '../../engine/engine.core';
import { boxE, identity } from '../../engine/engine.shapes';
import { projectionMatrix, identityMatrix, matrixMultiplyList, rotateXMatrix,
    rotateYMatrix, rotateZMatrix, translateMatrix, flatten2, flatten3, transposeMatrix } from '../../utils/math';
import Stats from 'stats.js';


const body = document.getElementById('container') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const box = boxE(0.25, 0.25, 0.25);



const nrInstances = 4;

let transformMatrices = [
    transposeMatrix(translateMatrix(-0.5,  0.5, -3.5)),
    transposeMatrix(translateMatrix( 0.5,  0.5, -2.5)),
    transposeMatrix(translateMatrix( 0.5, -0.5, -1.5)),
    transposeMatrix(translateMatrix(-0.5, -0.5, -0.5)),
];

const projection = transposeMatrix(projectionMatrix(Math.PI / 2, 1, 0.01, 100));

const context = new Context(gl, true);

const bundle = new InstancedElementsBundle(new Program(`#version 300 es
    precision mediump float;
    in vec4 a_position;
    in mat4 a_transform;
    uniform mat4 u_projection;

    void main() {
        vec4 pos = u_projection * a_transform * a_position;
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
    'a_transform': new InstancedAttributeData(flatten3(transformMatrices), 'mat4', true, 1)
}, {
    'u_projection': new UniformData('mat4', flatten2(projection))
}, {},
'triangles',
new Index(flatten2(box.vertexIndices)), nrInstances);

bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);

let time = 0;
const stats = new Stats();
stats.showPanel(0);
body.appendChild(stats.dom);

renderLoop(60, (tDelta: number) => {
    time += tDelta; stats.begin();

    transformMatrices = [
        transposeMatrix(matrixMultiplyList([  translateMatrix(-0.5,  0.5, 0.5 * Math.sin(time * 0.10) + -3.5), rotateXMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix( 0.5,  0.5, 1.0 * Math.sin(time * 0.20) + -2.5), rotateYMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix( 0.5, -0.5, 0.5 * Math.sin(time * 0.10) + -1.5), rotateZMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix(-0.5, -0.5, 1.0 * Math.sin(time * 0.05) + -0.5), rotateXMatrix(time * 0.1), ])),
    ];
    bundle.updateAttributeData(context, 'a_transform', flatten3(transformMatrices));

    bundle.draw(context); stats.end();
});