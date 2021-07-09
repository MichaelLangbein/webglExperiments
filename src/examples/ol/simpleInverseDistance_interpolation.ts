import { Map, View } from 'ol';
import { OSM } from 'ol/source';
import { Tile as TileLayer } from 'ol/layer';
import 'ol/ol.css';
import { FeatureCollection, Point } from 'geojson';
import { createInterpolationSource, InterpolationRenderer } from '../../utils/ol/inverseDistance_singleStep';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point>) => {

        const source = createInterpolationSource(data, map.getView().getProjection().getCode(), 3, 'SWH', 0.2);
        const layer = new ImageLayer({ source });
        map.addLayer(layer);

        const featureLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            })
        });
        map.addLayer(featureLayer);

        const xSlider = document.getElementById('xrange') as HTMLInputElement;
        xSlider.addEventListener('change', (evt) => {
            const power = 10 * (+(xSlider.value) + 100) / 200;
            const renderer = source.get('renderer') as InterpolationRenderer;
            renderer.setPower(power);
            source.refresh();
        });
    });
});


const osm = new TileLayer({
    source: new OSM()
});


const layers = [osm];

const map = new Map({
    target: document.getElementById('map') as HTMLDivElement,
    layers,
    view: new View({
        center: [16, 55],
        zoom: 7,
        projection: 'EPSG:4326'
    })
});


map.on('pointermove', (evt) => {
    fpser.innerHTML = `${evt.coordinate}`;
});
