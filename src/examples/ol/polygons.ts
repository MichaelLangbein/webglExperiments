import { ElementsBundle, Program, Index, AttributeData, Context, UniformData } from '../../engine/engine.core';
import { bindFramebuffer, bindTextureToFramebuffer, createEmptyTexture, createFramebuffer, FramebufferObject, getCurrentFramebuffersPixels, setup3dScene } from '../../engine/webgl';
import { arrayToCanvasDims } from '../../engine/engine.helpers';

import earcut from 'earcut';
import { bboxPolygon } from 'turf';

import { Map, Feature, View } from 'ol';
import { Layer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import Polygon from 'ol/geom/Polygon';
import { Options } from 'ol/layer/BaseVector';
import { Pixel } from 'ol/pixel';
import { Coordinate } from 'ol/coordinate';
import 'ol/ol.css';
import TileLayer from 'ol/layer/Tile';
import { FeatureLike } from 'ol/Feature';
import MultiPolygon from 'ol/geom/MultiPolygon';

const body = document.getElementById('body') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const button = document.getElementById('button') as HTMLButtonElement;
const slider = document.getElementById('xrange') as HTMLInputElement;
const empty = document.getElementById('empty') as HTMLDivElement;
canvas.style.setProperty('height', '0px');







/***************************************************************************************
 *                                                                                     *
 ***************************************************************************************/

export interface PolygonRendererData {
    coords: AttributeData;
    colors: AttributeData;
    polyIndex: Index;
    lineIndex: Index;
}


export function parseFeaturesToRendererData(
    features: Feature<Polygon | MultiPolygon>[], colorFunction: (f: Feature<Polygon>) => number[]): PolygonRendererData {

    /**
     * Path: Coords[]
     * Polygon: Path[] <-- first path: outline, all other paths: holes
     * MultiPolygon: Polygon[]
     */

    const polygonIndices: number[][] = [];
    const lineIndices: number[][] = [];
    const coords: number[][] = [];
    const colors: number[][] = [];

    let prevIndx = 0;
    for (const feature of features) {
        const type = feature.getGeometry().getType();
        const coordinates = feature.getGeometry().getCoordinates();
        if (type === 'Polygon') {

            coords.push(...(coordinates  as number[][][])[0]);
            const pIndices = earcut(coordinates[0].flat()).map(i => i + prevIndx);
            polygonIndices.push(pIndices);
            const lIndices = [];
            const nrPoints = coordinates[0].length;
            for (let n = 0; n < nrPoints - 1; n++) {
                lIndices.push(prevIndx + n);
                lIndices.push(prevIndx + n + 1);
            }
            lIndices.push(prevIndx + nrPoints - 1);
            lIndices.push(prevIndx);
            lineIndices.push(lIndices);
            const color = colorFunction(feature as Feature<Polygon>);
            colors.push(... Array(nrPoints).fill(color));

            prevIndx += nrPoints;
        } else if (type === 'MultiPolygon') {
            for (const polygonCoords of coordinates) {

                coords.push(... (polygonCoords as number[][][])[0]);
                const pIndices = earcut(polygonCoords[0].flat()).map(i => i + prevIndx);
                polygonIndices.push(pIndices);
                const lIndices = [];
                const nrPoints = polygonCoords[0].length;
                for (let n = 0; n < nrPoints - 1; n++) {
                    lIndices.push(prevIndx + n);
                    lIndices.push(prevIndx + n + 1);
                }
                lIndices.push(prevIndx + nrPoints - 1);
                lIndices.push(prevIndx);
                lineIndices.push(lIndices);
                const color = colorFunction(feature as any);
                colors.push(... Array(nrPoints).fill(color));

                prevIndx += nrPoints;
            }
        }
    }

    const coordAttr = new AttributeData(coords.flat(), 'vec2', false);
    const colorsAttr = new AttributeData(colors.flat(), 'vec3', false);
    const polyIndex = new Index(polygonIndices.flat());
    const lineIndex = new Index(lineIndices.flat());

    return {
        colors: colorsAttr,
        coords: coordAttr,
        polyIndex: polyIndex,
        lineIndex: lineIndex,
    };
}

export class WebGlPolygonRenderer extends LayerRenderer<VectorLayer> {
    polyShader: ElementsBundle;
    lineShader: ElementsBundle;
    context: Context;
    canvas: HTMLCanvasElement;

    constructor(layer: VectorLayer, colorFunc: (f: Feature<Polygon>) => number[], data?: PolygonRendererData) {
        super(layer);

        if (!data) {
            const features = layer.getSource().getFeatures() as Feature<Polygon>[];
            data = parseFeaturesToRendererData(features, colorFunc);
        }


        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = 600;
        canvas.height = 600;
        canvas.style.setProperty('position', 'absolute');
        canvas.style.setProperty('left', '0px');
        canvas.style.setProperty('top', '0px');
        canvas.style.setProperty('width', '100%');
        canvas.style.setProperty('height', '100%');
        const context = new Context(canvas.getContext('webgl2') as WebGL2RenderingContext, true);


        const polyShader = new ElementsBundle(new Program(`#version 300 es
        precision lowp float;
        in vec2 a_coord;
        in vec3 a_color;
        flat out vec3 v_color;
        uniform vec4 u_bbox;

        void main() {
            gl_Position = vec4( -1.0 + 2.0 * (a_coord.x - u_bbox.x) / (u_bbox.z - u_bbox.x),  -1.0 + 2.0 * (a_coord.y - u_bbox.y) / (u_bbox.w - u_bbox.y), 0, 1);
            v_color = a_color;
        }`, `#version 300 es
        precision lowp float;
        flat in vec3 v_color;
        out vec4 vertexColor;

        void main() {
            vertexColor = vec4(v_color.xyz, 0.8);
        }`), {
            a_coord: data.coords,
            a_color: data.colors
        }, {
            u_bbox: new UniformData('vec4', [0, 0, 360, 180])
        }, {}, 'triangles', data.polyIndex);

        const lineShader = new ElementsBundle(new Program(`#version 300 es
        precision lowp float;
        in vec2 a_coord;
        in vec3 a_color;
        flat out vec3 v_color;
        uniform vec4 u_bbox;

        void main() {
            gl_Position = vec4( -1.0 + 2.0 * (a_coord.x - u_bbox.x) / (u_bbox.z - u_bbox.x),  -1.0 + 2.0 * (a_coord.y - u_bbox.y) / (u_bbox.w - u_bbox.y), 0, 1);
            v_color = a_color;
        }`, `#version 300 es
        precision lowp float;
        flat in vec3 v_color;
        out vec4 vertexColor;

        void main() {
            vertexColor = vec4(v_color.xyz, 1.0);
        }`), {
            a_coord: data.coords,
            a_color: data.colors
        }, {
            u_bbox: new UniformData('vec4', [0, 0, 360, 180])
        }, {}, 'lines', data.lineIndex);

        setup3dScene(context.gl);
        polyShader.upload(context);
        polyShader.initVertexArray(context);
        lineShader.upload(context);
        lineShader.initVertexArray(context);

        // for saving memory: deleting local copies of GPU data.
        delete(polyShader.attributes);
        delete(polyShader.index.data);
        delete(lineShader.attributes);
        delete(lineShader.index.data);

        this.polyShader = polyShader;
        this.lineShader = lineShader;
        this.context = context;
        this.canvas = canvas;
    }

    prepareFrame(frameState: FrameState): boolean {
        return true;
    }

    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
        const layerState = frameState.layerStatesArray[frameState.layerIndex];
        this.canvas.style.opacity = `${layerState.opacity}`;
        const bbox = frameState.extent;
        this.polyShader.bind(this.context);
        this.polyShader.updateUniformData(this.context, 'u_bbox', bbox);
        this.polyShader.draw(this.context, [0, 0, 0, 0]);
        this.lineShader.bind(this.context);
        this.lineShader.updateUniformData(this.context, 'u_bbox', bbox);
        this.lineShader.draw(this.context);
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

export interface WebGlPolygonLayerOptions extends Options {
    colorFunc: (f: Feature<Polygon>) => number[];
    webGlData?: PolygonRendererData;
}

export class WebGlPolygonLayer extends VectorLayer {

    webGlData: PolygonRendererData;
    colorFunc: (f: Feature<Polygon>) => number[];

    constructor(opt_options: WebGlPolygonLayerOptions) {
        super(opt_options);
        this.colorFunc = opt_options.colorFunc;
        if (opt_options.webGlData) {
            this.webGlData = opt_options.webGlData;
        }
    }

    createRenderer(): LayerRenderer<VectorLayer> {
        const renderer = new WebGlPolygonRenderer(this, this.colorFunc, this.webGlData);
        delete(this.webGlData);
        return renderer;
    }
}


/***************************************************************************************
 *                                                                                     *
 ***************************************************************************************/



const features = [];
const start = [0, 0];
const w = 0.25;
const delta = 0.1;
const nrRows = 30;
const nrCols = 30;
for (let i = 0; i < nrRows; i++) {
    for (let j = 0; j < nrCols; j++) {
        const bbox = [
            start[0] + (i - 1) * w,
            start[1] + (j - 1) * w,
            start[0] + i * w,
            start[1] + j * w
        ];
        const polygon = bboxPolygon(bbox);
        polygon.properties['id'] = i * nrCols + j;
        features.push(polygon);
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
    colorFunc: (f: Feature<Polygon>) => {
        return [Math.random(), Math.random(), Math.random()];
    }
});



const map = new Map({
    target: mapDiv,
    layers: [bg, dataLayer],
    view: view
});

map.on('singleclick', function (evt) {
    var coordinate = evt.coordinate;
    map.forEachFeatureAtPixel(evt.pixel, (f: FeatureLike, l: Layer) => {
        console.log(f.getProperties());
    });
});
