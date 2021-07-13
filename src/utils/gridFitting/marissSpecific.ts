import { FeatureCollection, Point, Feature } from 'geojson';
import { GridPointProps } from '../ol/cubicSplines/cubicSplines_webgl1';
import { pointDistance, vectorSubtraction, vectorAddition, vectorProjectOnto, vectorDistance } from '../../utils/math';
import { PCA } from 'ml-pca';



class SweepedColumn {
    public y: number;
    public features: Feature<Point>[] = [];

    constructor(feature: Feature<Point>) {
        this.push(feature);
    }

    push(feature: Feature<Point>): void {
        const fy = feature.geometry.coordinates[1];
        this.y = fy;
        this.features.push(feature);
    }

    /**
     * The lower the returned number, the more the feature is in line with this column
     */
    pointsTo(feature: Feature<Point>): number {
        // f_proj = f, projected onto column-axis
        // distance = |f - f_proj|

        // if there's only one point in column, we don't know where it points to.
        if (this.features.length < 2) {
            return vectorDistance(this.features[0].geometry.coordinates, feature.geometry.coordinates);
        }

        const featureV = feature.geometry.coordinates;
        const firstV = this.features[0].geometry.coordinates;
        const lastV = this.features[this.features.length - 1].geometry.coordinates;

        const columnDirection = vectorSubtraction(lastV, firstV);
        const featureRelative = vectorSubtraction(featureV, firstV);
        const featureProjected = vectorProjectOnto(featureRelative, columnDirection);
        const distance = vectorDistance(featureRelative, featureProjected);

        return distance;
    }
}

/**
 * Assumes that each column is tilted towards the right (x) the higher up (in y) you go.
 */
function sweepColumnsWithRightTilt(data: FeatureCollection<Point>) {
    data.features.sort((f1, f2) => f1.geometry.coordinates[0] - f2.geometry.coordinates[0] > 0 ? 1 : -1);

    const columns: SweepedColumn[] = [new SweepedColumn(data.features[0])];

    for (let f = 1; f < data.features.length; f++) {
        const feature = data.features[f];
        const y = feature.geometry.coordinates[1];

        if (y < columns[columns.length - 1].y) {
            columns.push(new SweepedColumn(feature));
        } else {
            const candidateColumns = columns.filter(c => c.y < y);

            if (candidateColumns.length === 0) {
                columns.push(new SweepedColumn(feature));
                continue;
            }

            let lowestMiss = candidateColumns[0].pointsTo(feature);
            let bestColumn = 0;
            for (let i = 1; i < candidateColumns.length; i++) {
                let miss = candidateColumns[i].pointsTo(feature);
                if (miss < lowestMiss) {
                    lowestMiss = miss;
                    bestColumn = i;
                }
            }
            candidateColumns[bestColumn].push(feature);
        }
    }

    for (let c = 0; c < columns.length; c++) {
        for (const feature of columns[c].features) {
            feature.properties.col = c;
        }
    }
}

/**
 * Assumes that each column is tilted towards the left (x) the higher up (in y) you go.
 */
 function sweepColumnsWithLeftTilt(data: FeatureCollection<Point>) {
    data.features.sort((f1, f2) => f1.geometry.coordinates[0] - f2.geometry.coordinates[0] > 0 ? 1 : -1);

    const columns: SweepedColumn[] = [new SweepedColumn(data.features[0])];

    for (let f = 1; f < data.features.length; f++) {
        const feature = data.features[f];
        const y = feature.geometry.coordinates[1];

        if (y > columns[columns.length - 1].y) {
            columns.push(new SweepedColumn(feature));
        } else {
            const candidateColumns = columns.filter(c => c.y > y);

            if (candidateColumns.length === 0) {
                columns.push(new SweepedColumn(feature));
                continue;
            }

            let lowestMiss = candidateColumns[0].pointsTo(feature);
            let bestColumn = 0;
            for (let i = 1; i < candidateColumns.length; i++) {
                let miss = candidateColumns[i].pointsTo(feature);
                if (miss < lowestMiss) {
                    lowestMiss = miss;
                    bestColumn = i;
                }
            }
            candidateColumns[bestColumn].push(feature);
        }
    }

    for (let c = 0; c < columns.length; c++) {
        for (const feature of columns[c].features) {
            feature.properties.col = c;
        }
    }
}


/**
 * exploiting the fact that data has id's that increase row-wise from right to left and top to bottom.
 */
export function gridFit(data: FeatureCollection<Point>, valuePara: string): FeatureCollection<Point, GridPointProps> {

    let currentRow = 0;
    let currentCol = 0;
    let lastX = data.features[0].geometry.coordinates[0];
    data.features.sort((f1, f2) => (+f1.properties.id) < (+f2.properties.id) ? -1 : 1);
    for (const feature of data.features) {
        const x = feature.geometry.coordinates[0];
        if (x > lastX) {
            currentRow += 1;
            currentCol = 0;
        }

        feature.properties.row = currentRow;
        feature.properties.preliminaryColumn = currentCol;
        feature.properties.value = feature.properties[valuePara];
        lastX = x;
        currentCol += 1;
    }

    const pca = new PCA(data.features.map(f => f.geometry.coordinates));
    const eigenVectors = pca.getEigenvectors();
    const firstEigenVector = eigenVectors.getColumn(0);
    if (firstEigenVector[1] < 0) {
        sweepColumnsWithRightTilt(data);
    } else {
        sweepColumnsWithLeftTilt(data);
    }

    return data as FeatureCollection<Point, GridPointProps>;
}