import { Map, View } from 'ol';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Vector as VectorSource } from 'ol/source';

import { createPointGrid } from '../../utils/ol/createFeatures';
import { SplineLayer } from '../../utils/ol/splineLayer';
import { Style, Text } from 'ol/style';
import { FeatureLike } from 'ol/Feature';
import { assignRowAndColToFeatureGrid } from '../../utils/matrixTree';



document.getElementById('canvas').style.setProperty('height', '0px');



fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: any) => {

        // const analyzedData = assignRowAndColToFeatureGrid(data.features, 'id');

        // const dataLayer = new VectorLayer({
        //     source: new VectorSource({
        //         features: new GeoJSON().readFeatures({
        //             'type': 'FeatureCollection',
        //             'features': analyzedData
        //         })
        //     }),
        //     style: (feature: FeatureLike) => {
        //         return new Style({
        //             text: new Text({
        //                 text: feature.getProperties().row + '/' + feature.getProperties().col // feature.getProperties().id
        //             })
        //         });
        //     }
        // });
        // map.addLayer(dataLayer);

        const dataLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            }),
            style: (feature: FeatureLike) => {
                return new Style({
                    text: new Text({
                        text: feature.getProperties().id
                    })
                });
            }
        });
        map.addLayer(dataLayer);


        // const interpolLayer = new SplineLayer({
        // });
        // map.addLayer(interpolLayer);


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
        center: [19, 56],
        zoom: 8,
        projection: 'EPSG:4326'
    })
});