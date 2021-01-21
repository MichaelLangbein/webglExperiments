import { Context, ArrayBundle, Program, AttributeData, TextureData, UniformData } from '../../engine1/engine.core';



const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl') as WebGLRenderingContext;



const nbhMatrix = [
    [[1, 0, 0, 255], [2, 0, 0, 255], [3, 0, 0, 255], [4, 0, 0, 255], [5, 0, 0, 255], [6, 0, 0, 255], [7, 0, 0, 255], [8, 0, 0, 255]],
    [[9, 0, 0, 255], [10, 0, 0, 255], [11, 0, 0, 255], [12, 0, 0, 255], [13, 0, 0, 255], [14, 0, 0, 255], [15, 0, 0, 255], [16, 0, 0, 255]],
    [[17, 0, 0, 255], [18, 0, 0, 255], [19, 0, 0, 255], [20, 0, 0, 255], [21, 0, 0, 255], [22, 0, 0, 255], [23, 0, 0, 255], [24, 0, 0, 255]],
    [[25, 0, 0, 255], [26, 0, 0, 255], [27, 0, 0, 255], [28, 0, 0, 255], [29, 0, 0, 255], [30, 0, 0, 255], [31, 0, 0, 255], [32, 0, 0, 255]],
];

const valData = [
  // id, x,   y,    val
    [1 , -0.2, 0.8, Math.random() * 20],
    [2 , -0.1, 0.8, Math.random() * 20],
    [3 ,  0.0, 0.8, Math.random() * 20],
    [4 ,  0.1, 0.8, Math.random() * 20],
    [5 ,  0.2, 0.8, Math.random() * 20],
    [6 ,  0.3, 0.8, Math.random() * 20],
    [7 ,  0.4, 0.8, Math.random() * 20],
    [8 ,  0.5, 0.8, Math.random() * 20],

    [9 , -0.2, 0.6, Math.random() * 20],
    [10, -0.1, 0.6, Math.random() * 20],
    [11,  0.0, 0.6, Math.random() * 20],
    [12,  0.1, 0.6, Math.random() * 20],
    [13,  0.2, 0.6, Math.random() * 20],
    [14,  0.3, 0.6, Math.random() * 20],
    [15,  0.4, 0.6, Math.random() * 20],
    [16,  0.5, 0.6, Math.random() * 20],

    [17, -0.2, 0.4, Math.random() * 20],
    [18, -0.1, 0.4, Math.random() * 20],
    [19,  0.0, 0.4, Math.random() * 20],
    [20,  0.1, 0.4, Math.random() * 20],
    [21,  0.2, 0.4, Math.random() * 20],
    [22,  0.3, 0.4, Math.random() * 20],
    [23,  0.4, 0.4, Math.random() * 20],
    [24,  0.5, 0.4, Math.random() * 20],

    [25, -0.2, 0.2, Math.random() * 20],
    [26, -0.1, 0.2, Math.random() * 20],
    [27,  0.0, 0.2, Math.random() * 20],
    [28,  0.1, 0.2, Math.random() * 20],
    [29,  0.2, 0.2, Math.random() * 20],
    [30,  0.3, 0.2, Math.random() * 20],
    [31,  0.4, 0.2, Math.random() * 20],
    [32,  0.5, 0.2, Math.random() * 20],
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
    uniform vec4 u_values[32];

    vec4 getValueAtIndex(int index) {
        for (int i = 0; i < 32; i++) {
            if (i == index) {
                return u_values[i];
            }
        }
    }

    void main() {

        // gridPosition: [row, col]; textureSize: [width, height] == [col, row]
        vec2 ownPosition = vec2(v_gridPosition.y / u_nbhTextureSize.x, v_gridPosition.x / u_nbhTextureSize.y);

        float ownId = texture2D(u_nbhTexture, ownPosition).x;
        float topId = texture2D(u_nbhTexture, ownPosition + vec2(   0.0 / u_nbhTextureSize.x,   1.0 / u_nbhTextureSize.y)).x;
        float botId = texture2D(u_nbhTexture, ownPosition + vec2(   0.0 / u_nbhTextureSize.x, - 1.0 / u_nbhTextureSize.y)).x;
        float lftId = texture2D(u_nbhTexture, ownPosition + vec2( - 1.0 / u_nbhTextureSize.x,   0.0 / u_nbhTextureSize.y)).x;
        float rgtId = texture2D(u_nbhTexture, ownPosition + vec2(   1.0 / u_nbhTextureSize.x,   0.0 / u_nbhTextureSize.y)).x;

        vec4 topVal = getValueAtIndex(int(topId));
        vec4 botVal = getValueAtIndex(int(botId));
        vec4 lftVal = getValueAtIndex(int(lftId));
        vec4 rgtVal = getValueAtIndex(int(rgtId));

        // @TODO: interpolate by distance
        float interpolated = (topVal.w + botVal.w + lftVal.w + rgtVal.w) / (4.0 * 20.0);

        gl_FragColor = vec4(interpolated, 0, 0, 1);
    }
`);
const bundle = new ArrayBundle(program, {
    'a_clipPosition': new AttributeData(new Float32Array(clipPositions.flat()), 'vec2', false),
    'a_gridPosition': new AttributeData(new Float32Array(gridPositions.flat()), 'vec2', false)
}, {
    'u_nbhTextureSize': new UniformData('vec2', [nbhMatrix[1].length - 1, nbhMatrix.length - 1]),  // width * height === cols * rows
    'u_values': new UniformData('vec4[]', valData.flat())
}, {
    'u_nbhTexture': new TextureData(nbhMatrix, 'ubyte4')
}, 'triangles', gridPositions.flat().length);
bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
bundle.draw(context);