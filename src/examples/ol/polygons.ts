import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import 'ol/ol.css';

const mapDiv = document.getElementById('map') as HTMLDivElement;

const bg = new TileLayer({
    source: new OSM()
});

const view = new View({
    center: [15, 52],
    zoom: 5,
    projection: 'EPSG:4326'
});

fetch('./assets/polygons.geojson').then(response => {
    response.json().then(data => {
        const dataLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            })
        });
        map.addLayer(dataLayer);
    });
});


const map = new Map({
    target: mapDiv,
    layers: [bg],
    view: view
});