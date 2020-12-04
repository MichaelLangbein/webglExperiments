import { bindTextureToFramebuffer, createEmptyTexture, createFramebuffer, FramebufferObject } from '../../engine/webgl';
import { Context, InstancedElementsBundle, Index, Program, AttributeData,
    renderLoop, ElementsBundle, InstancedAttributeData, UniformData, ArrayBundle, TextureData } from '../../engine/engine.core';
import { boxE, gaussianKernel, rectangleA } from '../../engine/engine.shapes';
import { projectionMatrix, identityMatrix, matrixMultiplyList, rotateXMatrix,
    rotateYMatrix, rotateZMatrix, translateMatrix, transposeMatrix, flatten2, flatten3 } from '../../utils/math';


const body = document.getElementById('container') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
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

let colors = [
    [1.0, 0.0, 0.0, 1.0],
    [0.0, 1.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 1.0],
    [1.0, 1.0, 0.0, 1.0],
];

const projection = transposeMatrix(projectionMatrix(Math.PI / 2, 1, 0.01, 100));

const context = new Context(gl, true);

const drawingBundle = new InstancedElementsBundle(new Program(`#version 300 es
    precision mediump float;
    in vec4 a_position;
    in mat4 a_transform;
    in vec4 a_color;
    out vec4 v_color;
    uniform mat4 u_projection;

    void main() {
        vec4 pos = u_projection * a_transform * a_position;
        gl_Position = pos;
        v_color = a_color;
    }
`, `#version 300 es
    precision mediump float;
    in vec4 v_color;
    out vec4 outputColor;

    void main() {
        outputColor = v_color;
    }
`), {
    'a_position': new AttributeData(flatten2(box.vertices), 'vec4', false),
    'a_transform': new InstancedAttributeData(flatten3(transformMatrices), 'mat4', true, 1),
    'a_color': new InstancedAttributeData(flatten2(colors), 'vec4', false, 1)
}, {
    'u_projection': new UniformData('mat4', flatten2(projection))
}, {},
'triangles',
new Index(flatten2(box.vertexIndices)), nrInstances);


const fb = createFramebuffer(gl);
const fbTexture = createEmptyTexture(gl, canvas.width, canvas.height);
const fbo = bindTextureToFramebuffer(gl, fbTexture, fb);




const blurBundle = new ArrayBundle(new Program(`#version 300 es
    precision mediump float;
    in vec4 a_position;
    in vec2 a_texPosition;
    out vec2 v_texPosition;

    void main() {
        gl_Position = a_position;
        v_texPosition = a_texPosition;
    }
`, `#version 300 es
    precision mediump float;
    uniform sampler2D u_texture;
    uniform vec2 u_textureSize;
    uniform mat3 u_blur;
    in vec2 v_texPosition;
    out vec4 outputColor;

    void main() {
        float deltaX = 7.0 / u_textureSize[0];
        float deltaY = 7.0 / u_textureSize[1];
        vec4 color = texture(u_texture, v_texPosition + vec2(-deltaX,  deltaY)) * u_blur[0][0]
                   + texture(u_texture, v_texPosition + vec2(      0,  deltaY)) * u_blur[1][0]
                   + texture(u_texture, v_texPosition + vec2( deltaX,  deltaY)) * u_blur[2][0]

                   + texture(u_texture, v_texPosition + vec2(-deltaX,       0)) * u_blur[0][1]
                   + texture(u_texture, v_texPosition + vec2(      0,       0)) * u_blur[1][1]
                   + texture(u_texture, v_texPosition + vec2( deltaX,       0)) * u_blur[2][1]

                   + texture(u_texture, v_texPosition + vec2(-deltaX, -deltaY)) * u_blur[0][2]
                   + texture(u_texture, v_texPosition + vec2(      0, -deltaY)) * u_blur[1][2]
                   + texture(u_texture, v_texPosition + vec2( deltaX, -deltaY)) * u_blur[2][2];
        outputColor = color;
    }
`), {
    'a_position': new AttributeData(flatten2(rectangleA(2, 2).vertices), 'vec4', false),
    'a_texPosition': new AttributeData(flatten2(rectangleA(2, 2).texturePositions), 'vec2', false),
}, {
    'u_blur': new UniformData('mat3', flatten2(transposeMatrix(gaussianKernel()))),
    'u_textureSize': new UniformData('vec2', [fbo.width, fbo.height])
}, {
    'u_texture': new TextureData(fbo.texture)
}, 'triangles', 6);






drawingBundle.upload(context);
drawingBundle.initVertexArray(context);
blurBundle.upload(context);
blurBundle.initVertexArray(context);

let time = 0;
renderLoop(60, (tDelta: number) => {
    time += tDelta;

    drawingBundle.bind(context);
    transformMatrices = [
        transposeMatrix(matrixMultiplyList([  translateMatrix(-0.5,  0.5, 0.5 * Math.sin(time * 0.10) + -3.5), rotateXMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix( 0.5,  0.5, 1.0 * Math.sin(time * 0.20) + -2.5), rotateYMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix( 0.5, -0.5, 0.5 * Math.sin(time * 0.10) + -1.5), rotateZMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix(-0.5, -0.5, 1.0 * Math.sin(time * 0.05) + -0.5), rotateXMatrix(time * 0.1), ])),
    ];
    drawingBundle.updateAttributeData(context, 'a_transform', flatten3(transformMatrices));
    drawingBundle.draw(context, [0, 0, 0, 0], fbo);

    blurBundle.bind(context);
    blurBundle.draw(context);
});