import { Map, View } from 'ol';
import { GeoJSON } from 'ol/format';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer, Tile as TileLayer, Image as ImageLayer } from 'ol/layer';
import 'ol/ol.css';

import { FeatureCollection, Point } from 'geojson';

import CircleStyle from 'ol/style/Circle';
import { Fill, Style } from 'ol/style';
import { assignRowAndColToFeatureGrid as assignRowAndColUsingTree } from '../../utils/gridFitting/matrixTree';
import { gridFit as assignRowAndColUsingHistogram } from '../../utils/gridFitting/histogram';
import { createSplineSource } from '../../utils/ol/cubicSplines3';



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');



fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point>) => {


        // const instrumentedData = assignRowAndColUsingTree(data.features, 'id');
        const instrumentedData = assignRowAndColUsingHistogram(data);
        // map.addLayer(new VectorLayer({
        //     source: new VectorSource({
        //         features: new GeoJSON().readFeatures(instrumentedData)
        //     }),
        //     style: (f) => {
        //         const row = f.getProperties()['row'];
        //         const col = f.getProperties()['col'];
        //         return new Style({
        //             image: new CircleStyle({
        //                 radius: 10,
        //                 fill: new Fill({
        //                     color: `rgba(${row}, ${col}, 0.0, 1.0)`
        //                 })
        //             })
        //         });
        //     }
        // }));
        const source = createSplineSource(instrumentedData, map.getView().getProjection());
        const layer = new ImageLayer({ source });
        map.addLayer(layer);

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
