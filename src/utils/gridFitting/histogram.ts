import { FeatureCollection, Point } from 'geojson';
import { GridPointProps } from '../ol/cubicSplines/cubicSplines3';
import { Matrix, inverse } from 'ml-matrix';
import { PCA } from 'ml-pca';
import turf_bbox from '@turf/bbox';

// function assignRowsAndCols(data: FeatureCollection<Point>): FeatureCollection<Point, GridPointProps> {
//     const sortedFeatures = data.features
//         .sort((a, b) => a.geometry.coordinates[1] < b.geometry.coordinates[1] ? 1 : -1);

//     let id = 0;
//     let row = 0;
//     let col = -1;
//     let currentXPos = -Infinity;
//     for (let feature of sortedFeatures) {
//         const featureXPos = feature.geometry.coordinates[0];
//         if (featureXPos < currentXPos) {
//             row += 1;
//             col = -1;
//         }
//         currentXPos = featureXPos;
//         col += 1;
//         id += 1;

//         feature.properties.id = id;
//         feature.properties.row = row;
//         feature.properties.col = col;

//     }

//     data.features = sortedFeatures;
//     return data as FeatureCollection<Point, GridPointProps>;
// }

function assignValue(data: FeatureCollection<Point>, propKey: string): FeatureCollection<Point> {
    for (const feature of data.features) {
        feature.properties.value = feature.properties[propKey];
    }
    return data;
}

function reproject<T>(data: FeatureCollection<Point, T>, newBase: Matrix): FeatureCollection<Point, T> {
    const transformMatrix: Matrix = inverse(newBase);
    for (const feature of data.features) {
        const coords = feature.geometry.coordinates;
        const coordsV = Matrix.columnVector(coords);
        const reprojectedCoordsV = transformMatrix.mmul(coordsV);
        const reprojectedCoords = reprojectedCoordsV.getColumn(0);
        feature.geometry.coordinates = reprojectedCoords;
    }
    return data;
}


function keysSortedByValue(object: any): number[] {
    const sortable = [];
    for (const key in object) {
        sortable.push([key, object[key]]);
    }

    sortable.sort((a, b) => a[1] - b[1]);

    return sortable.map(s => s[0]).map(s => Math.abs(parseFloat(s)));
}


function estimateGridDelta(data: FeatureCollection<Point, any>, precision = 4): { deltaX: number, deltaY: number } {
    data.features
        .sort((a, b) => a.geometry.coordinates[0] < b.geometry.coordinates[0] ? 1 : -1);

    const deltaXs: { [key: string]: number } = {};
    for (let i = 1; i < data.features.length; i++) {
        const f0 = data.features[i - 1];
        const f1 = data.features[i];
        const deltaX = (f1.geometry.coordinates[0] - f0.geometry.coordinates[0]).toPrecision(precision);
        if (deltaXs[deltaX]) {
            deltaXs[deltaX] += 1;
        } else {
            deltaXs[deltaX] = 1;
        }
    }
    const deltaXSorted = keysSortedByValue(deltaXs);
    const deltaX = Math.max(... deltaXSorted.slice(0, 3));  // getting largest of the three most common deltaX's

    data.features
        .sort((a, b) => a.geometry.coordinates[1] < b.geometry.coordinates[1] ? 1 : -1);

    const deltaYs: { [key: string]: number } = {};
    for (let i = 1; i < data.features.length; i++) {
        const f0 = data.features[i - 1];
        const f1 = data.features[i];
        const deltaY = (f1.geometry.coordinates[1] - f0.geometry.coordinates[1]).toFixed(precision);
        if (deltaYs[deltaY]) {
            deltaYs[deltaY] += 1;
        } else {
            deltaYs[deltaY] = 1;
        }
    }
    const deltaYSorted = keysSortedByValue(deltaYs);
    const deltaY = Math.max(... deltaYSorted.slice(0, 3));   // getting largest of the three most common deltaY's

    return {deltaX, deltaY};
}

function assignRowsAndCols(data: FeatureCollection<Point>): FeatureCollection<Point, GridPointProps> {
    const bbox = turf_bbox(data);
    const {deltaX, deltaY} = estimateGridDelta(data);
    for (const feature of data.features) {
        const coords = feature.geometry.coordinates;
        const col = Math.floor((coords[0] - bbox[0]) / deltaX);
        const row = Math.floor((coords[1] - bbox[1]) / deltaY);
        feature.properties.row = row;
        feature.properties.col = col;
    }
    return data as FeatureCollection<Point, GridPointProps>;
}

export function gridFit(data: FeatureCollection<Point, any>): FeatureCollection<Point, GridPointProps> {

    data = assignValue(data, 'SWH');

    const coords = data.features.map(f => (f.geometry as Point).coordinates);
    const pca = new PCA(coords);
    const eigenVectors = pca.getEigenvectors();
    const reprojectedData = reproject(data, eigenVectors);

    const reprojectedInstrumentedData = assignRowsAndCols(reprojectedData);
    const instrumentedData = reproject(reprojectedInstrumentedData, inverse(eigenVectors));

    return instrumentedData;
}