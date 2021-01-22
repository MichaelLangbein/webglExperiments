import { Map, View } from 'ol';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Vector as VectorSource } from 'ol/source';

import { SplineLayer } from '../../utils/ol/splineLayer';
import { Style, Text } from 'ol/style';
import { FeatureLike } from 'ol/Feature';



document.getElementById('canvas').style.setProperty('height', '0px');



fetch('assets/testdata.json').then((response: Response) => {
    response.json().then((data: any) => {

        const dataLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            }),
            style: (feature: FeatureLike) => {
                return new Style({
                    text: new Text({
                        text: `${feature.getProperties().id}`
                    })
                });
            }
        });
        map.addLayer(dataLayer);

        const interpolLayer = new SplineLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            })
        });
        map.addLayer(interpolLayer);


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
        center: [21, 56],
        zoom: 6,
        projection: 'EPSG:4326'
    })
});