import { FeatureCollection, Point, Feature } from 'geojson';
import { GridPointProps } from '../ol/cubicSplines/cubicSplines_webgl1';
import { vectorDistance, vectorSubtraction, vectorProjectOnto, vectorProjectedOntoLength, scalarProduct, vectorAngle } from '../math';


function distanceAndAngleLineToPoint(line: Column | Row, feature: Feature<Point>): {distance: number, angle: number} {
    // f_proj = f, projected onto line
    // distance = |f - f_proj|

    // if there's only one point in column, we don't know yet where it points to.
    if (line.features.length < 2) {
        const distance = vectorDistance(line.features[0].geometry.coordinates, feature.geometry.coordinates);
        const angle = 0;
        return {distance, angle};
    }

    const featureV = feature.geometry.coordinates;
    const firstV = line.features[0].geometry.coordinates;
    const lastV = line.features[line.features.length - 1].geometry.coordinates;

    const columnDirection = vectorSubtraction(lastV, firstV);
    const featureRelative = vectorSubtraction(featureV, firstV);

    const featureProjectedLength = vectorProjectedOntoLength(featureRelative, columnDirection);
    const featureProjected = scalarProduct(featureProjectedLength, columnDirection);
    let distance = vectorDistance(featureRelative, featureProjected);
    if (featureProjectedLength < 1.0) {
        // if the feature is not outside of the columns current bounds, it cannot be pushed on top of it.
        distance = Infinity;
    }

    const angle = vectorAngle(columnDirection, featureRelative);

    return {distance, angle};
}

function distanceMetric (distance: number, angle: number) {
    return distance * (1.0 + angle);
}

class Column {
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
        const m = distanceAndAngleLineToPoint(this, feature);
        return distanceMetric(m.distance, m.angle);
    }
}

class Row {
    public x: number;
    public features: Feature<Point>[] = [];

    constructor(feature: Feature<Point>) {
        this.push(feature);
    }

    push(feature: Feature<Point>): void {
        const fx = feature.geometry.coordinates[0];
        this.x = fx;
        this.features.push(feature);
    }

    /**
     * The lower the returned number, the more the feature is in line with this row
     */
    pointsTo(feature: Feature<Point>): number {
        const m = distanceAndAngleLineToPoint(this, feature);
        return distanceMetric(m.distance, m.angle);
    }
}


function lineSweepCols(data: FeatureCollection<Point>, errorThreshold: number): FeatureCollection<Point> {
    data.features.sort((f1, f2) => f1.geometry.coordinates[0] - f2.geometry.coordinates[0]);

    const columns: Column[] = [];
    for (let f = 0; f < data.features.length; f++) {
        const feature = data.features[f];

        let minErr = Infinity;
        let bestColumn;
        for (let c = 0; c < columns.length; c++) {
            const column = columns[c];
            const err = column.pointsTo(feature);
            if (err < minErr) {
                minErr = err;
                bestColumn = column;
            }
        }
        if (bestColumn && minErr < errorThreshold) {
            bestColumn.push(feature);
        } else {
            columns.push(new Column(feature));
        }
    }

    for (let c = 0; c < columns.length; c++) {
        const column = columns[c];
        for (let feature of column.features) {
            feature.properties.col = c;
        }
    }

    return data;
}

function lineSweepRows(data: FeatureCollection<Point>, errorThreshold: number): FeatureCollection<Point> {
    data.features.sort((f1, f2) => f1.geometry.coordinates[1] - f2.geometry.coordinates[1]);

    const rows: Row[] = [];
    for (const feature of data.features) {

        let minErr = Infinity;
        let bestRow;
        for (const row of rows) {
            const err = row.pointsTo(feature);
            if (err < minErr) {
                minErr = err;
                bestRow = row;
            }
        }
        if (bestRow && minErr < errorThreshold) {
            bestRow.push(feature);
        } else {
            rows.push(new Row(feature));
        }
    }

    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (let feature of row.features) {
            feature.properties.row = r;
        }
    }

    return data;
}

export function gridFit(data: FeatureCollection<Point>, valuePara: string, maxColDistance: number, maxRowDistance: number): FeatureCollection<Point, GridPointProps> {

    data = lineSweepCols(data, maxColDistance);
    data = lineSweepRows(data, maxRowDistance);

    for (const feature of data.features) {
        feature.properties.value = feature.properties[valuePara];
    }

    return data as any;
}
