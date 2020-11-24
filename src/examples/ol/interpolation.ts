import { Program, AttributeData, Context, UniformData, ArrayBundle, TextureData } from '../../engine/engine.core';
import { Delaunay } from 'd3-delaunay';
import earcut from 'earcut';

import { PCA } from 'ml-pca';
import { Matrix, inverse, MatrixColumnSelectionView } from 'ml-matrix';

import { Map, Feature, View } from 'ol';
import { Layer, Tile as TileLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import { Pixel } from 'ol/pixel';
import { Coordinate } from 'ol/coordinate';
import 'ol/ol.css';
import { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import { scalarProduct, vectorAddition } from '../../engine/math';
import VectorLayer from 'ol/layer/Vector';
import { Style, Fill, Stroke, Circle } from 'ol/style';
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
 *  - **Option 3**: get all neighbors already during Delaunay-triangulation
 *      - Estimated total time: T_voronoi + P/T
 *
 * time(option2) / time(option1) = (N^2 + P) / (N * P) = N/P + 1/N =apprx N/P
 *
 * ... meaning that option 2 is faster than option 1 as long as there are less data-points than there are pixels to render to.
 * This is almost always the case - it's normal to have 1Mio Pixels, but rare to have that many data-points. So we chose option 2.
 */
export class WebGLInterpolationRenderer extends LayerRenderer<Layer<VectorSource<Point>>> {
    
    private canvas: HTMLCanvasElement;

    constructor(layer: Layer<VectorSource<Point>>, valueKey: string) {
        super(layer);

        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = 600;
        canvas.height = 600;
        canvas.style.setProperty('position', 'absolute');
        canvas.style.setProperty('left', '0px');
        canvas.style.setProperty('top', '0px');
        canvas.style.setProperty('width', '100%');
        canvas.style.setProperty('height', '100%');

        this.canvas = canvas;
    }

    prepareFrame(frameState: FrameState): boolean {
        return true;
    }

    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
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
const wX = 0.125;
const wY = 0.225;
const nrRows = 20;
const nrCols = 20;
const xDir = [1, 0.5];
const yDir = [-0.5, 1];
console.log(`creating ${nrRows} * ${nrCols} features ...`);
for (let i = 0; i < nrRows; i++) {
    for (let j = 0; j < nrCols; j++) {
        if (Math.random() < 0.8) {
            const pos = vectorAddition(vectorAddition(start, scalarProduct(wX * i, xDir)), scalarProduct(wY * j, yDir));

            features.push({
                type: 'Feature',
                properties: {
                    id: i * nrCols + j,
                    value: [i, j]
                },
                geometry: {
                  type: 'Point',
                  coordinates: pos
                }
            });
        }
    }
}
const featureCollection = {
    type: 'FeatureCollection',
    features: features
};

const bg = new TileLayer({
    source: new OSM()
});


function styleFunc(f: any, r: number) {
    const val = f.getProperties()['value'];
    return new Style({
        image: new Circle({
            radius: 5,
            fill: new Fill({
                color: `rgba(${val[0] * 10 % 255}, ${val[1] * 10 % 255}, 0, 1)`,
            }),
        })
    });
}

const dataLayer = new VectorLayer({
    source: new VectorSource({
        features: new GeoJSON().readFeatures(featureCollection),
    }),
    style: styleFunc
});


function reprojectData(data: number[][]) {
    // const xMean = data.map(d => d[0]).reduce((carry, val) => carry + val, 0) / data.length;
    // const yMean = data.map(d => d[1]).reduce((carry, val) => carry + val, 0) / data.length;
    const pca = new PCA(data);
    const eigenVectors = pca.getEigenvectors();
    const T = inverse(eigenVectors);
    const reprojectedData = data
        // .map(d => [d[0] - xMean, d[1] - yMean])
        .map(d => Matrix.columnVector(d))
        .map(d => T.mmul(d))
        .map(m => m.getColumn(0));
    return reprojectedData;
}


const coords = dataLayer.getSource().getFeatures().map(f => (f.getGeometry() as Point).getCoordinates());
const vals = dataLayer.getSource().getFeatures().map(f => f.getProperties()['value']);
const reprojectedCoords = reprojectData(coords);
const data: {coords: number[], val: number[]}[] = [];
for (let i = 0; i < vals.length; i++) {
    data.push({
        coords: reprojectedCoords[i],
        val: vals[i]
    });
}

const deltaY = 0.1;
const sortedReprojectedData = data.sort((a, b) => {
    if (Math.abs(a.coords[1] - b.coords[1]) > deltaY) { // a and b are in different rows
        return b.coords[1] - a.coords[1]; // sort by x
    } else {
        return b.coords[0] - a.coords[0]; // sort by y
    }
});

const matrixData = [[data[0]]];
let row = 0;
for (let i = 1; i < data.length; i++) {
    const dataPoint = data[i];
    // if same row
    if (Math.abs(dataPoint.coords[1] - data[i - 1].coords[1]) < deltaY) {
        matrixData[row].push(dataPoint);
    } else {
        row += 1;
        matrixData.push([dataPoint]);
    }
}






const reprojectedFeatures = sortedReprojectedData.map(o => ({
    type: 'Feature',
    properties: {
        value: o.val
    },
    geometry: {
        type: 'Point',
        coordinates: o.coords
    }
}));

const dataLayerRepr = new VectorLayer({
    source: new VectorSource({
        features: new GeoJSON().readFeatures({
            type: 'FeatureCollection',
            features: reprojectedFeatures
        })
    }),
    style: styleFunc
});



const view = new View({
    center: [start[0] + wX * nrCols / 2, start[1] + wY * nrRows / 2],
    zoom: 4,
    projection: 'EPSG:4326'
});

const map = new Map({
    layers: [bg, dataLayer, dataLayerRepr],
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