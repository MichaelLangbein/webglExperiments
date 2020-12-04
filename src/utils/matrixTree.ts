
export interface DataPoint {
    x: number;
    y: number;
    data: any;
}

interface Bbox {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}

function getBbox(data: DataPoint[]): Bbox {
    const xs = data.map(dp => dp.x);
    const ys = data.map(dp => dp.y);
    return {
        xMin: Math.min(...xs),
        xMax: Math.max(...xs),
        yMin: Math.min(...ys),
        yMax: Math.max(...ys),
    };
}


interface SplitLine {
    dir: 'x' | 'y';
    val: number;
}

function getSplitLine(bbox: Bbox): SplitLine {
    const lengthX = bbox.xMax - bbox.xMin;
    const lengthY = bbox.yMax - bbox.yMin;
    if (lengthX > lengthY) {
        return {
            dir: 'x',
            val: bbox.xMin + lengthX / 2
        };
    } else {
        return {
            dir: 'y',
            val: bbox.yMin + lengthY / 2
        };
    }
}

function splitData(splitLine: SplitLine, data: DataPoint[]): [DataPoint[], DataPoint[]] {
    const set1: DataPoint[] = [];
    const set2: DataPoint[] = [];
    for (const dp of data) {
        if (dp[splitLine.dir] < splitLine.val) {
            set1.push(dp);
        } else {
            set2.push(dp);
        }
    }
    return [set1, set2];
}

function splitBbox(splitLine: SplitLine, bbox: Bbox): [Bbox, Bbox] {
    const bbox1: Bbox = {...bbox};
    const bbox2: Bbox = {...bbox};
    if (splitLine.dir === 'x') {
        bbox1.xMax = splitLine.val;
        bbox2.xMin = splitLine.val;
    } else {
        bbox1.yMax = splitLine.val;
        bbox2.yMin = splitLine.val;
    }
    return [bbox1, bbox2];
}

interface NodeData {
    bbox: Bbox;
    data: DataPoint[];
};

class MatrixTreeNode {

    public data: DataPoint[];
    public leftChild: MatrixTreeNode;
    public rightChild: MatrixTreeNode;
    public bbox: Bbox;

    /**
     * Note that bbox may be larger than required for data
     */
    constructor(data: DataPoint[], bbox: Bbox) {
        this.bbox = bbox;
        this.data = data;
    }

    public splitLowest(): void {
        if (!this.leftChild) {
            this.split();
        } else {
            this.leftChild.splitLowest();
            this.rightChild.splitLowest();
        }
    }

    public split(): void {
        const splitLine = getSplitLine(this.bbox);
        const [bbox1, bbox2] = splitBbox(splitLine, this.bbox);
        const [data1, data2] = splitData(splitLine, this.data);
        this.leftChild = new MatrixTreeNode(data1, bbox1);
        this.rightChild = new MatrixTreeNode(data2, bbox2);
    }

    public getDataLengthRecursive(): number[] {
        if (this.leftChild) {
            const lengthsLeft = this.leftChild.getDataLengthRecursive();
            const lengthsRight = this.rightChild.getDataLengthRecursive();
            return Array.prototype.concat(...lengthsLeft, ...lengthsRight);
        } else {
            return [this.data.length];
        }
    }

    public getDataRecursive(): NodeData[] {
        if (this.leftChild) {
            const dataLeft = this.leftChild.getDataRecursive();
            const dataRight = this.rightChild.getDataRecursive();
            return Array.prototype.concat(...dataLeft, ...dataRight);
        } else {
            return [{
                bbox: this.bbox,
                data: this.data
            }];
        }
    }

}

/**
 * This is a special kind of binary tree.
 * It is designed to parse a grid of data points into a matrix.
 *
 * ```js
 * const data: DataPoint[] = ...
 * const matrix: number[][] = getMatrixData(data);
 * ```
 *
 * Whereas normally a binary tree stops branching once there is 1 data point at every leave,
 * this tree keeps subdividing every branch until none has more than one data point.
 * In other words: normal binary trees may be asymmetric, whereas this one is always symmetric.
 * Also, normal binary trees have no leaves with no data in them, whereas this one does.
 */
export function getMatrixData(data: DataPoint[]) {
    const bbox = getBbox(data);
    const tree = new MatrixTreeNode(data, bbox);

    while (Math.max(...tree.getDataLengthRecursive()) > 1) {
        tree.splitLowest();
    }

    const treeData = tree.getDataRecursive();

    const matrix = sortTreeDataIntoMatrix(treeData);

    const rowFilteredMatrix = filterMatrixRows(matrix);
    const colFilteredMatrix = filterMatrixCols(rowFilteredMatrix);

    return colFilteredMatrix;
}

function filterMatrixCols(matrix: any[][]): any[][] {
    if (matrix.length === 0) {
        return matrix;
    }

    const nrCols = matrix[0].length;
    const colFilteredMatrix = Array(matrix.length).fill(0).map(el => []);
    for (let colIndx = 0; colIndx < nrCols; colIndx++) {
        const col = matrix.map(row => row[colIndx]);
        if (col.find((el: any) => el !== null)) {
            for (let rowIndx = 0; rowIndx < matrix.length; rowIndx++) {
                colFilteredMatrix[rowIndx].push(col[rowIndx]);
            }
        }
    }
    return colFilteredMatrix;
}

function filterMatrixRows(matrix: any[][]): any[][] {
    const rowFilteredMatrix = [];
    for (const row of matrix) {
        if (row.find((el: any) => el !== null)) {
            rowFilteredMatrix.push(row);
        }
    }
    return rowFilteredMatrix;
}

function sortTreeDataIntoMatrix(treeData: NodeData[]): any[][] {
    const colXs: number[] = [];
    const rowYs: number[] = [];
    for (const dp of treeData) {
        if (!colXs.includes(dp.bbox.xMin)) {
            colXs.push(dp.bbox.xMin);
        }
        if (!rowYs.includes(dp.bbox.yMin)) {
            rowYs.push(dp.bbox.yMin);
        }
    }
    colXs.sort((a, b) => b - a);
    rowYs.sort((a, b) => b - a);
    const nrRows = rowYs.length;
    const nrCols = colXs.length;
    const matrix = Array(nrRows).fill(0).map(el => Array(nrCols).fill(0).map(el => null));
    let r = -1;
    let c = -1;
    for (let rowY of rowYs) {
        r += 1;
        c = -1;
        const rowData = treeData.filter(td => td.bbox.yMin === rowY);
        for (let colX of colXs) {
            c += 1;
            const colData = rowData.find(td => td.bbox.xMin === colX);
            if (colData && colData.data.length > 0) {
                matrix[r][c] = colData.data[0].data;
            }
        }
    }
    return matrix;
}