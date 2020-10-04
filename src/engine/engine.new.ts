import { flattenRecursive } from "./math";
import { bindBufferToAttribute, bindIndexBuffer, bindProgram, bindTextureToUniform, bindValueToUniform, BufferObject, createFloatBuffer, createIndexBuffer, createShaderProgram, createTexture, drawArray, drawElements, getAttributeLocation, getUniformLocation, IndexBufferObject, TextureObject, WebGLVariableType } from "./webgl";


/**
 * Strategy
 * ========
 * 
 * Before, attributes, uniforms and textures were bound to a program.
 * Their data was uploaded and immediately bound to the program.
 * That's quick, but this way we cannot share one texture over multiple programs.
 * In this new engine we decouple data from programs.
 * 
 * (Attribute|Texture|Uniform)Data:
 *      construction: pass data; handled by user 
 *      upload/unload/bind/unbind: handled by context
 *    <-- this way, once unloaded data can be easily reloaded (at the price of keeping that data in memory)
 *      
 */



export type GlDrawingMode = 'triangles' | 'points' | 'lines';


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

/**
 * Data container.
 * Abstracts all webgl-calls to attribute-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without loosing the original data.
 */
export class AttributeData {
    
    readonly hash: string;
    drawingMode: GlDrawingMode;
    data: number[][];      // raw data, user-provided
    buffer: BufferObject;  // buffer on gpu
    constructor(data: number[][], drawingMode: GlDrawingMode = 'triangles') {
        this.data = data;
        this.drawingMode = drawingMode;
        this.hash = hash(flattenRecursive(data) + "");
    }

    upload(gl: WebGLRenderingContext) {
        let glDrawingMode: number;
        switch (this.drawingMode) {
            case 'triangles':
                glDrawingMode = gl.TRIANGLES;
                break;
            case 'lines':
                glDrawingMode = gl.LINES;
                break;
            case 'points':
                glDrawingMode = gl.POINTS;
                break;
        }
        this.buffer = createFloatBuffer(gl, this.data, glDrawingMode);
    }
    
    bind(gl: WebGLRenderingContext, location: number) {
        if (!this.buffer) {
            throw Error(`No value set for AttributeData`);
        }
        bindBufferToAttribute(gl, location, this.buffer);
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
        this.hash = hash(value + "");
    }

    upload(gl: WebGLRenderingContext) {
        // uniforms are always uploaded directly, without a buffer. 
        // (In WebGL2, however, there *are* uniform-buffers!)
    }

    bind(gl: WebGLRenderingContext, location: WebGLUniformLocation) {
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
        this.hash = hash(Math.random() * 1000 + ""); // @TODO: how do you hash textures?
    }

    upload(gl: WebGLRenderingContext) {
        if (this.data instanceof HTMLImageElement || this.data instanceof  HTMLCanvasElement) {
            this.texture = createTexture(gl, this.data);
        } else {
            this.texture = this.data;
        }
    }

    bind(gl: WebGLRenderingContext, location: WebGLUniformLocation, bindPoint: number) {
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
    
    drawingMode: GlDrawingMode;
    data: number[][];             // raw data, user-provided
    index: IndexBufferObject;     // buffer on gpu
    constructor(drawingMode: GlDrawingMode = 'triangles', indices: number[][]) {
        this.drawingMode = drawingMode;
        this.data = indices;
    }
    
    upload(gl: WebGLRenderingContext) {
        let glDrawingMode: number;
        switch (this.drawingMode) {
            case 'triangles':
                glDrawingMode = gl.TRIANGLES;
                break;
            case 'lines':
                glDrawingMode = gl.LINES;
                break;
            case 'points':
                glDrawingMode = gl.POINTS;
                break;
            default:
                throw new Error(`Invalid drawing mode ${this.drawingMode}`);
        }
        this.index = createIndexBuffer(gl, this.data, glDrawingMode);
    }

    bind(gl: WebGLRenderingContext) {
        bindIndexBuffer(gl, this.index);
    }
}


export class Program {

    program: WebGLProgram;
    readonly hash: string;
    uniformLocations: {[uName: string]: WebGLUniformLocation};
    attributeLocations: {[aName: string]: number};

    constructor(gl: WebGLRenderingContext,
        readonly vertexShaderSource: string,
        readonly fragmentShaderSource: string) {
            this.hash = hash(vertexShaderSource + fragmentShaderSource);
    }
    
    upload(gl: WebGLRenderingContext) {
        this.program = createShaderProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
    }

    bind(gl: WebGLRenderingContext) {
        if (!this.program) {
            this.upload(gl);
        }
        bindProgram(gl, this.program);
    }

    getUniformLocation(gl: WebGLRenderingContext, uName: string) {
        if(!this.uniformLocations[uName]) {
            const location = getUniformLocation(gl, this.program, uName);
            this.uniformLocations[uName] = location;
        }
        return this.uniformLocations[uName];
    }

    getAttributeLocation(gl: WebGLRenderingContext, aName: string) {
        if(!this.attributeLocations[aName]) {
            const location = getAttributeLocation(gl, this.program, aName);
            this.attributeLocations[aName] = location;
        }
        return this.attributeLocations[aName];
    }

    getTextureLocation(gl: WebGLRenderingContext, tName: string) {
        return this.getUniformLocation(gl, tName);
    }
}

export class ProgramDataBundle {
    constructor(
        public program: Program,
        public attributes: {[k: string]: AttributeData},
        public uniforms: {[k: string]: UniformData},
        public textures: {[k: string]: TextureData},
        public index?: Index
    ) {
        checkDataProvided(program, attributes, uniforms, textures);
    }
}

export class Context {

    private loadedProgram: string;
    private loadedAttributes: string[] = [];
    private loadedUniforms: string[] = [];
    private loadedTextures: string[] = [];

    constructor(private gl: WebGLRenderingContext, private verbose = false) {}

    upload(pd: ProgramDataBundle) {

        this.uploadProgram(pd.program);

        for (const attributeName in pd.attributes) {
            const data = pd.attributes[attributeName];
            this.uploadAttribute(data);
        }

        for (const uniformName in pd.uniforms) {
            const data = pd.uniforms[uniformName];
            this.uploadUniform(data);
        }

        for (const textureName in pd.textures) {
            const data = pd.textures[textureName];
            this.uploadTexture(data);
        }
    }

    bindAndRender(pd: ProgramDataBundle) {
        pd.program.bind(this.gl);

        for (const attributeName in pd.attributes) {
            const data = pd.attributes[attributeName];
            const loc = pd.program.getAttributeLocation(this.gl, attributeName);
            data.bind(this.gl, loc);
        }

        for (const uniformName in pd.uniforms) {
            const data = pd.uniforms[uniformName];
            const loc = pd.program.getUniformLocation(this.gl, uniformName);
            data.bind(this.gl, loc);
        }

        let bp = 1;
        for (const textureName in pd.textures) {
            bp += 1;
            const data = pd.textures[textureName];
            const loc = pd.program.getTextureLocation(this.gl, textureName);
            data.bind(this.gl, loc, bp);
        }

        if (pd.index) {
            pd.index.bind(this.gl);
            drawElements(this.gl, pd.index.index);
        } else {
            const firstAttributeName = Object.keys(pd.attributes)[0];
            drawArray(this.gl, pd.attributes[firstAttributeName].buffer);
        }
    }

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