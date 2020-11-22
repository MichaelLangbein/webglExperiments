import { ElementsBundle, Program, Index, AttributeData, Context, UniformData, ArrayBundle, TextureData } from '../../engine/engine.core';
import {setup3dScene } from '../../engine/webgl';

import earcut from 'earcut';
import { bboxPolygon } from 'turf';

import { Map, Feature, View } from 'ol';
import { Layer, Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import { Pixel } from 'ol/pixel';
import { Coordinate } from 'ol/coordinate';
import 'ol/ol.css';
import { Style, Fill } from 'ol/style';
import { FeatureLike } from 'ol/Feature';
import { rectangleA } from '../../engine/engine.shapes';
import Point from 'ol/geom/Point';
const Stats = require('stats.js');

const body = document.getElementById('body') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const button = document.getElementById('button') as HTMLButtonElement;
const slider = document.getElementById('xrange') as HTMLInputElement;
const fpser = document.getElementById('fpser') as HTMLDivElement;
canvas.style.setProperty('height', '0px');





/***************************************************************************************
 *                                                                                     *
 ***************************************************************************************/


/**
 * # Interpolation Renderer
 *
 * Some background on how we came to chose this particular structure.
 *
 * What we want to do is the following:
 *   **At every pixel, interpolate using the *n* nearest data-points**
 *
 * We can do this several ways:
 * - **Option 1**: do all calculation in fragment-shader
 *      - store all data-points in a data-texture
 *      - in the fragment-shader, find the nearest *n* data-points, and interpolate.
 *      - Estimated time: N * P / T  (N: # data-points, P: # pixels, T: # threads on GPU)
 *      - (Note: the same runtime would be required if we were to pre-compute the distance matrix on the CPU and then have the fragment-shader find the appropriate row in the matrix)
 * - **Option 2**: pre-calculate the nearest points in vertex-shader, interpolate using those points in fragment-shader
 *      - store all data-points in a data-texture
 *      - create voronoi diagram and transform into an attribute, all that on CPU
 *      - vertex-shader: per vertex, find *n* nearest neighbors from data-texture <-- Time: V * N / T (V: #vertices; approx N+2*sqrt(N) for a regular grid, let's just say V=N)
 *      - fragment-shader: interpolate using those precalculated neighbors. <-- Time: P / T
 *      - Estimated total time: T_voronoi + (N^2 + P) / T
 *
 * time(option2) / time(option1) = (N^2 + P) / (N * P) = N/P + 1/N =apprx N/P
 *
 * ... meaning that option 2 is faster than option 1 as long as there are less data-points than there are pixels to render to.
 * This is almost always the case - it's normal to have 1Mio Pixels, but rare to have that many data-points. So we chose option 2.
 */
export class WebGLInterpolationRenderer extends LayerRenderer<Layer<VectorSource<Point>>> {
    context: Context;
    interpolationShader: ArrayBundle;
    canvas: HTMLCanvasElement;
    constructor(layer: Layer<VectorSource<Point>>, valueKey: string) {
        super(layer);

        const dataPoints = layer.getSource().getFeatures().map(f => {
            const coords = f.getGeometry().getCoordinates();
            const value = f.getProperties()[valueKey];
            return [coords[0], coords[1], +value, 1];
        });
        const xMin = Math.min(... dataPoints.map(p => p[0]));
        const xMax = Math.max(... dataPoints.map(p => p[0]));
        const yMin = Math.min(... dataPoints.map(p => p[1]));
        const yMax = Math.max(... dataPoints.map(p => p[1]));
        const dataBounds = [
            [xMin, yMin], [xMax, yMin], [xMin, yMax],
            [xMin, yMax], [xMax, yMin], [xMax, yMax]
        ];
        const dataTexture = new TextureData([dataPoints], 'float4');

        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = 600;
        canvas.height = 600;
        canvas.style.setProperty('position', 'absolute');
        canvas.style.setProperty('left', '0px');
        canvas.style.setProperty('top', '0px');
        canvas.style.setProperty('width', '100%');
        canvas.style.setProperty('height', '100%');
        const context = new Context(canvas.getContext('webgl2') as WebGL2RenderingContext, true);

        const interpolationShader = new ArrayBundle(new Program(
            `#version 300 es
            precision lowp float;
            in vec2 a_dataBounds;
            uniform vec4 u_screenBbox;
            out vec2 v_position;

            void main() {
                v_position = a_dataBounds;
                gl_Position = vec4( -1.0 + 2.0 * (a_dataBounds.x - u_screenBbox.x) / (u_screenBbox.z - u_screenBbox.x),  -1.0 + 2.0 * (a_dataBounds.y - u_screenBbox.y) / (u_screenBbox.w - u_screenBbox.y), 0, 1);
            }
        `, `#version 300 es
            precision lowp float;
            uniform sampler2D u_dataTexture;
            uniform int u_nrDataPoints;
            in vec2 v_position;
            out vec4 color;

            void main() {
                float val = 0.0;
                float minDistance = 100000.0;
                for(int i = 100; i < 200; i++) {
                    float pos = float(i) / float(u_nrDataPoints);
                    vec4 data = texture(u_dataTexture, vec2(pos, 0.0));
                    float iDistance = distance(data.xy, v_position);
                    if (iDistance < minDistance) {
                        val = data.z;
                        minDistance = iDistance;
                    }
                }
                // float val = texture(u_dataTexture, vec2(0.8, 0.0)).z / 10.0 + 0.0 * u_nrDataPoints;
                color = vec4(val, val, val, 1.0);
            }
        `), {
            'a_dataBounds': new AttributeData(dataBounds.flat(), 'vec2', true)
        }, {
            'u_screenBbox': new UniformData('vec4', [0, 1, 2, 3]),
            'u_nrDataPoints': new UniformData('int', [dataPoints.length])
        }, {
            'u_dataTexture': dataTexture,
        }, 'triangles', dataBounds.length);


        interpolationShader.upload(context);
        interpolationShader.initVertexArray(context);

        this.context = context;
        this.interpolationShader = interpolationShader;
        this.canvas = canvas;
    }

    prepareFrame(frameState: FrameState): boolean {
        return true;
    }

    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
        const bbox = frameState.extent;
        this.interpolationShader.updateUniformData(this.context, 'u_screenBbox', bbox);
        this.interpolationShader.bind(this.context);
        this.interpolationShader.draw(this.context, [0, 0, 0, 0]);
        return this.canvas;
    }

    /**
     * @param pixel Pixel.
     * @param frameState FrameState.
     * @param hitTolerance Hit tolerance in pixels.
     * @return {Uint8ClampedArray|Uint8Array} The result.  If there is no data at the pixel
     *    location, null will be returned.  If there is data, but pixel values cannot be
     *    returned, and empty array will be returned.
     */
    getDataAtPixel(pixel: Pixel, frameState: FrameState, hitTolerance: number) {
        return new Uint8Array([Math.random(), Math.random(), Math.random(), Math.random()]);
    }

    /**
     * @param coordinate Coordinate.
     * @param frameState Frame state.
     * @param hitTolerance Hit tolerance in pixels.
     * @param callback Feature callback.
     * @param declutteredFeatures Decluttered features.
     * @return Callback result.
     * @template T
     */
    forEachFeatureAtCoordinate(coordinate: Coordinate, frameState: FrameState, hitTolerance: number, callback: (f: Feature, l: Layer) => any, declutteredFeatures: Feature[]) {
        const layer = this.getLayer();
        const features = layer.getSource().getFeaturesAtCoordinate(coordinate);
        for (const feature of features) {
            return callback(feature, layer);
        }
    }
}


export class WebGlPolygonLayer extends Layer<VectorSource<Point>> {

    constructor(opt_options: any) {
        super(opt_options);
    }

    createRenderer(): LayerRenderer<Layer<VectorSource<Point>>> {
        const renderer = new WebGLInterpolationRenderer(this, 'value');
        return renderer;
    }
}



/***************************************************************************************
 *                                                                                     *
 ***************************************************************************************/


const features = [];
const start = [0, 0];
const w = 0.125;
const nrRows = 100;
const nrCols = 100;
console.log(`creating ${nrRows} * ${nrCols} features ...`);
for (let i = 0; i < nrRows; i++) {
    for (let j = 0; j < nrCols; j++) {
        features.push({
            type: 'Feature',
            properties: {
                id: i * nrCols + j,
                value: Math.random() * 10
            },
            geometry: {
              type: 'Point',
              coordinates: [i * w, j * w]
            }
        });
    }
}
const featureCollection = {
    type: 'FeatureCollection',
    features: features
};

const bg = new TileLayer({
    source: new OSM()
});

const view = new View({
    center: [start[0] + w * nrCols / 2, start[1] + w * nrRows / 2],
    zoom: 4,
    projection: 'EPSG:4326'
});


const dataLayer = new WebGlPolygonLayer({
    source: new VectorSource({
        features: new GeoJSON().readFeatures(featureCollection)
    }),
});

const map = new Map({
    layers: [bg, dataLayer],
    view: view,
    target: mapDiv
});


map.on('singleclick', function (evt) {
    var coordinate = evt.coordinate;
    map.forEachFeatureAtPixel(evt.pixel, (f: FeatureLike, l: Layer) => {
        console.log(f.getProperties());
    });
});


var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
fpser.appendChild( stats.dom );
const renderer = map.getRenderer();
const oldRenderFunction = renderer.renderFrame.bind(renderer);
map.getRenderer().renderFrame = function(frameState: any) {
   stats.begin();
    oldRenderFunction(frameState);
    stats.end();
};