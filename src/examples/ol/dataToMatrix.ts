// Algorithms
import { convertToDataMatrix, DataPoint } from '../../utils/matrixTree';

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
import { reprojectDataAlongPrincipalAxes } from '../../utils/pcaAlign';
import { createPointGrid } from '../../utils/ol/createFeatures';

// Others
const Stats = require('stats.js');

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const fpser = document.getElementById('fpser') as HTMLDivElement;
canvas.style.setProperty('height', '0px');





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
        features: new GeoJSON().readFeatures(createPointGrid([0, 0], 0.25, 0.25, 20, 30, [1, 0.25], [-0.25, 1])),
    }),
    style: styleFunc
});





const coords = dataLayer.getSource().getFeatures().map(f => (f.getGeometry() as Point).getCoordinates());
const reprojectedCoords = reprojectDataAlongPrincipalAxes(coords);

const reprojectedData: DataPoint[] = [];
const values = dataLayer.getSource().getFeatures().map(f => f.getProperties()['value']);
for (let i = 0; i < values.length; i++) {
    reprojectedData.push({
        x: reprojectedCoords.reprojectedData[i][0],
        y: reprojectedCoords.reprojectedData[i][1],
        data: values[i]
    });
}

const matrixData = convertToDataMatrix(reprojectedData);






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
    center: [0, 0],
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