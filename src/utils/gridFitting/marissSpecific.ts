import { FeatureCollection, Point, Feature } from 'geojson';
import { GridPointProps } from '../../utils/ol/cubicSplines/cubicSplines3';
import { pointDistance } from '../../utils/math';



function getLeftMostFeaturePerRow(data: FeatureCollection<Point, any>) {
    const nrRows = Math.max(... data.features.map(f => f.properties.row));
    const out: Feature<Point, any>[] = new Array(nrRows);
    for (let row = 0; row < nrRows; row++) {
        const candidates = data.features
            .filter(f => f.properties.row === row)
            .filter(f => !f.properties.col);
        const leftMost = candidates.reduce((previous, current) => previous.properties.preliminaryColumn > current.properties.preliminaryColumn ? previous : current, candidates[0]);
        out[row] = leftMost;
    }
    return out;
}

function keysSortedByValue(object: any): number[] {
    const sortable = [];
    for (const key in object) {
        sortable.push([key, object[key]]);
    }
    sortable.sort((a, b) => a[1] - b[1]);
    return sortable.map(s => s[0]).map(s => Math.abs(parseFloat(s)));
}

function calcMostCommonDeltaX(candidates: Feature<Point>[]) {
    candidates.sort((c1, c2) => c1.properties.row < c2.properties.row ? -1 : 1);
    const deltas: {[key: number]: number} = {};
    for (let i = 1; i < candidates.length; i++) {
        if (!candidates[i] || !candidates[i - 1]) continue;
        const delta = +(candidates[i].geometry.coordinates[0] - candidates[i - 1].geometry.coordinates[0]).toPrecision(3);
        if (deltas[delta]) {
            deltas[delta] += 1;
        } else {
            deltas[delta] = 1;
        }
    }
    const sortedDeltas = keysSortedByValue(deltas);
    return sortedDeltas[0];
}

function calcSmallestDeltaX(candidates: Feature<Point>[]) {
    candidates.sort((c1, c2) => c1.properties.row < c2.properties.row ? -1 : 1);
    let smallest = 100000;
    for (let i = 1; i < candidates.length; i++) {
        if (!candidates[i] || !candidates[i - 1]) continue;
        const delta = +(candidates[i].geometry.coordinates[0] - candidates[i - 1].geometry.coordinates[0]).toPrecision(3);
        if (delta < smallest) {
            smallest = delta;
        }
    }
    return smallest;
}

function calcMostCommonX(candidates: Feature<Point>[]) {
    const xs: {[key: number]: number} = {};
    for (const candidate of candidates) {
        if (!candidate) continue;
        const x = +(candidate.geometry.coordinates[0]).toPrecision(5);
        if (xs[x]) {
            xs[x] += 1;
        } else {
            xs[x] = 1;
        }
    }

    const sortedXs = keysSortedByValue(xs);
    return sortedXs[0];
}

function straighten(candidates: Feature<Point>[], deltaX: number) {
    for (let i = 0; i < candidates.length; i++) {
        if (!candidates[i]) continue;
        candidates[i].geometry.coordinates[0] += i * deltaX;
    }
    return candidates;
}

function splitDataInRows(data: Feature<Point>[]): Feature<Point>[][] {
    const maxRow = Math.max( ... data.map(f => +(f.properties.row)));
    const rows: Feature<Point>[][] = new Array(maxRow).map(e => []);
    for (let r = 0; r < maxRow; r++) {
        const features = data.filter(d => d.properties.row === r);
        rows[r] = features;
    }
    return rows;
}

function getLargestRowIndex(data: Feature<Point>[][]): number {
    let largestRowIndex = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i].length > data[largestRowIndex].length) {
            largestRowIndex = i;
        }
    }
    return largestRowIndex;
}

function getColsFromXNearest(row: Feature<Point>[], annotedRow: Feature<Point>[]) {
    let availableCol = 0;
    for (let f of row) {
        let smallestD = 10000;
        for (let i = availableCol; i < annotedRow.length; i++) {
            const candidate = annotedRow[i];
            const d = pointDistance(f.geometry.coordinates, candidate.geometry.coordinates);
            if (d < smallestD) {
                smallestD = d;
                availableCol = candidate.properties.col;
            }
        }
        f.properties.col = availableCol;
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


    const rows = splitDataInRows(data.features);
    const xSortedRows = rows.map(row => {
        return row.sort((f1, f2) => f1.geometry.coordinates[0] < f2.geometry.coordinates[0] ? -1 : 1);
    });
    const largestRowIndex = getLargestRowIndex(rows);
    const largestRow = xSortedRows[largestRowIndex];

    // const largestRowSize = xSortedRows[largestRowIndex].length;
    // const largestRowSpread = xSortedRows[largestRowIndex][largestRowSize - 1].geometry.coordinates[0] - xSortedRows[largestRowIndex][0].geometry.coordinates[0];
    // const deltaX = largestRowSpread / largestRowSize;
    // for (const row of xSortedRows) {
    //     const 
    //     for (const feature of row) {
    //         const x = feature.geometry.coordinates[0];
    //     }
    // }

    largestRow.map((v, i) => v.properties.col = i);
    for (let i = largestRowIndex + 1; i < rows.length; i++) {
        // const annotedRow = xSortedRows[i - 1];
        const row = xSortedRows[i];
        getColsFromXNearest(row, largestRow);
    }
    for (let i = largestRowIndex - 1; i > 0; i--) {
        // const annotedRow = xSortedRows[i + 1];
        const row = xSortedRows[i];
        getColsFromXNearest(row, largestRow);
    }


    // const maxCol = Math.max(... data.features.map(f => f.properties.preliminaryColumn));
    // for (let col = 0; col < maxCol; col++) {
    //     const candidates = getLeftMostFeaturePerRow(data);
    //     const deltaX = calcMostCommonDeltaX(candidates);
    //     const x0 = candidates[0].geometry.coordinates[0];
    //     for (let i = 0; i < candidates.length; i++) {
    //         if (!candidates[i]) continue;
    //         if (candidates[i].geometry.coordinates[0] <= x0 + i * deltaX) {
    //             candidates[i].properties.col = col;
    //         }
    //     }
    // }
    // const realMaxCol = Math.max(... data.features.map(f => f.properties.preliminaryColumn));
    // for (const feature of data.features) {
    //     if (feature.properties.col !== 0 && !feature.properties.col) {
    //         feature.properties.col = realMaxCol;
    //     }
    // }

    return data as FeatureCollection<Point, GridPointProps>;
}