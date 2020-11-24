
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

    public splitRecursive(): void {
        if (!this.leftChild) {
            const splitLine = getSplitLine(this.bbox);
            const [bbox1, bbox2] = splitBbox(splitLine, this.bbox);
            const [data1, data2] = splitData(splitLine, this.data);
            this.leftChild = new MatrixTreeNode(data1, bbox1);
            this.rightChild = new MatrixTreeNode(data2, bbox2);
            this.leftChild.splitRecursive();
            this.rightChild.splitRecursive();
        } else {
            this.leftChild.splitRecursive();
            this.rightChild.splitRecursive();
        }
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

    public getDataRecursive(): {bbox: Bbox, data: DataPoint[]}[] {
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
        this.tree.splitRecursive();
    }

    const matrixData = this.tree.getDataRecursive();
    return matrixData;
}