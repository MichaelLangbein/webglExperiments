import { flattenRecursive } from './math';
import { bindIndexBuffer, bindProgram, bindTextureToUniform, bindValueToUniform, BufferObject, createFloatBuffer,
    createIndexBuffer, createShaderProgram, createTexture, drawArray, drawElements, getAttributeLocation,
    getUniformLocation, IndexBufferObject, TextureObject, WebGLVariableType, drawElementsInstanced, drawArrayInstanced,
    GlDrawingMode, bindVertexArray, createVertexArray, VertexArrayObject, bindBufferToAttributeVertexArray,
    bindBufferToAttributeInstancedVertexArray } from './webgl';




// dead-simple hash function - not intended to be secure in any way.
const hash = function(s: string): string {
    let h = 0;
    for (const c of s) {
        h += c.charCodeAt(0);
    }
    return `${h}`;
};


function parseProgram(program: Program): [string[], string[], string[], string[]] {
    const attributeRegex = /^\s*attribute (int|float|vec2|vec3|vec4|mat2|mat3|mat4) (\w*);/gm;
    const uniformRegex = /^\s*uniform (int|float|vec2|vec3|vec4|mat2|mat3|mat4) (\w*)(\[\d\])*;/gm;
    const textureRegex = /^\s*uniform sampler2D (\w*);/gm;
    const precisionRegex = /^\s*precision (\w*) float;/gm;

    const shaderCode = program.fragmentShaderSource + '\n\n\n' + program.vertexShaderSource;

    const attributeNames = [];
    let attributeMatches;
    while ((attributeMatches = attributeRegex.exec(shaderCode)) !== null) {
        attributeNames.push(attributeMatches[2]);
    }
    const uniformNames = [];
    let uniformMatches;
    while ((uniformMatches = uniformRegex.exec(shaderCode)) !== null) {
        uniformNames.push(uniformMatches[2]);
    }
    const textureNames = [];
    let textureMatches;
    while ((textureMatches = textureRegex.exec(shaderCode)) !== null) {
        textureNames.push(textureMatches[1]);
    }

    const precisions = [];
    let precisionMatches;
    while ((precisionMatches = precisionRegex.exec(shaderCode)) !== null) {
        precisions.push(precisionMatches[1]);
    }

    return [attributeNames, uniformNames, textureNames, precisions];
}



function checkDataProvided(
    program: Program, 
    attributes: {[k: string]: AttributeData},
    uniforms: {[k: string]: UniformData},
    textures: {[k: string]: TextureData},
    ) {
    const [attributeNames, uniformNames, textureNames, precisions] = parseProgram(program);
    for (const attrName of attributeNames) {
        if (!attributes[attrName]) {
            throw new Error(`Provided no values for shader's attribute ${attrName}.`);
        }
    }
    for (const uniformName of uniformNames) {
        if (!uniforms[uniformName]) {
            throw new Error(`Provided no values for shader's uniform ${uniformName}.`);
        }
    }
    for (const texName of textureNames) {
        if (!textures[texName]) {
            throw new Error(`Provided no values for shader's texture ${texName}.`);
        }
    }
    if (precisions.length === 1) {
        console.warn(`You have only provided one precision qualifier.
        This can cause issues when you want to use a uniform in both the vertex- and the fragment-shader.`);
    }
    const lengths = Object.values(attributes).map(a => a.data.length);
    if (Math.min(...lengths) !== Math.max(...lengths)) {
        throw new Error(`Your attributes are not of the same length!`);
    }
}


interface IAttributeData {
    hash: string;
    data: number[][];
    buffer: BufferObject;
    upload (gl: WebGL2RenderingContext): void;
    bind (gl: WebGL2RenderingContext, location: number, va: VertexArrayObject): VertexArrayObject;
}


/**
 * Data container.
 * Abstracts all webgl-calls to attribute-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without loosing the original data.
 */
export class AttributeData implements IAttributeData {

    readonly hash: string;
    data: number[][];      // raw data, user-provided
    buffer: BufferObject;  // buffer on gpu
    constructor(data: number[][]) {
        this.data = data;
        this.hash = hash(flattenRecursive(data) + '');
    }

    upload(gl: WebGL2RenderingContext) {
        this.buffer = createFloatBuffer(gl, this.data);
    }

    bind(gl: WebGL2RenderingContext, location: number, va: VertexArrayObject) {
        if (!this.buffer) {
            throw Error(`No value set for AttributeData`);
        }
        va = bindBufferToAttributeVertexArray(gl, location, this.buffer, va);
        return va;
    }

}

export class InstancedAttributeData implements IAttributeData {

    readonly hash: string;
    data: number[][];      // raw data, user-provided
    buffer: BufferObject;  // buffer on gpu
    /**
     * Number of instances that will be rotated through before moving along one step of this buffer.
     * I.e. each entry in this buffer remains the same for `nrInstances` instances,
     * that is, for `nrInstances * data.length` vertices.
     */
    nrInstances: number;
    constructor(data: number[][], nrInstances: number) {
        this.data = data;
        this.nrInstances = nrInstances;
        this.hash = hash(flattenRecursive(data) + '');
    }

    upload(gl: WebGL2RenderingContext) {
        this.buffer = createFloatBuffer(gl, this.data);
    }

    bind(gl: WebGL2RenderingContext, location: number, va: VertexArrayObject) {
        if (!this.buffer) {
            throw Error(`No value set for AttributeData`);
        }
        va = bindBufferToAttributeInstancedVertexArray(gl, location, this.buffer, this.nrInstances, va);
        return va;
    }

}


/**
 * Data container.
 * Abstracts all webgl-calls to uniform-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without loosing the original data.
 */
export class UniformData {

    hash: string;
    value: number[];
    type: WebGLVariableType;
    constructor(type: WebGLVariableType, value: number[]) {
        this.type = type;
        this.value = value;
        this.hash = hash(value + '');
    }

    upload(gl: WebGL2RenderingContext) {
        // uniforms are always uploaded directly, without a buffer.
        // (In WebGL2, however, there *are* uniform-buffers!)
    }

    bind(gl: WebGL2RenderingContext, location: WebGLUniformLocation) {
        bindValueToUniform(gl, location, this.type, this.value);
    }
}


/**
 * Data container.
 * Abstracts all webgl-calls to texture-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without loosing the original data.
 */
export class TextureData {

    hash: string;
    data: TextureObject | HTMLImageElement | HTMLCanvasElement;  // raw data, user-provided
    texture: TextureObject;                                      // buffer on gpu
    constructor(im: HTMLImageElement | HTMLCanvasElement | TextureObject) {
        this.data = im;
        this.hash = hash(Math.random() * 1000 + ''); // @TODO: how do you hash textures?
    }

    upload(gl: WebGL2RenderingContext) {
        if (this.data instanceof HTMLImageElement || this.data instanceof  HTMLCanvasElement) {
            this.texture = createTexture(gl, this.data);
        } else {
            this.texture = this.data;
        }
    }

    bind(gl: WebGL2RenderingContext, location: WebGLUniformLocation, bindPoint: number) {
        if (!this.texture) {
            throw new Error(`No texture for TextureData`);
        }
        bindTextureToUniform(gl, this.texture.texture, bindPoint, location);
    }

}

/**
 * Data container.
 * Abstracts all webgl-calls to index-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without loosing the original data.
 */
export class Index {

    data: number[][];             // raw data, user-provided
    index: IndexBufferObject;     // buffer on gpu
    constructor(indices: number[][]) {
        this.data = indices;
    }

    upload(gl: WebGL2RenderingContext) {
        this.index = createIndexBuffer(gl, this.data);
    }

    bind(gl: WebGL2RenderingContext) {
        bindIndexBuffer(gl, this.index);
    }
}


export class Program {

    program: WebGLProgram;
    readonly hash: string;
    uniformLocations: {[uName: string]: WebGLUniformLocation};
    attributeLocations: {[aName: string]: number};

    constructor(
        readonly vertexShaderSource: string,
        readonly fragmentShaderSource: string) {
            this.hash = hash(vertexShaderSource + fragmentShaderSource);
    }

    upload(gl: WebGL2RenderingContext) {
        this.program = createShaderProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
    }

    bind(gl: WebGL2RenderingContext) {
        if (!this.program) {
            this.upload(gl);
        }
        bindProgram(gl, this.program);
    }

    getUniformLocation(gl: WebGL2RenderingContext, uName: string) {
        if (!this.uniformLocations[uName]) {
            const location = getUniformLocation(gl, this.program, uName);
            this.uniformLocations[uName] = location;
        }
        return this.uniformLocations[uName];
    }

    getAttributeLocation(gl: WebGL2RenderingContext, aName: string) {
        if (!this.attributeLocations[aName]) {
            const location = getAttributeLocation(gl, this.program, aName);
            this.attributeLocations[aName] = location;
        }
        return this.attributeLocations[aName];
    }

    getTextureLocation(gl: WebGL2RenderingContext, tName: string) {
        return this.getUniformLocation(gl, tName);
    }
}


/**
 * Context: a wrapper around WebGL2RenderingContext.
 * Intercepts calls to upload, bind etc.
 * and checks if the data is *already* uploaded, bound, etc.
 * Saves on calls.
 *
 * @TODO: also wrap around bind-calls and vertex-arrays.
 */
export class Context {

    private loadedProgram: string;
    private loadedAttributes: string[] = [];
    private loadedUniforms: string[] = [];
    private loadedTextures: string[] = [];

    constructor(public gl: WebGL2RenderingContext, private verbose = false) {}

    uploadProgram(prog: Program): void {
        if (this.loadedProgram !== prog.hash) {
            prog.upload(this.gl);
            this.loadedProgram = prog.hash;
            if (this.verbose) console.log(`Context: uploaded program ${prog.hash}`);
        }
    }

    uploadAttribute(data: AttributeData): void {
        if (!this.loadedAttributes.includes(data.hash)) {
            data.upload(this.gl);
            this.loadedAttributes.push(data.hash);
            if (this.verbose) console.log(`Context: uploaded attribute ${data.hash}`);
        }
    }

    uploadUniform(data: UniformData): void {
        if (!this.loadedUniforms.includes(data.hash)) {
            data.upload(this.gl);
            this.loadedUniforms.push(data.hash);
            if (this.verbose) console.log(`Context: uploaded uniform ${data.hash}`);
        }
    }

    uploadTexture(data: TextureData): void {
        // @TODO: check for overloading!
        if (!this.loadedTextures.includes(data.hash)) {
            data.upload(this.gl);
            this.loadedTextures.push(data.hash);
            if (this.verbose) console.log(`Context: uploaded texture ${data.hash}`);
        }
    }
}



export abstract class Bundle {
    program: Program;
    attributes: {[k: string]: IAttributeData};
    uniforms: {[k: string]: UniformData};
    textures: {[k: string]: TextureData};
    va: VertexArrayObject;
    drawingMode: GlDrawingMode;

    constructor(
        program: Program,
        attributes: {[k: string]: AttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles'
    ) {
        this.program = program;
        this.attributes = attributes;
        this.uniforms = uniforms;
        this.textures = textures;
        this.drawingMode = drawingMode;
        checkDataProvided(program, attributes, uniforms, textures);
    }

    public upload (context: Context): void {
        context.uploadProgram(this.program);

        for (const attributeName in this.attributes) {
            const data = this.attributes[attributeName];
            context.uploadAttribute(data);
        }

        for (const uniformName in this.uniforms) {
            const data = this.uniforms[uniformName];
            context.uploadUniform(data);
        }

        for (const textureName in this.textures) {
            const data = this.textures[textureName];
            context.uploadTexture(data);
        }
    }

    public initVertexArray(context: Context) {
        this.va = createVertexArray(context.gl);
        bindVertexArray(context.gl, this.va);

        for (const attributeName in this.attributes) {
            const data = this.attributes[attributeName];
            const loc = this.program.getAttributeLocation(context.gl, attributeName);
            this.va = data.bind(context.gl, loc, this.va);
        }
    }

    public bind (context: Context): void {
        bindVertexArray(context.gl, this.va);

        for (const uniformName in this.uniforms) {
            const data = this.uniforms[uniformName];
            const loc = this.program.getUniformLocation(context.gl, uniformName);
            data.bind(context.gl, loc);
        }

        let bp = 1;
        for (const textureName in this.textures) {
            bp += 1;
            const data = this.textures[textureName];
            const loc = this.program.getTextureLocation(context.gl, textureName);
            data.bind(context.gl, loc, bp);
        }
    }



    public abstract draw (context: Context): void;

}

export class ArrayBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: AttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles'
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }


    draw(context: Context): void {
        const firstAttributeName = Object.keys(this.attributes)[0];
        drawArray(context.gl, this.attributes[firstAttributeName].buffer, this.drawingMode);
    }
}

export class ElementsBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: AttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles',
        public index: Index,
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }

    draw(context: Context): void {
        this.index.bind(context.gl);
        drawElements(context.gl, this.index.index, this.drawingMode);
    }
}

export class InstancedArrayBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: IAttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles',
        public nrInstances: number
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }

    draw(context: Context): void {
        const firstAttributeName = Object.keys(this.attributes)[0];
        drawArrayInstanced(context.gl, this.attributes[firstAttributeName].buffer, this.drawingMode, this.nrInstances);
    }
}

export class InstancedElementsBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: IAttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles',
        public index: Index,
        public nrInstances: number
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }

    draw(context: Context): void {
        this.index.bind(context.gl);
        drawElementsInstanced(context.gl, this.index.index, this.drawingMode, this.nrInstances);
    }
}
