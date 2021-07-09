import { Map, View } from 'ol';
import { GeoJSON } from 'ol/format';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer, Tile as TileLayer, Image as ImageLayer } from 'ol/layer';
import 'ol/ol.css';

import { FeatureCollection, Point } from 'geojson';

import CircleStyle from 'ol/style/Circle';
import { Fill, Style } from 'ol/style';
import { assignRowAndColToFeatureGrid as assignRowAndColUsingTree } from '../../utils/gridFitting/matrixTree';
import { createSplineSource } from '../../utils/ol/cubicSplines/cubicSplines3';
import { PCA } from 'ml-pca';
import Matrix, { inverse } from 'ml-matrix';



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');

function assignValue(data: FeatureCollection<Point>, propKey: string): FeatureCollection<Point> {
    for (const feature of data.features) {
        feature.properties.value = feature.properties[propKey];
    }
    return data;
}

fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point>) => {

        map.addLayer(new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            }),
            style: new Style({
                image: new CircleStyle({
                    fill: new Fill({
                        color: 'rgba(1, 0, 0, 1)'
                    }),
                    radius: 5
                })
            })
        }));

        const coords = data.features.map(f => f.geometry.coordinates);
        const pca = new PCA(coords);
        const eigenVectors = pca.getEigenvectors();
        const primaryAxis = eigenVectors.getColumn(0);
        const matrix = new Matrix(2, 2);
        matrix.setColumn(0, primaryAxis);
        matrix.setColumn(1, [0, 1]);
        const T = inverse(matrix);
        data.features
            .map(f => {
                const newCoords = T.mmul(Matrix.columnVector(f.geometry.coordinates)).getColumn(0);
                f.geometry.coordinates = newCoords;
            });
        const coords2 = data.features.map(f => f.geometry.coordinates);
        const pca2 = new PCA(coords2);
        const eigenVectors2 = pca2.getEigenvectors();
        const secondaryAxis = eigenVectors2.getColumn(1);
        const matrix2 = new Matrix(2, 2);
        matrix2.setColumn(0, [1, 0]);
        matrix2.setColumn(1, secondaryAxis);
        const T2 = inverse(matrix2);
        data.features
            .map(f => {
                const newCoords = T2.mmul(Matrix.columnVector(f.geometry.coordinates)).getColumn(0);
                f.geometry.coordinates = newCoords;
            });

        map.addLayer(new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            })
        }));

        const center = map.getView().getCenter();
        const axes = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [center, [center[0] + primaryAxis[0], center[1] + primaryAxis[1]]]
                },
                properties: {}
            }, {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [center, [center[0] + secondaryAxis[0], center[1] + secondaryAxis[1]]]
                },
                properties: {}
            }]
        };console.log(axes)
        map.addLayer(new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(axes)
            })
        }));


        const instrumentedData = assignRowAndColUsingTree(data, 'id');
        assignValue(data, 'SWH');
        // const instrumentedData = assignRowAndColUsingHistogram(data);
        // map.addLayer(new VectorLayer({
        //     source: new VectorSource({
        //         features: new GeoJSON().readFeatures(instrumentedData)
        //     }),
        //     style: (f) => {
        //         const row = f.getProperties()['row'];
        //         const col = f.getProperties()['col'];
        //         console.log(row, col)
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
        const source = createSplineSource(instrumentedData as any, map.getView().getProjection());
        const layer = new ImageLayer({ source });
        // map.addLayer(layer);

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
