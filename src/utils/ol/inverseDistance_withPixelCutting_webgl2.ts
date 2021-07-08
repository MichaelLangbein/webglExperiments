import ImageSource from 'ol/source/Image';
import { FeatureCollection, Point } from 'geojson';
import { ImageCanvas } from 'ol/source';
import { FramebufferObject, createFramebuffer, createDataTexture, getCurrentFramebuffersPixels, createEmptyFramebufferObject } from '../../engine2/webgl2';
import { Bundle, ArrayBundle, UniformData, Program, Context, AttributeData, TextureData } from '../../engine2/engine.core';
import { rectangleA } from '../shapes';
import { nextPowerOf, flatten2 } from '../math';





export function createInterpolationSource(data: FeatureCollection<Point>, projection: string, power: number, valueProperty: string, maxEdgeLength: number): ImageSource {
    const interpolationRenderer = new InterpolationRenderer(data, power, valueProperty, maxEdgeLength, false);

    const interpolationSource = new ImageCanvas({
        canvasFunction: (extent, imageResolution, devicePixelRatio, imageSize, projection) => {
            interpolationRenderer.setCanvasSize(imageSize[0], imageSize[1]);
            interpolationRenderer.setBbox(extent);
            const canvas = interpolationRenderer.renderFrame();
            return canvas;
        },
        projection: projection,
        ratio: 1
    });

    return interpolationSource;
}


 export class InterpolationRenderer {

    private webGlCanvas: HTMLCanvasElement;
    private context: Context;
    private interpolationShader: Bundle;
    private interpolationFb: FramebufferObject;
    private arrangementShader: Bundle;

    private interpolatedValues: Uint8Array;

    constructor(data: FeatureCollection<Point>,
        private power: number,
        private valueProperty: string,
        private maxEdgeLength: number,
        private storeInterpolatedPixelData: boolean) {

        // setting up HTML element
        this.webGlCanvas = document.createElement('canvas');
        this.webGlCanvas.style.setProperty('position', 'absolute');
        this.webGlCanvas.style.setProperty('left', '0px');
        this.webGlCanvas.style.setProperty('top', '0px');
        this.webGlCanvas.style.setProperty('width', '100%');
        this.webGlCanvas.style.setProperty('height', '100%');
        this.webGlCanvas.width = 1000;  // <-- make smaller for better performance
        this.webGlCanvas.height = 1000;  // <-- make smaller for better performance
        this.context = new Context(this.webGlCanvas.getContext('webgl2') as WebGL2RenderingContext, false);

        // preparing data
        const { coords, values, bboxWithPadding, maxVal } = parseData(data, this.valueProperty, this.maxEdgeLength);
        const { dataRel2ClipSpace, maxEdgeLengthBbox } = parseDataRelativeToClipSpace(bboxWithPadding, coords, values, maxVal, this.maxEdgeLength);

        // setting up shaders
        this.interpolationShader = createInverseDistanceInterpolationShader(dataRel2ClipSpace, maxVal, this.power, maxEdgeLengthBbox);
        this.interpolationShader.upload(this.context);
        this.interpolationShader.initVertexArray(this.context);
        this.interpolationFb = createEmptyFramebufferObject(this.context.gl, this.webGlCanvas.width, this.webGlCanvas.height, 'ubyte4', 'display');
        this.runInterpolationShader(this.interpolationFb);
        this.arrangementShader = createArrangementShader([0, 0, 360, 180], bboxWithPadding, this.interpolationFb);
        this.arrangementShader.upload(this.context);
        this.arrangementShader.initVertexArray(this.context);

    }

    renderFrame(): HTMLCanvasElement {
        this.runArrangementShader();
        return this.webGlCanvas;
    }

    setBbox(extent: [number, number, number, number]) {
        this.updateArrangementShader(extent);
    }

    setCanvasSize(width: number, height: number) {
        if (width !== this.webGlCanvas.width || height !== this.webGlCanvas.height) {
            this.webGlCanvas.width = width;
            this.webGlCanvas.height = height;
            this.runInterpolationShader(this.interpolationFb);
        }
    }

    setStoreInterpolatedValue(doStore: boolean) {
        this.storeInterpolatedPixelData = doStore;
    }

    setPower(power: number) {
        if (power !== this.power) {
            this.power = power;
            this.interpolationShader.bind(this.context);
            this.interpolationShader.updateUniformData(this.context, 'u_power', [power]);
            this.runInterpolationShader(this.interpolationFb);
        }
    }


    /**
     * Called at every renderFrame. Fast.
     */
    private updateArrangementShader(currentBbox: number[]): void {
        this.arrangementShader.bind(this.context);
        this.arrangementShader.updateUniformData(this.context, 'u_currentBbox', currentBbox);
    }

    /**
     * Called at every renderFrame. Fast.
     */
    private runArrangementShader(target?: FramebufferObject): void {
        this.arrangementShader.bind(this.context);
        this.arrangementShader.draw(this.context, [0, 0, 0, 0], target);
    }

    /**
     * Slow! Avoid calling this too often.
     */
    private runInterpolationShader(target?: FramebufferObject): void {
        this.interpolationShader.bind(this.context);
        this.interpolationShader.draw(this.context, [0, 0, 0, 0], target);
        if (this.storeInterpolatedPixelData) {
            this.interpolatedValues = getCurrentFramebuffersPixels(this.webGlCanvas) as Uint8Array;
        }
    }
}

function parseData(source: FeatureCollection<Point>, valueProperty: string, maxEdgeLength: number) {
    const features = source.features;
    const coords = features.map(f => f.geometry.coordinates);
    const values = features.map(f => parseFloat(f.properties[valueProperty]));

    const bbox = getBbox(coords);
    const deltaX = bbox[2] - bbox[0];
    const deltaY = bbox[3] - bbox[1];
    let addX: number, addY: number;
    if (deltaX > deltaY) {
        addY = deltaX - deltaY;
        addX = 0;
    } else {
        addY = 0;
        addX = deltaY - deltaX;
    }
    const bboxWithPadding = [
        bbox[0] - maxEdgeLength,
        bbox[1] - maxEdgeLength,
        bbox[2] + addX + maxEdgeLength,
        bbox[3] + addY + maxEdgeLength
    ];
    const maxVal = values.reduce((prev, curr) => curr > prev ? curr : prev, 0);

    return {
        coords, values, bboxWithPadding, maxVal
    };
}

function parseDataRelativeToClipSpace(geoBbox: number[], coords: number[][], values: number[], maxVal: number, maxEdgeLength: number) {
    const dataRel2ClipSpace = zip(coords, values).map(o => {
        const coordsClipSpace = worldCoords2clipBbox([o[0], o[1]], geoBbox);
        return [
            255 * (coordsClipSpace[0] + 1) / 2,
            255 * (coordsClipSpace[1] + 1) / 2,
            255 * o[2] / maxVal,
            255
        ];
    });
    const nrObservations = dataRel2ClipSpace.length;
    const nextPowerOfTwo = nextPowerOf(nrObservations, 2);
    for (let i = 0; i < nextPowerOfTwo - nrObservations; i++) {
        dataRel2ClipSpace.push([0, 0, 0, 0]);
    }

    const deltaX = geoBbox[2] - geoBbox[0];
    const deltaY = geoBbox[3] - geoBbox[1];
    const maxEdgeLengthBbox = maxEdgeLength / Math.max(deltaX, deltaY);

    return { dataRel2ClipSpace, maxEdgeLengthBbox };
}

const worldCoords2clipBbox = (point: number[], bbox: number[]): number[] => {
    const xPerct = (point[0] - bbox[0]) / (bbox[2] - bbox[0]);
    const yPerct = (point[1] - bbox[1]) / (bbox[3] - bbox[1]);
    const xClip = 2 * xPerct - 1;
    const yClip = 2 * yPerct - 1;
    return [xClip, yClip];
};

const createInverseDistanceInterpolationShader = (observationDataRel2ClipSpace: number[][], maxValue: number, power: number, maxEdgeLengthBbox: number): Bundle => {

    const maxObservations = 10000;
    const inverseDistanceProgram = new Program(`#version 300 es
            precision mediump float;
            in vec4 a_position;
            in vec2 a_texturePosition;
            out vec2 v_position;
            out vec2 v_texturePosition;

            void main() {
                v_position = a_position.xy;
                v_texturePosition = a_texturePosition;
                gl_Position = vec4(a_position.xy, 0.0, 1.0);
            }
        `, `#version 300 es
            precision mediump float;
            uniform float u_power;
            uniform sampler2D u_dataTexture;
            uniform int u_nrDataPoints;
            uniform float u_maxValue;
            uniform float u_maxDistance;
            in vec2 v_position;
            in vec2 v_texturePosition;
            out vec4 outputColor;

            void main() {

                float valSum = 0.0;
                float wSum = 0.0;
                float minD = 10000.0;
                for (int i = 0; i < ${maxObservations}; i++) {
                    if (i > u_nrDataPoints) {
                        break;
                    }
                    vec4 dataPoint = texture(u_dataTexture, vec2(float(i) / float(u_nrDataPoints), 0.5));
                    if (dataPoint.w > 0.0) {  // texture is padded to next power of two with transparent 0-values.
                        vec2 coords = dataPoint.xy * 2.0 - 1.0;  // transforming coords from [0, 1] to [-1, 1]
                        float value = dataPoint.z * u_maxValue;  // transforming value from [0, 1] to [0, maxValue]

                        float d = distance(v_position, coords);
                        float w = 1.0 / pow(d, u_power);
                        valSum += value * w;
                        wSum += w;
                        if (d < minD) {
                            minD = d;
                        }
                    }
                }
                float interpolatedValue = valSum / wSum;
                float alpha = 1.0;
                if (minD > u_maxDistance) {
                    alpha = 0.0;
                }
                vec4 color = vec4(interpolatedValue / u_maxValue, 0.0, 0.0, alpha);

                outputColor = color;
            }
        `);


    const viewPort = rectangleA(2, 2);
    const inverseDistanceShader = new ArrayBundle(
        inverseDistanceProgram, {
            'a_position': new AttributeData(new Float32Array(flatten2(viewPort.vertices)), 'vec4', false),
            'a_texturePosition': new AttributeData(new Float32Array(flatten2(viewPort.texturePositions)), 'vec2', false),
        }, {
            'u_power': new UniformData('float', [power]),
            'u_nrDataPoints': new UniformData('int', [observationDataRel2ClipSpace.length]),
            'u_maxValue': new UniformData('float', [maxValue]),
            'u_maxDistance': new UniformData('float', [maxEdgeLengthBbox])
        }, {
            'u_dataTexture': new TextureData([observationDataRel2ClipSpace])
        },
        'triangles',
        viewPort.vertices.length
    );

    return inverseDistanceShader;
};

const createArrangementShader = (currentBbox: number[], interpolationDataGeoBbox: number[], colorFb: FramebufferObject): Bundle => {

    const arrangementProgram = new Program(`#version 300 es
            precision mediump float;
            in vec4 a_viewPortPosition;
            uniform vec4 u_currentBbox;
            uniform vec4 u_textureBbox;
            out vec2 v_texturePosition;

            vec2 clipSpace2geoPos(vec4 clipPos, vec4 geoBbox) {
                float xRel = (clipPos[0] + 1.0) / 2.0;
                float yRel = (clipPos[1] + 1.0) / 2.0;
                float x = xRel * (geoBbox[2] - geoBbox[0]) + geoBbox[0];
                float y = yRel * (geoBbox[3] - geoBbox[1]) + geoBbox[1];
                return vec2(x, y);
            }

            vec2 geoPos2TexturePos(vec2 geoPos, vec4 textureBbox) {
                float xRel = (geoPos[0] - textureBbox[0]) / (textureBbox[2] - textureBbox[0]);
                float yRel = (geoPos[1] - textureBbox[1]) / (textureBbox[3] - textureBbox[1]);
                return vec2(xRel, yRel);
            }

            void main() {
                vec2 geoPosition = clipSpace2geoPos(a_viewPortPosition, u_currentBbox);
                v_texturePosition = geoPos2TexturePos(geoPosition, u_textureBbox);
                gl_Position = a_viewPortPosition;
            }
        `, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            in vec2 v_texturePosition;
            out vec4 outputColor;

            void main() {
                vec4 texData = texture(u_texture, v_texturePosition);
                outputColor = texData;
            }
        `);

    const viewPort = rectangleA(2, 2);
    const arrangementShader = new ArrayBundle(arrangementProgram, {
        'a_viewPortPosition': new AttributeData(new Float32Array(flatten2(viewPort.vertices)), 'vec4', false),
    }, {
        'u_textureBbox': new UniformData('vec4', interpolationDataGeoBbox),
        'u_currentBbox': new UniformData('vec4', currentBbox)
    }, {
        'u_texture': new TextureData(colorFb.texture)
    }, 'triangles', viewPort.vertices.length);

    return arrangementShader;
};

const getBbox = (obs: number[][]): number[] => {
    const xs = obs.map(p => p[0]);
    const ys = obs.map(p => p[1]);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    return [xMin, yMin, xMax, yMax];
};

const zip = (arr0: any[], arr1: any[]): any[] => {
    const out = [];
    for (let i = 0; i < arr0.length; i++) {
        out.push(arr0[i].concat(arr1[i]));
    }
    return out;
};
