import { ElementsBundle, Program, Index, AttributeData, Context, UniformData } from '../../engine/engine.core';
import { bindFramebuffer, bindTextureToFramebuffer, createEmptyTexture, createFramebuffer, FramebufferObject, getCurrentFramebuffersPixels, setup3dScene } from '../../engine/webgl';
import earcut from 'earcut';

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

const body = document.getElementById('body') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const button = document.getElementById('button') as HTMLButtonElement;
canvas.style.setProperty('height', '0px');

const bg = new TileLayer({
    source: new OSM()
});

const view = new View({
    center: [-78.70441449457037, -0.961133719198561],
    zoom: 10,
    projection: 'EPSG:4326'
});


button.addEventListener('click', () => {
    fetch('./assets/data_ashfallDamage.json').then(response => {
        response.json().then(data => {
            const subset = {
                type: 'FeatureCollection',
                features: data.features.filter((f: any) => {
                    const l = f.geometry.coordinates.length;
                    return (f.geometry.coordinates[0] === f.geometry.coordinates[l-1]);
                })
            };
            const dataLayer = new WebGlPolygonLayer({
                source: new VectorSource({
                    features: new GeoJSON().readFeatures(subset)
                }),
                colorFunc: (f: Feature<Polygon>) => {
                    return [Math.random(), Math.random(), Math.random()];
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

map.on('singleclick', function (evt) {
    var coordinate = evt.coordinate;
    map.forEachFeatureAtPixel(evt.pixel, (f: FeatureLike, l: Layer) => {
        console.log(f);
    });
  });


export interface PolygonRendererData {
    coords: AttributeData;
    colors: AttributeData;
    nrs: AttributeData;
    polyIndex: Index;
    lineIndex: Index;
}




function encodeNInBase(n: number, base: number, slots: number): number[] {
    const bases = Array(slots-1);
    for (let i = 0; i < slots; i++) {
        bases[i] = Math.pow(base, i);
    }
    const encoded = Array(slots-1);
    for (let i = slots-1; i >= 0; i--) {
        const b = bases[i];
        const divsr = Math.floor(n / b);
        const rest = n % b;
        encoded[i] = divsr;
        n = rest;
    }
    return encoded.reverse();
}

function decodeNFromBase(encoded: number[], base: number): number {
    const encodedR = encoded.reverse();
    const slots = encodedR.length;
    let n = 0;
    for (let i = 0; i < slots; i++) {
        const b = Math.pow(base, i);
        n += b * encodedR[i];
    }
    return n;
}


export function parseFeaturesToRendererData(
    features: Feature<Polygon>[], colorFunction: (f: Feature<Polygon>) => number[]): PolygonRendererData {

    /**
     * Path: Coords[]
     * Polygon: Path[] <-- first path: outline, all other paths: holes
     * MultiPolygon: Polygon[]
     */

    const polygonIndices: number[][] = [];
    const lineIndices: number[][] = [];
    let coords: number[][] = [];
    let colors: number[][] = [];
    let nrs: number[][] = [];

    let nr = 1;
    let prevIndx = 0;
    for (const feature of features) {
        const type = feature.getGeometry().getType();
        const coordinates = feature.getGeometry().getCoordinates();
        if (type === 'Polygon') {

            coords = coords.concat(coordinates[0]);
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
            const color = colorFunction(feature);
            colors = colors.concat(Array(nrPoints).fill(color));
            const nrEncoded = encodeNInBase(nr, 256, 4).map(n => n / 255);
            nrs = nrs.concat(Array(nrPoints).fill(nrEncoded));

            prevIndx += nrPoints;
            nr += 1;

        } else if (type === 'MultiPolygon') {
            for (const polygonCoords of coordinates) {

                coords = coords.concat(polygonCoords[0]);
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
                const color = colorFunction(feature);
                colors = colors.concat(Array(nrPoints).fill(color));
                const nrEncoded = encodeNInBase(nr, 256, 4).map(n => n / 255);
                nrs = nrs.concat(Array(nrPoints).fill(nrEncoded));

                prevIndx += nrPoints;
            }
            nr += 1;
        }
    }

    const coordAttr = new AttributeData(coords.flat(), 'vec2', false);
    const colorsAttr = new AttributeData(colors.flat(), 'vec3', false);
    const nrsAttr = new AttributeData(nrs.flat(), 'vec4', false);
    const polyIndex = new Index(polygonIndices.flat());
    const lineIndex = new Index(lineIndices.flat());

    return {
        colors: colorsAttr,
        coords: coordAttr,
        nrs: nrsAttr,
        polyIndex: polyIndex,
        lineIndex: lineIndex,
    };
}





export class WebGlPolygonRenderer extends LayerRenderer<VectorLayer> {
    polyShader: ElementsBundle;
    lineShader: ElementsBundle;
    context: Context;
    canvas: HTMLCanvasElement;
    pickingShader: ElementsBundle;
    pickingFb: FramebufferObject;

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


        const pickingShader = new ElementsBundle(new Program(`#version 300 es
        precision lowp float;
        in vec2 a_coord;
        in vec4 a_id;
        flat out vec4 v_id;
        uniform vec4 u_bbox;

        void main() {
            gl_Position = vec4( -1.0 + 2.0 * (a_coord.x - u_bbox.x) / (u_bbox.z - u_bbox.x),  -1.0 + 2.0 * (a_coord.y - u_bbox.y) / (u_bbox.w - u_bbox.y), 0, 1);
            v_id = a_id;
        }`, `#version 300 es
        precision lowp float;
        flat in vec4 v_id;
        out vec4 vertexColor;

        void main() {
            vertexColor = v_id;
        }`), {
            a_coord: data.coords,
            a_id: data.nrs
        }, {
            u_bbox: new UniformData('vec4', [0, 0, 360, 180])
        }, {}, 'triangles', data.polyIndex);


        setup3dScene(context.gl);
        polyShader.upload(context);
        polyShader.initVertexArray(context);
        lineShader.upload(context);
        lineShader.initVertexArray(context);
        pickingShader.upload(context);
        pickingShader.initVertexArray(context);

        const fb = createFramebuffer(context.gl);
        const fbTexture = createEmptyTexture(context.gl, canvas.width, canvas.height, 'ubyte4');
        const fbo = bindTextureToFramebuffer(context.gl, fbTexture, fb);

        this.polyShader = polyShader;
        this.lineShader = lineShader;
        this.pickingShader = pickingShader;
        this.pickingFb = fbo;
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


    /**
     * @param pixel Pixel.
     * @param frameState FrameState.
     * @param hitTolerance Hit tolerance in pixels.
     * @return {Uint8ClampedArray|Uint8Array} The result.  If there is no data at the pixel
     *    location, null will be returned.  If there is data, but pixel values cannot be
     *    returned, and empty array will be returned.
     *
     * @TODO: We're not storing color-values anywhere. Atm. we're only keeping feature-ids in the picking-framebuffer.
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
        const bbox = frameState.extent;
        this.pickingShader.bind(this.context);
        this.pickingShader.updateUniformData(this.context, 'u_bbox', bbox);
        this.pickingShader.draw(this.context, [0, 0, 0, 0], this.pickingFb);
        const textureData = new Uint8Array(getCurrentFramebuffersPixels(this.canvas));

        const percW = (coordinate[0] - bbox[0]) / (bbox[2] - bbox[0]);
        const percH = 1 - (coordinate[1] - bbox[1]) / (bbox[3] - bbox[1]);
        const row = Math.round(this.canvas.height * percH);
        const col = Math.round(this.canvas.width * percW);
        const index = 4 * row * this.canvas.width + 4 * col;
        const featureNrEncoded = [textureData[index], textureData[index + 1], textureData[index + 2], textureData[index + 3]];
        const featureNr = decodeNFromBase(featureNrEncoded, 256) - 1;

        if (featureNr >= 0) {
            const layer = this.getLayer();
            const features = layer.getSource().getFeatures();
            const feature = features[featureNr];
    
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
        return new WebGlPolygonRenderer(this, this.colorFunc, this.webGlData);
    }
}
