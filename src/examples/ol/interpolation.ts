import { Map, View } from 'ol';
import { Vector as VectorLayer, Tile as TileLayer, Vector } from 'ol/layer';
import { OSM } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Vector as VectorSource } from 'ol/source';

import { SplineLayer } from '../../utils/ol/cubicSplines';
import { InverseDistanceLayer } from '../../utils/ol/inverseDistance';



document.getElementById('canvas').style.setProperty('height', '0px');



fetch('assets/testdata.json').then((response: Response) => {
    response.json().then((data: any) => {

        const dataLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            }),
        });
        map.addLayer(dataLayer);

        // const splineLayer = new SplineLayer({
        //     source: new VectorSource({
        //         features: new GeoJSON().readFeatures(data)
        //     })
        // });
        // map.addLayer(splineLayer);

        const intpLayer = new InverseDistanceLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            })
        });
        map.addLayer(intpLayer);

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