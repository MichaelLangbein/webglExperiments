import { bboxPolygon } from 'turf';

import { Map, Feature, View } from 'ol';
import { Layer, Tile as TileLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import Polygon from 'ol/geom/Polygon';
import 'ol/ol.css';
import { FeatureLike } from 'ol/Feature';
import { WebGlPolygonLayer } from '../../utils/ol/polygonRenderer';
const Stats = require('stats.js');

const body = document.getElementById('body') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const button = document.getElementById('button') as HTMLButtonElement;
const slider = document.getElementById('xrange') as HTMLInputElement;
const fpser = document.getElementById('fpser') as HTMLDivElement;
canvas.style.setProperty('height', '0px');







const features = [];
const start = [0, 0];
const w = 0.0125;
const nrRows = 1000;
const nrCols = 1000;
console.log(`creating ${nrRows} * ${nrCols} features ...`);
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

// console.log(`adding features to vector-layer ...`)
// const dataLayer = new VectorLayer({
//     source: new VectorSource({
//         features: new GeoJSON().readFeatures(featureCollection)
//     }),
//     style: (f) => {
//         return new Style({
//             fill: new Fill({
//                 color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`,
//             }),
//         });
//     }
// });

console.log(`adding features to webgl-layer ...`)
const dataLayer = new WebGlPolygonLayer({
    source: new VectorSource({
        features: new GeoJSON().readFeatures(featureCollection)
    }),
    colorFunc: (f: Feature<Polygon>) => {
        return [Math.random(), Math.random(), Math.random()];
    }
});










// const view = new View({
//     center: [-77, -12],
//     zoom: 9,
//     projection: 'EPSG:4326'
// });


// button.addEventListener('click', () => {
//     for (const asset of ['assets/Query_Lima_SARA_PD30_TI70_50000.json', 'assets/Query_Lima_SARA_Blocks_INE.json', 'assets/Query_Lima_SARA_PD40_TI60_50000.json']) {
//         fetch(asset).then((valueRaw: Response) => {
//             valueRaw.json().then((featureCollection) => {
//                 console.log('nr features: ', featureCollection.features.length);
//                 // const dataLayer = new WebGlPolygonLayer({
//                 //     source: new VectorSource({
//                 //         features: new GeoJSON().readFeatures(featureCollection)
//                 //     }),
//                 //     colorFunc: (f: Feature<Polygon>) => {
//                 //         return [Math.random(), Math.random(), Math.random()];
//                 //     }
//                 // });
//                 const dataLayer = new VectorLayer({
//                     source: new VectorSource({
//                         features: new GeoJSON().readFeatures(featureCollection)
//                     }),
//                     style: (f) => {
//                         return new Style({
//                             stroke: new Stroke({
//                               color: 'blue',
//                               width: 3,
//                             }),
//                             fill: new Fill({
//                               color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`,
//                             }),
//                         });
//                     }
//                     // colorFunc: (f: Feature<Polygon>) => {
//                     //     return [Math.random(), Math.random(), Math.random()];
//                     // }
//                 });
//                 map.addLayer(dataLayer);
//             });
//         });
//     }
// });



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