// Algorithms
import { PCA } from 'ml-pca';
import { Matrix, inverse } from 'ml-matrix';
import { getMatrixData } from '../../utils/matrixTree';

// Ol
import { Map, View } from 'ol';
import { Layer, Tile as TileLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import 'ol/ol.css';
import { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import { scalarProduct, vectorAddition } from '../../utils/math';
import VectorLayer from 'ol/layer/Vector';
import { Style, Fill, Circle } from 'ol/style';

// Others
const Stats = require('stats.js');

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const fpser = document.getElementById('fpser') as HTMLDivElement;
canvas.style.setProperty('height', '0px');



const features = [];
const start = [0, 0];
const wX = 0.125;
const wY = 0.25;
const nrRows = 20;
const nrCols = 23;
const xDir = [1, 0.5];
const yDir = [-0.5, 1];
console.log(`creating ${nrRows} * ${nrCols} features ...`);
for (let i = 0; i < nrRows; i++) {
    for (let j = 0; j < nrCols; j++) {
        if (Math.random() < 0.999) {
            const pos = vectorAddition(vectorAddition(vectorAddition(start, scalarProduct(wX * i, xDir)), scalarProduct(wY * j, yDir)), [Math.random() * 0.01, Math.random() * 0.01]);

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
    const pca = new PCA(data);
    const eigenVectors = pca.getEigenvectors();
    const T = inverse(eigenVectors);
    const reprojectedData = data
        .map(d => Matrix.columnVector(d))
        .map(d => T.mmul(d))
        .map(m => m.getColumn(0));
    return reprojectedData;
}


const coords = dataLayer.getSource().getFeatures().map(f => (f.getGeometry() as Point).getCoordinates());
const vals = dataLayer.getSource().getFeatures().map(f => f.getProperties()['value']);
const reprojectedCoords = reprojectData(coords);
const reprojectedData: {x: number, y: number, data: number[]}[] = [];
for (let i = 0; i < vals.length; i++) {
    reprojectedData.push({
        x: reprojectedCoords[i][0],
        y: reprojectedCoords[i][1],
        data: vals[i]
    });
}



const matrixData = getMatrixData(reprojectedData);

console.log(matrixData)





const reprojectedFeatures = reprojectedData.map(o => ({
    type: 'Feature',
    properties: {
        value: o.data
    },
    geometry: {
        type: 'Point',
        coordinates: [o.x, o.y]
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