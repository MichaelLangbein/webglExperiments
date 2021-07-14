import ImageSource from 'ol/source/Image';
import { FeatureCollection, Point } from 'geojson';
import { ImageCanvas } from 'ol/source';
import { Bundle, ArrayBundle, UniformData, Program, Context, AttributeData, TextureData } from '../../../engine1/engine.core';
import { rectangleA } from '../../shapes';
import { nextPowerOf, flatten2 } from '../../math';





export function createInterpolationSource(
    data: FeatureCollection<Point>,
    power: number, valueProperty: string, maxEdgeLength: number): ImageSource {

    const interpolationRenderer = new InterpolationRenderer(data, power, valueProperty, maxEdgeLength);

    const interpolationSource = new ImageCanvas({
        canvasFunction: function(extent, imageResolution, devicePixelRatio, imageSize, projection) {
            // @ts-ignore
            const renderer = this.get('renderer');
            renderer.setCanvasSize(imageSize[0], imageSize[1]);
            renderer.setBbox(extent);
            const canvas = renderer.draw();
            return canvas;
        },
        projection: 'EPSG:4326',
        ratio: 1
    });
    interpolationSource.set('renderer', interpolationRenderer);

    return interpolationSource;
}


 export class InterpolationRenderer {

    private webGlCanvas: HTMLCanvasElement;
    private context: Context;
    private shader: Bundle;

    constructor(data: FeatureCollection<Point>,
        private power: number,
        private valueProperty: string,
        private maxEdgeLength: number) {

        // setting up HTML element
        this.webGlCanvas = document.createElement('canvas');
        this.webGlCanvas.style.setProperty('position', 'absolute');
        this.webGlCanvas.style.setProperty('left', '0px');
        this.webGlCanvas.style.setProperty('top', '0px');
        this.webGlCanvas.style.setProperty('width', '100%');
        this.webGlCanvas.style.setProperty('height', '100%');
        this.webGlCanvas.width = 500;
        this.webGlCanvas.height = 500;
        this.context = new Context(this.webGlCanvas.getContext('webgl'), false);

        // preparing data
        const currentViewPortBbox = [0, 0, 360, 180];
        const coords = data.features.map(f => f.geometry.coordinates);
        const values = data.features.map(f => parseFloat(f.properties[this.valueProperty]));
        const dataBbox = getBbox(coords);
        const maxVal = Math.max(... values);
        const dataRel2ClipSpace = data2TextureRelativeToClipSpace(dataBbox, coords, values, maxVal, this.maxEdgeLength);

        // setting up shaders
        this.shader = createShader(currentViewPortBbox, dataBbox, dataRel2ClipSpace, maxVal, this.power, maxEdgeLength);
        this.shader.upload(this.context);
        this.shader.initVertexArray(this.context);
        this.shader.bind(this.context);

    }

    draw(): HTMLCanvasElement {
        this.shader.draw(this.context, [0, 0, 0, 0]);
        return this.webGlCanvas;
    }

    setBbox(extent: [number, number, number, number]) {
        this.shader.updateUniformData(this.context, 'u_currentGeoBbox', extent);
    }

    setCanvasSize(width: number, height: number) {
        if (width !== this.webGlCanvas.width || height !== this.webGlCanvas.height) {
            this.webGlCanvas.width = width;
            this.webGlCanvas.height = height;
        }
    }

    setPower(power: number) {
        if (power !== this.power) {
            this.power = power;
            this.shader.updateUniformData(this.context, 'u_power', [power]);
        }
    }

}


function data2TextureRelativeToClipSpace(geoBbox: number[], coords: number[][], values: number[], maxVal: number, maxEdgeLength: number) {
    const dataRel2ClipSpace = zip(coords, values).map(o => {
        return [
            255 * (o[0] - geoBbox[0]) / (geoBbox[2] - geoBbox[0]),
            255 * (o[1] - geoBbox[1]) / (geoBbox[3] - geoBbox[1]),
            255 * o[2] / maxVal,
            255
        ];
    });
    const nrObservations = dataRel2ClipSpace.length;
    const nextPowerOfTwo = nextPowerOf(nrObservations, 2);
    for (let i = 0; i < nextPowerOfTwo - nrObservations; i++) {
        dataRel2ClipSpace.push([0, 0, 0, 0]);
    }
    return dataRel2ClipSpace;
}


const createShader = (
    currentViewPortBbox: number[], observationsBbox: number[],
    observationDataRel2ClipSpace: number[][],
    maxValue: number, power: number, maxEdgeLengthBbox: number): Bundle => {

    const inverseDistanceProgram = new Program(`
            precision mediump float;
            attribute vec4 a_viewPortPos;
            uniform   vec4 u_currentGeoBbox;
            varying   vec2 v_geoPosition;

            vec2 clipSpace2GeoPos(vec4 clipSpacePos, vec4 currentGeoBbox) {
                float xRel = (clipSpacePos[0] + 1.0) / 2.0;
                float yRel = (clipSpacePos[1] + 1.0) / 2.0;
                float xGeo = xRel * (currentGeoBbox[2] - currentGeoBbox[0]) + currentGeoBbox[0];
                float yGeo = yRel * (currentGeoBbox[3] - currentGeoBbox[1]) + currentGeoBbox[1];
                return vec2(xGeo, yGeo);
            }

            void main() {
                v_geoPosition = clipSpace2GeoPos(a_viewPortPos, u_currentGeoBbox);   // mapping current position to geo-position
                gl_Position = a_viewPortPos;                                         // polygon remains [-1, 1]x[-1, 1]
            }
        `, `
            precision mediump float;
            uniform float     u_power;
            uniform sampler2D u_dataTexture;
            uniform int       u_nrDataPoints;
            uniform float     u_maxValue;
            uniform float     u_maxDistance;
            uniform vec4      u_dataGeoBbox;
            varying vec2      v_geoPosition;

            vec2 rel2GeoCoords(vec2 rel, vec4 dataGeoBbox) {
                float xGeo = rel[0] * (dataGeoBbox[2] - dataGeoBbox[0]) + dataGeoBbox[0];
                float yGeo = rel[1] * (dataGeoBbox[3] - dataGeoBbox[1]) + dataGeoBbox[1];
                return vec2(xGeo, yGeo);
            }

            void main() {
                float valSum = 0.0;
                float wSum = 0.0;
                float minDistance = 1000000.0;
                for (int i = 0; i < 10000; i++) {
                    if (i > u_nrDataPoints) { break; }

                    vec4 dataPoint = texture2D(u_dataTexture, vec2(float(i) / float(u_nrDataPoints), 1.0));
                    if (dataPoint.w > 0.0) {  // texture is padded to next power of two with transparent 0-values.
                        vec2 coords = rel2GeoCoords(dataPoint.xy, u_dataGeoBbox);  // transforming coords from [0, 1] to [geo]
                        float value = dataPoint.z * u_maxValue;                    // transforming value from [0, 1] to [0, maxValue]

                        float d = distance(v_geoPosition, coords);
                        if (d < minDistance) { minDistance = d; }

                        float w = 1.0 / pow(d, u_power);
                        valSum += value * w;
                        wSum += w;
                    }
                }
                float interpolatedValue = valSum / wSum;
                float alpha = 1.0;
                if (minDistance > u_maxDistance) {
                    alpha = 0.0;
                }
                gl_FragColor = vec4(interpolatedValue / u_maxValue, 0.0, 0.0, alpha);
            }
        `);


    const viewPort = rectangleA(2, 2);
    const inverseDistanceShader = new ArrayBundle(
        inverseDistanceProgram, {
            'a_viewPortPos':    new AttributeData(new Float32Array(flatten2(viewPort.vertices)), 'vec4', false),
        }, {
            'u_power':          new UniformData('float', [power]),
            'u_nrDataPoints':   new UniformData('int',   [observationDataRel2ClipSpace.length]),
            'u_maxValue':       new UniformData('float', [maxValue]),
            'u_maxDistance':    new UniformData('float', [maxEdgeLengthBbox]),
            'u_dataGeoBbox':    new UniformData('vec4',  observationsBbox),
            'u_currentGeoBbox': new UniformData('vec4',  currentViewPortBbox)
        }, {
            'u_dataTexture':    new TextureData([observationDataRel2ClipSpace])
        },
        'triangles',
        viewPort.vertices.length
    );

    return inverseDistanceShader;
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
