import { ElementsBundle, Program, Index, AttributeData, Context, UniformData, ArrayBundle } from '../../engine/engine.core';
import earcut from 'earcut';

import { Map, View, Feature } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import 'ol/ol.css';
import { setup3dScene } from '../../engine/webgl';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import Polygon from 'ol/geom/Polygon';
import { Options } from 'ol/layer/BaseVector';

const body = document.getElementById('body') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const button = document.getElementById('button') as HTMLButtonElement;
canvas.style.setProperty('height', '0px');

const bg = new TileLayer({
    source: new OSM()
});

const view = new View({
    center: [-71.5, -33],
    zoom: 10,
    projection: 'EPSG:4326'
});

let layers = 0;
button.addEventListener('click', () => {
    fetch('./assets/data_ts-exposure.json').then(response => {
        layers += 1;
        console.log(`${layers} layers`);
        const offsetX = Math.random() - 0.5;
        const offsetY = Math.random() - 0.5;
        response.json().then(data => {
            console.log('nr features: ', data.features.length);
            const subset = {
                type: 'FeatureCollection',
                features: data.features.filter((f: any) => {
                    const l = f.geometry.coordinates.length;
                    return (f.geometry.coordinates[0] === f.geometry.coordinates[l-1]);
                }).map((f: any) => {
                    f.geometry.coordinates[0] = f.geometry.coordinates[0].map((c: number[]) => {
                        return [c[0] + offsetX, c[1] + offsetY];
                    });
                    return f;
                })
            };
            const dataLayer = new WebGlPolygonLayer({
                source: new VectorSource({
                    features: new GeoJSON().readFeatures(subset)
                }),
                colorFunc: (f: Feature<Polygon>) => {
                    const props = f.getProperties();
                    const maxval = 10000;
                    const sum = props["expo"]["Population"].reduce((carry: number, val: number) => carry + val, 0);
                    return [sum / maxval, (maxval - sum) / maxval, 0];
                }
            });
            map.addLayer(dataLayer);
        });
    });
});


const map = new Map({
    target: mapDiv,
    layers: [bg],
    view: view
});


interface PolygonRendererData {
    coords: AttributeData;
    colors: AttributeData;
    polyIndex: Index;
    lineIndex: Index;
}

function parseFeaturesToRendererData(features: Feature<Polygon>[], colorFunction: (f: Feature<Polygon>) => number[]): PolygonRendererData {
    const coords = features.map(f => f.getGeometry().getCoordinates()[0]).flat();
    const polygonIndices: number[][] = [];
    const lineIndices: number[][] = [];
    let colors: number[][] = [];
    let prevIndx = 0;
    for (let feat = 0; feat < features.length; feat++) {
        const nrPoints = features[feat].getGeometry().getCoordinates()[0].length;

        const pIndices = earcut(features[feat].getGeometry().getCoordinates()[0].flat()).map(i => i + prevIndx);
        polygonIndices.push(pIndices);

        const lIndices = [];
        for (let n = 0; n < nrPoints - 1; n++) {
            lIndices.push(prevIndx + n);
            lIndices.push(prevIndx + n + 1);
        }
        lIndices.push(prevIndx + nrPoints - 1);
        lIndices.push(prevIndx);
        lineIndices.push(lIndices);

        prevIndx += nrPoints;

        const color = colorFunction(features[feat]);
        colors = Array.prototype.concat(colors, Array(nrPoints).fill(color));
    }

    const coordAttr = new AttributeData(coords.flat(), 'vec2', false);
    const colorsAttr = new AttributeData(colors.flat(), 'vec3', false);
    const polyIndex = new Index(polygonIndices.flat());
    const lineIndex = new Index(lineIndices.flat());

    return {
        colors: colorsAttr,
        coords: coordAttr,
        polyIndex: polyIndex,
        lineIndex: lineIndex
    };
}


class WebGlPolygonRenderer extends LayerRenderer<VectorLayer> {
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


        const polyShader = new ElementsBundle(new Program(`#version 300 es
        precision mediump float;
        in vec2 a_coord;
        in vec3 a_color;
        flat out vec3 v_color;
        uniform vec4 u_bbox;

        void main() {
            gl_Position = vec4( -1.0 + 2.0 * (a_coord.x - u_bbox.x) / (u_bbox.z - u_bbox.x),  -1.0 + 2.0 * (a_coord.y - u_bbox.y) / (u_bbox.w - u_bbox.y), 0, 1);
            v_color = a_color;
        }`, `#version 300 es
        precision mediump float;
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
        precision highp float;
        in vec2 a_coord;
        in vec3 a_color;
        flat out vec3 v_color;
        uniform vec4 u_bbox;

        void main() {
            gl_Position = vec4( -1.0 + 2.0 * (a_coord.x - u_bbox.x) / (u_bbox.z - u_bbox.x),  -1.0 + 2.0 * (a_coord.y - u_bbox.y) / (u_bbox.w - u_bbox.y), 0, 1);
            v_color = a_color;
        }`, `#version 300 es
        precision highp float;
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

        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = 600;
        canvas.height = 600;
        canvas.style.setProperty('position', 'absolute');
        canvas.style.setProperty('left', '0px');
        canvas.style.setProperty('top', '0px');
        canvas.style.setProperty('width', '100%');
        canvas.style.setProperty('height', '100%');
        const context = new Context(canvas.getContext('webgl2') as WebGL2RenderingContext, true);

        setup3dScene(context.gl);
        polyShader.upload(context);
        polyShader.initVertexArray(context);
        lineShader.upload(context);
        lineShader.initVertexArray(context);

        this.polyShader = polyShader;
        this.lineShader = lineShader;
        this.context = context;
        this.canvas = canvas;
    }

    prepareFrame(frameState: FrameState): boolean {
        return true;
    }

    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
        const bbox = frameState.extent;
        this.polyShader.bind(this.context);
        this.polyShader.updateUniformData(this.context, 'u_bbox', bbox);
        this.polyShader.draw(this.context);
        this.lineShader.bind(this.context);
        this.lineShader.updateUniformData(this.context, 'u_bbox', bbox);
        this.lineShader.draw(this.context);
        return this.canvas;
    }
}

interface WebGlPolygonLayerOptions extends Options {
    colorFunc: (f: Feature<Polygon>) => number[];
    webGlData?: PolygonRendererData;
}

class WebGlPolygonLayer extends VectorLayer {

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
        return new WebGlPolygonRenderer(this, this.colorFunc, this.webGlData);
    }
}
