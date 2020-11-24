import { Context, InstancedElementsBundle, Index, Program, AttributeData, renderLoop, ElementsBundle, InstancedAttributeData } from '../../engine/engine.core';
import { boxE } from '../../engine/engine.shapes';
import { flatten2, flatten3 } from '../../assets/helpers/math';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const box = boxE(0.25, 0.25, 0.25);



const nrInstances = 4;

const startPositions = [
    [-0.5,  0.5, 0, 0],
    [ 0.5,  0.5, 0, 0],
    [ 0.5, -0.5, 0, 0],
    [-0.5, -0.5, 0, 0],
];

function calculateTranslations(nrInstances: number, t: number, startPositions: number[][]) {
    const translations = [];
    for (let i = 0; i < nrInstances; i++) {
        const pos = [0, 0, 0, 1];
        pos[0] = startPositions[i][0] + Math.sin(t + i);
        pos[1] = startPositions[i][1] + Math.sin(t + i);
        pos[2] = startPositions[i][2] + Math.sin(t + i);
        translations.push(pos);
    }
    return translations;
}

let time = 0;

const translations = calculateTranslations(nrInstances, time, startPositions);


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
    'a_translation': new InstancedAttributeData(flatten2(translations), 'vec4', true, 1)
}, {}, {},
'triangles',
new Index(flatten2(box.vertexIndices)), 4);

bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
renderLoop(100, (tDelta: number) => {
    time += tDelta;
    const newTranslations = calculateTranslations(nrInstances, time, startPositions);
    bundle.updateAttributeData(context, 'a_translation', flatten2(newTranslations));
    bundle.draw(context);
});