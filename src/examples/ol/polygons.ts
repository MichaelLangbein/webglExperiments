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
    center: [-72, -33],
    zoom: 10,
    projection: 'EPSG:4326'
});

button.addEventListener('click', () => {
    fetch('./assets/data_ts-exposure.json').then(response => {
        response.json().then(data => {
            console.log('nr features: ', data.features.length);
            const subset = {
                type: 'FeatureCollection',
                features: data.features.filter((f: any) => {
                    const l = f.geometry.coordinates.length;
                    return (f.geometry.coordinates[0] === f.geometry.coordinates[l-1]);
                })
            };
            const dataLayer = new PolygonLayer({
                source: new VectorSource({
                    features: new GeoJSON().readFeatures(subset)
                })
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


class PolygonRenderer extends LayerRenderer<VectorLayer> {
    polyShader: ElementsBundle;
    lineShader: ElementsBundle;
    context: Context;
    canvas: HTMLCanvasElement;

    constructor(layer: VectorLayer) {
        super(layer);

        const features = layer.getSource().getFeatures() as Feature<Polygon>[];
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

            const color = [Math.random(), Math.random(), Math.random()];
            colors = Array.prototype.concat(colors, Array(nrPoints).fill(color));
        }

        const coordAttr = new AttributeData(coords.flat(), 'vec2', false);
        const colorsAttr = new AttributeData(colors.flat(), 'vec3', false);

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
                a_coord: coordAttr,
                a_color: colorsAttr
            }, {
                u_bbox: new UniformData('vec4', [0, 0, 360, 180])
            }, {}, 'triangles', new Index(polygonIndices.flat()));

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
                a_coord: coordAttr,
                a_color: colorsAttr
            }, {
                u_bbox: new UniformData('vec4', [0, 0, 360, 180])
            }, {}, 'lines', new Index(lineIndices.flat()));

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

class PolygonLayer extends VectorLayer {
    constructor(opt_options?: Options) {
        super(opt_options);
    }

    createRenderer(): LayerRenderer<VectorLayer> {
        return new PolygonRenderer(this);
    }
}


// with CPU: 22% 554 (346m) dropped of 2468
// with GPU: 99% 26 (260m) dropped of 1658

function shuffle(a: any[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}