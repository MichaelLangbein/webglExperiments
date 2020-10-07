import { Context, InstancedElementsBundle, Index, Program, AttributeData,
    renderLoop, ElementsBundle, InstancedAttributeData, UniformData } from '../../engine/engine.core';
import { boxE, identity } from '../../engine/engine.shapes';
import { projectionMatrix, identityMatrix, matrixMultiplyList, rotateXMatrix,
    rotateYMatrix, rotateZMatrix, translateMatrix, flattenRecursive, transposeMatrix } from '../../engine/math';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const box = boxE(0.25, 0.25, 0.25);



const nrInstances = 4;

const getInitialTransformationMatrices = (nrInstances: number): number[][][] => {
    const matrices: number[][][] = [];
    for (let i = 0; i < nrInstances; i++) {
        const t = translateMatrix(Math.random() * 2 - 1, Math.random() * 2 - 1, -30);
        matrices.push(transposeMatrix(t));
    }
    return matrices;
};

const updateTransformMatrices = (nrInstances: number, time: number, lastMatrices: number[][][]): number[][][] => {
    // return lastMatrices;
    const matrices: number[][][] = [];
    for (let i = 0; i < nrInstances; i++) {
        const t = matrixMultiplyList([
            rotateXMatrix(i * 0.01),
            transposeMatrix(lastMatrices[i])
        ]);
        matrices.push(transposeMatrix(t));
    }
    return matrices;
};

let transformMatrices = getInitialTransformationMatrices(nrInstances);

const projection = transposeMatrix(projectionMatrix(Math.PI / 2, 1, 0.01, 100));

const context = new Context(gl, true);

const bundle = new InstancedElementsBundle(new Program(`#version 300 es
    precision mediump float;
    in vec4 a_position;
    in mat4 a_transform;
    uniform mat4 u_projection;

    void main() {
        vec4 pos = u_projection * a_transform * a_position + vec4(0.0, 0.0, 0.0, 0.0) * u_projection * a_transform * a_position;
        gl_Position = pos;
    }
`, `#version 300 es
    precision mediump float;
    out vec4 outputColor;

    void main() {
        outputColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`), {
    'a_position': new AttributeData(flattenRecursive(box.vertices), 'vec4', false),
    'a_transform': new InstancedAttributeData(flattenRecursive(transformMatrices), 'mat4', true, 1)
}, {
    'u_projection': new UniformData('mat4', flattenRecursive(projection))
}, {},
'triangles',
new Index(box.vertexIndices), nrInstances);

bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
let time = 0;
renderLoop(100, (tDelta: number) => {
    time += tDelta;
    transformMatrices = updateTransformMatrices(nrInstances, time, transformMatrices);
    bundle.updateAttributeData(context, 'a_transform', flattenRecursive(transformMatrices));
    bundle.draw(context);
});