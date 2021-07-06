import ImageSource from 'ol/source/Image';
import { FeatureCollection, Point } from 'geojson';
import { ImageCanvas } from 'ol/source';
import { FramebufferObject, createFramebuffer, createDataTexture, getCurrentFramebuffersPixels } from '../../engine1/webgl';
import { Bundle, ArrayBundle, Index, UniformData, Program, Context } from '../../engine1/engine.core';
import { ElementsBundle, AttributeData } from '../../engine2/engine.core';
import { rectangleE, rectangleA } from '../shapes';
import { nextPowerOf, flatten2 } from '../math';



export function createInterpolationSource(data: FeatureCollection<Point>, projection: string): ImageSource {
    const interpolationRenderer = new InterpolationRenderer(data);

    const interpolationSource = new ImageCanvas({
        canvasFunction: (extent, imageResolution, devicePixelRatio, imageSize, projection) => {
            interpolationRenderer.setCanvasSize(imageSize[0], imageSize[1]);
            interpolationRenderer.setBbox(extent);
            const canvas = interpolationRenderer.renderFrame();
            return canvas;
        },
        projection, ratio: 1
    });

    return interpolationSource;
}


/**
 * This renderer runs three shaders in a row.
 *  1. interpolationShader: takes every observation at every pixel and executes the interpolation. The values are stored in `valueFb`.
 *  2. colorizationShader: uses the interpolated values from valueFb to apply the colorization according to the given colorRamp and smoothing-options.
 *  3. arrangementShader: the previous shaders have moved the data in the center of the canvas. this shader now arranges the pixels to the correct position relative to the map.
 *
 * Only the third shader needs to be executed with every frame. This way, the operation-heavy interpolation does not slow down the map.
 * It generally makes sense to arrange shaders in such a way that all openlayers-perspective-operations occur in the last shader.
 *
 * valueFb is also being used to handle click events: from this structure we get the actual value at a pixel when the user clicks.
 *
 * Note a few caveats.
 * This implementation is not really intended for updating observations, maxEdgeLength or colorRamps at runtime. These parameters are rather intended for the developer to set once.
 * While you can change the color-ramp at runtime, it's length is hardcoded in the colorization shader, so you'd have to recompile it to properly reflect the new ramp.
 * In the same way, the interpolation-shader has the number of observations baked into it. When new data becomes available, you must recompile the interpolation shader.
 */
 export class InterpolationRenderer {

    private webGlCanvas: HTMLCanvasElement;
    private context: Context;
    private interpolationShader: Bundle;
    private valueFb: FramebufferObject;
    private colorizationShader: Bundle;
    private colorFb: FramebufferObject;
    private arrangementShader: Bundle;

    private bbox: number[];
    private interpolatedValues: Uint8Array;

    constructor(data: FeatureCollection<Point>, private settings: InterpolationRendererSettings) {

        // setting up HTML element
        this.webGlCanvas = document.createElement('canvas');
        this.webGlCanvas.style.setProperty('position', 'absolute');
        this.webGlCanvas.style.setProperty('left', '0px');
        this.webGlCanvas.style.setProperty('top', '0px');
        this.webGlCanvas.style.setProperty('width', '100%');
        this.webGlCanvas.style.setProperty('height', '100%');
        this.webGlCanvas.width = 1000;  // <-- make smaller for better performance
        this.webGlCanvas.height = 1000;  // <-- make smaller for better performance
        this.context = new Context(this.webGlCanvas.getContext('webgl'), false);

        // preparing data
        const { coords, values, bboxDelta, maxVal } = this.parseData(data, this.settings.valueProperty, this.settings.maxEdgeLength);
        const { observationsBbox, maxEdgeLengthBbox } = this.parseDataBbox(bboxDelta, coords, values, maxVal, this.settings.maxEdgeLength);
        this.bbox = bboxDelta;

        // setting up shaders
        const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        this.interpolationShader = createInverseDistanceInterpolationShader(this.gl, observationsBbox, maxVal, this.settings.power, maxEdgeLengthBbox);
        this.valueFb = createFramebuffer()  // new Framebuffer(this.gl, this.webGlCanvas.width, this.webGlCanvas.height);
        this.colorizationShader = createColorizationShader(this.gl, this.settings.colorRamp, maxVal, this.settings.smooth, this.valueFb);
        this.colorFb = new Framebuffer(this.gl, this.webGlCanvas.width, this.webGlCanvas.height);
        this.arrangementShader = createArrangementShader(this.gl, identity, identity, bboxDelta, this.colorFb);

        // running first two shaders once
        this.runInterpolationShader(this.valueFb);
        this.runColorizationShader(this.colorFb);
    }

    prepareFrame(projection: string): boolean {

        if (projection !== this.projection) {
            this.projection = projection;
            const { coords, values, bboxDelta, maxVal } = this.parseData(source, this.settings.valueProperty, this.settings.maxEdgeLength);
            const { observationsBbox, maxEdgeLengthBbox } = this.parseDataBbox(bboxDelta, coords, values, maxVal, this.settings.maxEdgeLength);
            this.updateInterpolationShader(this.settings.power, observationsBbox, maxEdgeLengthBbox);
            this.runInterpolationShader(this.valueFb.fbo);
            this.runColorizationShader(this.colorFb.fbo);
            this.bbox = bboxDelta;
        }

        const c2pT = frameState.coordinateToPixelTransform;
        // using frameState.size instead of this.webGlCanvas.clientWidth because the latter is null when layer invisible.
        this.updateArrangementShader(c2pT, frameState.size[0], frameState.size[1], this.bbox);
        return true;
    }

    renderFrame(): HTMLElement {
        this.runArrangementShader();
        return this.webGlCanvas;
    }


    public updateSettings(newSettings: InterpolationRendererSettings) {
        const oldSettings = this.settings;
        this.settings = newSettings;
        if (newSettings.power !== oldSettings.power) {
            this.updateInterpolationShader(newSettings.power);
            this.runInterpolationShader(this.valueFb);
            this.updateColorizationShader(newSettings.smooth);
            this.runColorizationShader(this.colorFb);
        } else if (newSettings.smooth !== oldSettings.smooth) {
            this.updateColorizationShader(newSettings.smooth);
            this.runColorizationShader(this.colorFb);
        }
    }

    /**
     * Called at every renderFrame. Fast.
     */
    private updateArrangementShader(coordinateToPixelTransform: number[], canvasWidth: number, canvasHeight: number, bbox: number[]): void {
        const world2pix = [
            [coordinateToPixelTransform[0], coordinateToPixelTransform[1], 0.],
            [coordinateToPixelTransform[2], coordinateToPixelTransform[3], 0.],
            [coordinateToPixelTransform[4], coordinateToPixelTransform[5], 1.]
        ];
        const pix2clip = [
            [1. / (canvasWidth / 2), 0., 0.],
            [0, -1. / (canvasHeight / 2), 0.],
            [-1., 1., 1.]
        ];
        this.arrangementShader.updateUniformData(this.context, 'u_world2pix', flatten2(world2pix));
        this.arrangementShader.updateUniformData(this.context, 'u_pix2clip', flatten2(pix2clip));
        this.arrangementShader.updateUniformData(this.context, 'u_bbox', bbox);
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
    private updateInterpolationShader(power: number, observations?: number[][], maxEdgeLengthBbox?: number): void {
        this.interpolationShader.updateUniformData(this.context, 'u_power', [power]);
        if (observations) {
            this.interpolationShader.updateTextureData(this.context, 'u_dataTexture', [observations]);
        }
        if (maxEdgeLengthBbox) {
            this.interpolationShader.updateUniformData(this.context, 'u_maxDistance', [maxEdgeLengthBbox]);
        }
    }

    /**
     * Slow! Avoid calling this too often.
     */
    private runInterpolationShader(target?: FramebufferObject): void {
        this.interpolationShader.bind(this.context);
        this.interpolationShader.draw(this.context, [0, 0, 0, 0], target);
        if (this.settings.storeInterpolatedPixelData) {
            this.interpolatedValues = getCurrentFramebuffersPixels(this.webGlCanvas) as Uint8Array;
        }
    }

    /**
     * Slow! Avoid calling this too often.
     */
    private updateColorizationShader(smooth: boolean): void {
        // this.colorizationShader.updateUniformData(this.gl, 'u_colorRampValues', colorRamp.map(e => e.val));
        // this.colorizationShader.updateUniformData(this.gl, 'u_colorRampColors', flattenRecursive( colorRamp.map(e => e.rgb) ));
        this.colorizationShader.updateUniformData(this.context, 'u_smooth', [smooth ? 1 : 0]);
    }

    /**
     * Slow! Avoid calling this too often.
     */
    private runColorizationShader(target?: FramebufferObject): void {
        this.colorizationShader.bind(this.context);
        this.colorizationShader.draw(this.context, [0, 0, 0, 0], target);
    }

    private parseData(source: FeatureCollection<Point>, valueProperty: string, maxEdgeLength: number) {
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
        const bboxDelta = [
            bbox[0] - maxEdgeLength,
            bbox[1] - maxEdgeLength,
            bbox[2] + addX + maxEdgeLength,
            bbox[3] + addY + maxEdgeLength
        ];
        const maxVal = values.reduce((prev, curr) => curr > prev ? curr : prev, 0);

        return {
            coords, values, bboxDelta, maxVal
        };
    }

    private parseDataBbox(bbox: number[], coords: number[][], values: number[], maxVal: number, maxEdgeLength: number) {
        const observationsBbox = zip(coords, values).map(o => {
            const coordsBbox = worldCoords2clipBbox([o[0], o[1]], bbox);
            return [
                255 * (coordsBbox[0] + 1) / 2,
                255 * (coordsBbox[1] + 1) / 2,
                255 * o[2] / maxVal,
                255
            ];
        });
        const nrObservations = observationsBbox.length;
        const nextPowerOfTwo = nextPowerOf(nrObservations, 2);
        for (let i = 0; i < nextPowerOfTwo - nrObservations; i++) {
            observationsBbox.push([0, 0, 0, 0]);
        }

        const deltaX = bbox[2] - bbox[0];
        const deltaY = bbox[3] - bbox[1];
        const maxEdgeLengthBbox = maxEdgeLength / Math.max(deltaX, deltaY);

        return { observationsBbox, maxEdgeLengthBbox };
    }
}

const worldCoords2clipBbox = (point: number[], bbox: number[]): number[] => {
    const xPerct = (point[0] - bbox[0]) / (bbox[2] - bbox[0]);
    const yPerct = (point[1] - bbox[1]) / (bbox[3] - bbox[1]);
    const xClip = 2 * xPerct - 1;
    const yClip = 2 * yPerct - 1;
    return [xClip, yClip];
};

const createInverseDistanceInterpolationShader = (observationsBbox: number[][], maxValue: number, power: number, maxEdgeLengthBbox: number): Bundle => {

    const maxObservations = 10000;
    const inverseDistanceProgram = new Program(`
            precision mediump float;
            attribute vec3 a_position;
            attribute vec2 a_texturePosition;
            varying vec2 v_position;
            varying vec2 v_texturePosition;

            void main() {
                v_position = a_position.xy;
                v_texturePosition = a_texturePosition;
                gl_Position = vec4(a_position.xy, 0.0, 1.0);
            }
        `, `
            precision mediump float;
            uniform float u_power;
            uniform sampler2D u_dataTexture;
            uniform int u_nrDataPoints;
            uniform float u_maxValue;
            uniform float u_maxDistance;
            varying vec2 v_position;
            varying vec2 v_texturePosition;

            void main() {

                float valSum = 0.0;
                float wSum = 0.0;
                float minD = 10000.0;
                for (int i = 0; i < ${maxObservations}; i++) {
                    if (i > u_nrDataPoints) {
                        break;
                    }
                    vec4 dataPoint = texture2D(u_dataTexture, vec2(float(i) / float(u_nrDataPoints), 0.5));
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

                gl_FragColor = color;
            }
        `);


    const viewPort = rectangleE(2, 2);
    const inverseDistanceShader = new ElementsBundle(
        inverseDistanceProgram, {
            'a_position': new AttributeData(viewPort.vertices, 'vec3', false),
            'a_texturePosition': new AttributeData(viewPort.texturePositions, 'vec2', false),
        }, {
            'u_power': new UniformData('float', [power]),
            'u_nrDataPoints': new UniformData('int', [observationsBbox.length]),
            'u_maxValue': new UniformData('float', [maxValue]),
            'u_maxDistance': new UniformData('float', [maxEdgeLengthBbox])
        }, {
            'u_dataTexture': createDataTexture([observationsBbox])
        },
        'triangles', new Index(viewPort.vertexIndices)
    );

    return inverseDistanceShader;
};

const createColorizationShader = (colorRamp: ColorRamp, maxVal: number, smooth: boolean, valueFb: Framebuffer): Bundle => {

    const maxColorRampValues = 15;
    const colorizationProgram = new Program(`
            precision mediump float;
            attribute vec2 a_position;
            attribute vec2 a_textureCoord;
            varying vec2 v_textureCoord;

            void main() {
                v_textureCoord = a_textureCoord;
                gl_Position = vec4(a_position.xy, 0.0, 1.0);
            }
        `, `
            precision mediump float;
            uniform float u_colorRampValues[${maxColorRampValues}];
            uniform vec3 u_colorRampColors[${maxColorRampValues}];
            uniform int u_nrColorRampValues;
            uniform float u_maxValue;
            uniform bool u_smooth;
            uniform sampler2D u_valueTexture;
            varying vec2 v_textureCoord;

            vec3 valueToSmoothColor(in float value) {
                if (value < u_colorRampValues[0]) {
                    return u_colorRampColors[0];
                }
                for (int i = 1; i < ${maxColorRampValues}; i++) {
                    if (i > u_nrColorRampValues) {
                        break;
                    }
                    if (value < u_colorRampValues[i]) {
                        float alpha = (value - u_colorRampValues[i-1]) / (u_colorRampValues[i] - u_colorRampValues[i-1]);
                        vec3 color = alpha * (u_colorRampColors[i] - u_colorRampColors[i-1]) + u_colorRampColors[i-1];
                        return color;
                    }
                    if (i == u_nrColorRampValues) {
                        return u_colorRampColors[i];
                    }
                }
            }

            vec3 valueToStepColor(in float value) {
                for (int i = 0; i < ${maxColorRampValues}; i++) {
                    if (i > u_nrColorRampValues) {
                        break;
                    }
                    if (value < u_colorRampValues[i]) {
                        return u_colorRampColors[i];
                    }
                    if (i == u_nrColorRampValues) {
                        return u_colorRampColors[i];
                    }
                }
            }

            void main() {
                vec4 pixelData = texture2D(u_valueTexture, v_textureCoord);
                float val = pixelData.r * u_maxValue;
                float alpha = pixelData.w;
                vec3 rgb = vec3(0.0, 0.0, 0.0);
                if (alpha > 0.01) {
                    if (u_smooth) {
                        rgb = valueToSmoothColor(val);
                    } else {
                        rgb = valueToStepColor(val);
                    }
                }
                gl_FragColor = vec4(rgb.x / 255.0, rgb.y / 255.0, rgb.z / 255.0, alpha);
            }
        `);

    const rectangle = rectangleA(2.0, 2.0);
    const colorizationShader = new ArrayBundle(colorizationProgram, {
        'a_position': new AttributeData(rectangle.vertices, 'vec2', false),
        'a_textureCoord': new AttributeData(rectangle.texturePositions, 'vec2', false)
    }, {
        'u_colorRampValues': new UniformData('float[]', colorRamp.map(e => e.val)),
        'u_colorRampColors': new UniformData('vec3[]', flattenRecursive( colorRamp.map(e => e.rgb) )),
        'u_nrColorRampValues': new UniformData('int', [colorRamp.length]),
        'u_maxValue': new UniformData('float', [maxVal]),
        'u_smooth': new UniformData('bool', [smooth ? 1 : 0]),
    }, {
        new Texture(gl, colorizationProgram, 'u_valueTexture', valueFb.fbo.texture, 0)
    });

    return colorizationShader;
};


const createArrangementShader = (world2pix: number[][], pix2clip: number[][], bbox: number[], colorFb: Framebuffer): Shader => {
    const arrangementProgram = new Program(`
            precision mediump float;
            attribute vec3 a_pos;
            attribute vec2 a_posTexture;
            uniform mat3 u_world2pix;
            uniform mat3 u_pix2clip;
            uniform vec4 u_bbox;
            varying vec2 v_posTexture;

            vec2 clipBbx2worldCoords(vec2 clipCoords, vec4 bbox) {
                float xPerct = ( clipCoords.x + 1.0 ) / 2.0;
                float yPerct = ( clipCoords.y + 1.0 ) / 2.0;
                float xWorld = xPerct * (bbox.z - bbox.x) + bbox.x;
                float yWorld = yPerct * (bbox.w - bbox.y) + bbox.y;
                return vec2(xWorld, yWorld);
            }

            void main() {
                v_posTexture = a_posTexture;
                vec2 worldPos = clipBbx2worldCoords(a_pos.xy, u_bbox);
                vec3 clipPos = u_pix2clip * u_world2pix * vec3(worldPos.xy, 1.0);
                gl_Position = vec4(clipPos.xy, 0.0, 1.0);
            }
        `, `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_posTexture;

            void main() {
                gl_FragColor = texture2D(u_texture, v_posTexture);
            }
        `);

    const rectangle = rectangleA(2, 2);
    const arrangementShader = new ArrayBundle(arrangementProgram, {
        'a_pos': new AttributeData(rectangle.vertices),
        'a_posTexture': new AttributeData(rectangle.texturePositions),
    }, {
        'u_world2pix': new UniformData('mat3', flattenRecursive(world2pix)),
        'u_pix2clip': new UniformData('mat3', flattenRecursive(pix2clip)),
        'u_bbox': new UniformData('vec4', bbox)
    }, {
        new Texture(gl, arrangementProgram, 'u_texture', colorFb.fbo.texture, 0)
    });

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
