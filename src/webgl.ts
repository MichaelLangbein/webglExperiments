/**
 * WEBGL
 *
 * Allows to draw points, line segments, or triangles.
 *
 * Vertex shaders take whatever coordinates you use and return a 3-d array with elements between -1 and 1.
 *
 * WebGL knows these data structures:
 *  - buffers (generic byte arrays): usually positions, normals, texture-coordinates, vertex-colors etc.
 *    buffers are accessed in shaders as 'attributes'.
 *    note that buffers contain one entry for each vertex.
 *  - textures (bitmap images).
 *
 * Shaders use these data structures in different ways.
 *  - Attributes are ...
 *    Attributes default to [0, 0, 0, 1]
 *  - ...
 *
 * Rendering data is fast, but uploading it into GPU memory is slow.
 */


 /**
  * A generic buffer, together with it's metadata.
  */
interface BufferObject {
    buffer: WebGLBuffer;
    vectorSize: number;
    type: number;
    normalize: boolean;
    stride: number;
    offset: number;
}

/**
 * Create buffer. Creation is slow! Do *before* render loop.
 */
export const createFloatBuffer = (gl: WebGLRenderingContext, data: number[][]): BufferObject => {
    const dataFlattened = new Float32Array([].concat.apply([], data));
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // STATIC_DRAW: tells WebGl that we are not likely to change this data much.
    gl.bufferData(gl.ARRAY_BUFFER, dataFlattened, gl.STATIC_DRAW);

    const bufferObject: BufferObject = {
        buffer: buffer,
        vectorSize: 2,    // x components per position
        type: gl.FLOAT,   // the data is 32bit floats
        normalize: false, // don't normalize the data
        stride: 0,        // 0 = move forward size * sizeof(type) each iteration to get the next position
        offset: 0,        // start at the beginning of the buffer
    };

    return bufferObject;
};


/**
 * Fetch attribute's location (attribute declared in some shader). Slow! Do *before* render loop.
 */
export const getAttributeLocation = (gl: WebGLRenderingContext, program: WebGLProgram, attributeName: string): number => {
    return gl.getAttribLocation(program, attributeName);
};


export const bindBufferToAttribute = (gl: WebGLRenderingContext, attributeLocation: number, bufferObject: BufferObject): void => {
    // Enable editing
    gl.enableVertexAttribArray(attributeLocation);
    // Bind buffer to ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject.buffer);
    // Bind the buffer currently at ARRAY_BUFFER to a vertex-buffer-location.
    gl.vertexAttribPointer(
        attributeLocation,
        bufferObject.vectorSize, bufferObject.type, bufferObject.normalize, bufferObject.stride, bufferObject.offset);
};



const compileShader = (gl: WebGLRenderingContext, typeBit: number, shaderSource: string): WebGLShader => {
    const shader = gl.createShader(typeBit);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};


export const initShaderProgram = (gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram => {

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
};


export const setup3dScene = (gl: WebGLRenderingContext, program: WebGLProgram): void => {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
};


