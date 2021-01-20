import { Map, View } from 'ol';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Vector as VectorSource } from 'ol/source';

import { createPointGrid } from '../../utils/ol/createFeatures';
import { SplineLayer } from '../../utils/ol/splineLayer';



const data = createPointGrid([0, 0], 0.25, 0.25, 20, 30, [1, 0.25], [-0.25, 1], 0.2, 0.2, 0.1);


const osm = new TileLayer({
    source: new OSM()
});

const dataLayer = new VectorLayer({
    source: new VectorSource({
        features: new GeoJSON().readFeatures(data)
    })
});

const interpolLayer = new SplineLayer({

});

const layers = [osm, dataLayer, interpolLayer];

const map = new Map({
    target: document.getElementById('map') as HTMLDivElement,
    layers,
    view: new View({
        center: [0, 0],
        zoom: 4,
        projection: 'EPSG:4326'
    })
});