import { FeatureCollection, Point } from 'geojson';
import { GridPointProps } from './ol/cubicSplines3';
import { Matrix, inverse } from 'ml-matrix';
import { PCA } from 'ml-pca';

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

function assignRowsAndCols(data: FeatureCollection<Point>): FeatureCollection<Point, GridPointProps> {
    const sortedFeaturesX = data.features
        .sort((a, b) => a.geometry.coordinates[0] < b.geometry.coordinates[0] ? 1 : -1);

    const deltaXs = [];
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