import { Context, ArrayBundle, Program, AttributeData, TextureData, UniformData } from '../../engine1/engine.core';



const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl') as WebGLRenderingContext;


// NB: coordinates and values have been transformed into a range of 0-255.
const nbhMatrix = [
    [
    //  id    x   y   val
        [1 ,   0, 80, Math.random() * 255],
        [2 ,  10, 80, Math.random() * 255],
        [3 ,  20, 80, Math.random() * 255],
        [4 ,  30, 80, Math.random() * 255],
        [5 ,  40, 80, Math.random() * 255],
        [6 ,  50, 80, Math.random() * 255],
        [7 ,  60, 80, Math.random() * 255],
        [8 ,  70, 80, Math.random() * 255],
    ], [
        [9 ,   0, 60, Math.random() * 255],
        [10,  10, 60, Math.random() * 255],
        [11,  20, 60, Math.random() * 255],
        [12,  30, 60, Math.random() * 255],
        [13,  40, 60, Math.random() * 255],
        [14,  50, 60, Math.random() * 255],
        [15,  60, 60, Math.random() * 255],
        [16,  70, 60, Math.random() * 255],
    ], [
        [17,   0, 40, Math.random() * 255],
        [18,  10, 40, Math.random() * 255],
        [19,  20, 40, Math.random() * 255],
        [20,  30, 40, Math.random() * 255],
        [21,  40, 40, Math.random() * 255],
        [22,  50, 40, Math.random() * 255],
        [23,  60, 40, Math.random() * 255],
        [24,  70, 40, Math.random() * 255],
    ], [
        [25,   0, 20, Math.random() * 255],
        [26,  10, 20, Math.random() * 255],
        [27,  20, 20, Math.random() * 255],
        [28,  30, 20, Math.random() * 255],
        [29,  40, 20, Math.random() * 255],
        [30,  50, 20, Math.random() * 255],
        [31,  60, 20, Math.random() * 255],
        [32,  70, 20, Math.random() * 255],
    ],
];


const clipPositions = [];
const gridPositions = [];

const R = nbhMatrix.length;
const C = nbhMatrix[0].length;
const deltaX = 2 / (C - 1);
const deltaY = 2 / (R - 1);
for (let row = 0; row < R - 1; row++) {
    for (let col = 0; col < C - 1; col++) {

        const clipSpaceX = -1 + col * deltaX;
        const clipSpaceY =  1 - row * deltaY;
        clipPositions.push([clipSpaceX         , clipSpaceY         ]);
        clipPositions.push([clipSpaceX         , clipSpaceY - deltaY]);
        clipPositions.push([clipSpaceX + deltaX, clipSpaceY - deltaY]);
        clipPositions.push([clipSpaceX         , clipSpaceY         ]);
        clipPositions.push([clipSpaceX + deltaX, clipSpaceY - deltaY]);
        clipPositions.push([clipSpaceX + deltaX, clipSpaceY         ]);

        gridPositions.push([row    , col    ]);
        gridPositions.push([row + 1, col    ]);
        gridPositions.push([row + 1, col + 1]);
        gridPositions.push([row    , col    ]);
        gridPositions.push([row + 1, col + 1]);
        gridPositions.push([row    , col + 1]);
    }
}



const context = new Context(gl, true);
const program = new Program(`
    precision mediump float;
    attribute vec2 a_clipPosition;
    attribute vec2 a_gridPosition;
    varying vec2 v_gridPosition;

    void main() {
        gl_Position = vec4(a_clipPosition * 0.3, 0, 1);
        v_gridPosition = a_gridPosition;
    }
`, `
    precision mediump float;
    varying vec2 v_gridPosition;
    uniform sampler2D u_nbhTexture;
    uniform vec2 u_nbhTextureSize;

    void main() {

        // gridPosition: [row, col]; textureSize: [width, height] == [col, row]
        vec2 ownGridPosition = vec2(v_gridPosition.y / u_nbhTextureSize.x, v_gridPosition.x / u_nbhTextureSize.y);

        vec2 deltaX = vec2( 1.0 / u_nbhTextureSize.x, 0.0 );
        vec2 deltaY = vec2( 0.0, 1.0 / u_nbhTextureSize.y );
        vec4 ownData = texture2D(u_nbhTexture, ownGridPosition);
        vec4 topData = texture2D(u_nbhTexture, ownGridPosition + deltaY);
        vec4 botData = texture2D(u_nbhTexture, ownGridPosition - deltaY);
        vec4 lftData = texture2D(u_nbhTexture, ownGridPosition - deltaX);
        vec4 rgtData = texture2D(u_nbhTexture, ownGridPosition + deltaX);


        // @TODO: interpolate by distance
        float interpolated = topData.w + botData.w + lftData.w + rgtData.w / 4.0;

        gl_FragColor = vec4(interpolated, 0, 0, 1);
    }
`);
const bundle = new ArrayBundle(program, {
    'a_clipPosition': new AttributeData(new Float32Array(clipPositions.flat()), 'vec2', false),
    'a_gridPosition': new AttributeData(new Float32Array(gridPositions.flat()), 'vec2', false)
}, {
    'u_nbhTextureSize': new UniformData('vec2', [nbhMatrix[1].length - 1, nbhMatrix.length - 1]),  // width * height === cols * rows
}, {
    'u_nbhTexture': new TextureData(nbhMatrix, 'ubyte4')
}, 'triangles', gridPositions.flat().length);
bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
bundle.draw(context);