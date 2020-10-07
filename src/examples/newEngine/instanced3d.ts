import { Context, InstancedElementsBundle, Index, Program, AttributeData,
    renderLoop, ElementsBundle, InstancedAttributeData, UniformData } from '../../engine/engine.core';
import { boxE, identity } from '../../engine/engine.shapes';
import { projectionMatrix, identityMatrix, matrixMultiplyList, rotateXMatrix, 
    rotateYMatrix, rotateZMatrix, translateMatrix, flattenRecursive } from '../../engine/math';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const boxImg = document.getElementById('boxTexture') as HTMLImageElement;
const glassImg = document.getElementById('glassTexture') as HTMLImageElement;

const box = boxE(0.25, 0.25, 0.25);



const nrInstances = 4;

const getInitialTransformationMatrices = (nrInstances: number): number[][] => {
    let matrices: number[][] = [];
    for (let i = 0; i < nrInstances; i++) {
        const t = matrixMultiplyList([
            translateMatrix(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1),
            rotateXMatrix(Math.random() * 2 * Math.PI),
            rotateYMatrix(Math.random() * 2 * Math.PI),
            rotateZMatrix(Math.random() * 2 * Math.PI),
        ]);
        matrices = Array.prototype.concat(matrices, t);
    }
    return matrices;
};

const updateTransformMatrices = (nrInstances: number, time: number, lastMatrices: number[][]): number[][] => {
    let matrices: number[][] = [];
    for (let i = 0; i < nrInstances; i++) {
        // const t = matrixMultiplyList([
        //     rotateXMatrix(Math.random() * 2 * Math.PI),
        //     rotateYMatrix(Math.random() * 2 * Math.PI),
        //     rotateZMatrix(Math.random() * 2 * Math.PI),
        // ]);
        matrices = Array.prototype.concat(matrices, identityMatrix());
    }
    return matrices;
};

let transformMatrices = getInitialTransformationMatrices(nrInstances);

const projection = projectionMatrix(Math.PI / 2, 1, 0.01, 100);

const context = new Context(gl, true);

const bundle = new InstancedElementsBundle(new Program(`#version 300 es
    precision mediump float;
    in vec4 a_position;
    uniform mat4 u_projection;

    void main() {
        vec4 pos = u_projection * a_position;
        gl_Position = pos;
    }
`, `#version 300 es
    precision mediump float;
    out vec4 outputColor;

    void main() {
        outputColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`), {
    'a_position': new AttributeData(box.vertices, false),
    // 'a_transform': new InstancedAttributeData(transformMatrices, true, 1)
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
    // bundle.updateAttributeData(context, 'a_transform', transformMatrices);
    bundle.draw(context);
});