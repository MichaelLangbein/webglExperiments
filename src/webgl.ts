/**
 * WEBGL
 *
 * Allows to draw points, line segments, or triangles.
 *
 * Vertex shaders take whatever coordinates you use and return a 3-d array with elements between -1 and 1.
 *
 * WebGL knows two data structures:
 *  - buffers (generic byte arrays): usually positions, normals, texture-coordinates, vertex-colors etc.
 *    buffers are accessed in shaders as 'attributes'.
 *    note that buffers contain one entry for each vertex.
 *  - textures (bitmap images).
 *
 * Shaders use these data structures in two different ways.
 *  - Attributes are values, one per vertex.
 *    For the shader, attributes are read-only.
 *    Attributes default to [0, 0, 0, 1]
 *  - Uniforms are values, one per shader.
 *    For the shader, uniforms are read-only.
 *
 * Apart from this, shaders know about two more types of data:
 *  - Varyings are values that are passed from vertex-shader to fragment-shader.
 *    They are read-only only for the fragment-shader.
 *  - Const: a compile-time constant.
 *
 * A program is just a list of compiled and linked vertex- and fragment-shaders.
 *
 *
 * Drawing: there's drawArrays and drawElements.
 *  - drawArrays is the robust all-rounder.
 *  - drawElements can be more performant if you share vertices between objects.
 *
 *
 * Rendering data is fast, but uploading it into GPU memory is slow.
 * Optimizing WebGl performance mostly means: Avoiding having GPU and CPU wait for each other.
 * The more the GPU can do in bulk, the better. The more often you have to upload data from CPU to GPU, the worse.
 *  - So avoid switching programs, buffers and uniforms if you can.
 *    (You won't be able to avoid switching buffers, because every object is likely different. But sort your objects by their shaders, and you'll save a lot of time.)
 *  - Try to do translations, rotations and shears inside the vertex-shader instead of altering the object's buffer.
 *  - If appropriate, create über-shaders and über-buffers, that contain information for more than just one object.
 */




/**
 * Compile shader.
 */
const compileShader = (gl: WebGLRenderingContext, typeBit: number, shaderSource: string): WebGLShader => {
    const shader = gl.createShader(typeBit);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
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
        gl.deleteProgram(program);
        throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
    }

    return program;
};


export const setup3dScene = (gl: WebGLRenderingContext): void => {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.cullFace(gl.BACK);

    clearBackground(gl, [0, 0, 0, 1]);
};


export const bindProgram = (gl: WebGLRenderingContext, program: WebGLProgram): void => {
    gl.useProgram(program);
};


export const clearBackground = (gl: WebGLRenderingContext, color: number[]): void => {
    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};


 /**
  * A generic buffer, together with it's metadata.
  */
export interface BufferObject {
    buffer: WebGLBuffer;
    vectorSize: number;
    vectorCount: number;
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
    gl.bufferData(gl.ARRAY_BUFFER, dataFlattened, gl.STATIC_DRAW);
    // STATIC_DRAW: tells WebGl that we are not likely to change this data much.

    const bufferObject: BufferObject = {
        buffer: buffer,
        vectorSize: data[0].length,
        vectorCount: data.length,
        type: gl.FLOAT,   // the data is 32bit floats
        normalize: false, // don't normalize the data
        stride: 0,        // 0 = move forward size * sizeof(type) each iteration to get the next position. Only change this in very-high-performance jobs.
        offset: 0,        // start at the beginning of the buffer. Only change this in very-high-performance jobs.
    };

    return bufferObject;
};


/**
 * Fetch attribute's location (attribute declared in some shader). Slow! Do *before* render loop.
 */
export const getAttributeLocation = (gl: WebGLRenderingContext, program: WebGLProgram, attributeName: string): number => {
    return gl.getAttribLocation(program, attributeName);
};

/**
 * Fetch uniform's location (uniform declared in some shader). Slow! Do *before* render loop.
 */
export const getUniformLocation = (gl: WebGLRenderingContext, program: WebGLProgram, uniformName: string): WebGLUniformLocation => {
    return gl.getUniformLocation(program, uniformName);
};


/**
 * Attributes vary from vertex to vertex - that means that there are *many* of them.
 * So it makes sense for WebGl to store attribute values in a dedicated data structure - the buffer.
 */
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


export type UniformType = '1i' | '2i' | '3i' | '4i' | '1f' | '2f' | '3f' | '4f';

/**
 * Contrary to attributes, uniforms don't need to be stored in a buffer.
 */
export const bindValueToUniform = (gl: WebGLRenderingContext, uniformLocation: WebGLUniformLocation, type: UniformType, values: number[]): void => {
    switch (type) {
        case '1i':
            gl.uniform1i(uniformLocation, values[0]);
            break;
        case '1f':
            gl.uniform1f(uniformLocation, values[0]);
            break;
        case '3f':
            gl.uniform3f(uniformLocation, values[0], values[1], values[2]);
            break;
        case '4f':
            gl.uniform4f(uniformLocation, values[0], values[1], values[2], values[3]);
            break;
        default:
            throw Error(`Type ${type} not yet implemented.`);
    }
};
