import { Map, View, Feature as OlFeature } from 'ol';
import { GeoJSON } from 'ol/format';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Fill, Style, Text, Circle as CircleStyle } from 'ol/style';
import 'ol/ol.css';

import { FeatureCollection, Point } from 'geojson';
import { gridFit } from '../../utils/gridFitting/lineSweeping';






document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point>) => {

        const instrumentedData = gridFit(data, 'SWH', 0.1, 0.2);
        const maxRow = Math.max( ... instrumentedData.features.map(f => f.properties.row));
        const maxCol = Math.max( ... instrumentedData.features.map(f => f.properties.col));
        console.log(maxRow, maxCol);

        const layer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(instrumentedData)
            }),
            style: (feature: OlFeature) => {
                const row = feature.getProperties()['row'];
                const col = feature.getProperties()['col'];
                const r = 255 * row / maxRow;
                const g = 255 * col / maxCol;
                const b = 0;

                return new Style({
                    image: new CircleStyle({
                        fill: new Fill({
                            color: `rgba(${r}, ${g}, ${b}, 1.0)`
                        }),
                        radius: 18,
                    }),
                    text: new Text({
                        text: `${row} / ${col}`,
                        // text: feature.getProperties()['id'],
                        fill: new Fill({ color: 'white' })
                    })
                });
            }
        });

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
