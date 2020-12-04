import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshLambertMaterial } from 'three';

/**
 * All the information required to create the faces of a cube
 */
const cubeData = {
    'left': {
        normal: [-1, 0, 0],
        vertices: [
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, -1],
            [-1, 1, 1],
            [-1, -1, -1],
            [-1, -1, 1]
        ],
    },
    'right': {
        normal: [1, 0, 0],
        vertices: [
            [1, 1, 1],
            [1, -1, -1],
            [1, 1, -1],
            [1, 1, 1],
            [1, -1, 1],
            [1, -1, -1],
        ],
    },
    'top': {
        normal: [0, 1, 0],
        vertices: [
            [-1, 1, 1],
            [1, 1, 1],
            [1, 1, -1],
            [-1, 1, 1],
            [1, 1, -1],
            [-1, 1, -1],
        ],
    },
    'bottom': {
        normal: [0, -1, 0],
        vertices: [
            [-1, -1, 1],
            [1, -1, -1],
            [1, -1, 1],
            [-1, -1, 1],
            [-1, -1, -1],
            [1, -1, -1],
        ],
    },
    'front': {
        normal: [0, 0, 1],
        vertices: [
            [-1, 1, 1],
            [-1, -1, 1],
            [1, 1, 1],
            [1, 1, 1],
            [-1, -1, 1],
            [1, -1, 1],
        ],
    },
    'back': {
        normal: [0, 0, -1],
        vertices: [
            [-1, 1, -1],
            [1, 1, -1],
            [-1, -1, -1],
            [1, 1, -1],
            [1, -1, -1],
            [-1, -1, -1],
        ],
    },
};


export interface Bbox {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
}



export function createBlockMeshes(data: number[][][], cubeSize: number, blockSize: [number, number, number], colorFunc: (n: number) => [number, number, number]): BlockContainer[] {
    const blocks: BlockContainer[] = [];

    const X = data.length;
    const Y = data[0].length;
    const Z = data[0][0].length;
    let x0 = 0;
    let y0 = 0;
    let z0 = 0;

    while (x0 < X-2) {
        y0 = 0;
        while (y0 < Y-2) {
            z0 = 0;
            while (z0 < Z-2) {

                const startPoint: [number, number, number] = [x0, y0, z0];
                const blockSizeAdjusted: [number, number, number] = [Math.min(blockSize[0], (X - x0)), Math.min(blockSize[1], (Y - y0)), Math.min(blockSize[2], (Z - z0))];
                const subBlockData = getSubBlock(data, startPoint, blockSizeAdjusted);
                const container = new BlockContainer(startPoint, blockSizeAdjusted, subBlockData, cubeSize, colorFunc);
                container.translate([x0 * cubeSize, y0 * cubeSize, z0 * cubeSize]);
                blocks.push(container);

                z0 += blockSize[2] - 2;
            }
            y0 += blockSize[1] - 2;
        }
        x0 += blockSize[0] - 2;
    }

    return blocks;
}


export class BlockContainer {

    public mesh: Mesh;

    /**
     * @param startPoint : the index in the overall data-set where this block's hull begins
     * @param blockSize : the size of the block's data-set including the hull
     * @param data : the data [x+2*y+2*z+2], consisting of a core [x*y*z] and a 1-block thick hull.
     * @param cubeSize
     * @param colorFunc
     */
    constructor(
        public startPoint: [number, number, number],
        public blockSize: [number, number, number],
        data: number[][][],
        public cubeSize: number,
        public colorFunc: (n: number) => [number, number, number]) {

        const attrs = createSubBlockCubeAttributes(data, cubeSize, colorFunc);
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', attrs.position);
        geometry.setAttribute('normal', attrs.normal);
        geometry.setAttribute('color', attrs.color);
        const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, wireframe: false });
        const mesh = new Mesh(geometry, material);

        this.mesh = mesh;
    }

    public getBbox(): Bbox {
        const startPoint = this.mesh.position.toArray();
        const xLength = this.blockSize[0] * this.cubeSize;
        const yLength = this.blockSize[1] * this.cubeSize;
        const zLength = this.blockSize[2] * this.cubeSize;
        return {
            xMin: startPoint[0],
            yMin: startPoint[1],
            zMin: startPoint[2],
            xMax: startPoint[0] + xLength,
            yMax: startPoint[1] + yLength,
            zMax: startPoint[2] + zLength,
        }
    }

    public translate(newPos: [number, number, number]): void {
        this.mesh.translateX(newPos[0]);
        this.mesh.translateY(newPos[1]);
        this.mesh.translateZ(newPos[2]);
    }

    public updateData(data: number[][][]): void {
        const attrs = createSubBlockCubeAttributes(data, this.cubeSize, this.colorFunc);
        (this.mesh.geometry as BufferGeometry).setAttribute('position', attrs.position);
        (this.mesh.geometry as BufferGeometry).setAttribute('normal', attrs.normal);
        (this.mesh.geometry as BufferGeometry).setAttribute('color', attrs.color);
    }
}


function createSubBlockCubeAttributes(
    data: number[][][], cubeSize: number,
    colorFunc: (n: number) => [number, number, number]) {

    const X = data.length;
    const Y = data[0].length;
    const Z = data[0][0].length;

    const vertices: number[][] = [];
    const normals: number[][] = [];
    const colors: number[][] = [];
    for (let x = 1; x < X - 1; x++) {
        for (let y = 1; y < Y - 1; y++) {
            for (let z = 1; z < Z - 1; z++) {
                if (data[x][y][z] !== 0) {

                    // left neighbor
                    if (x === 0 || data[x - 1][y][z] === 0) {
                        for (const vertex of cubeData.left.vertices) {
                            vertices.push([
                                cubeSize * (vertex[0] / 2 + x),
                                cubeSize * (vertex[1] / 2 + y),
                                cubeSize * (vertex[2] / 2 + z),
                            ]);
                            normals.push(cubeData.left.normal);
                            colors.push(colorFunc(data[x][y][z]));
                        }
                    }

                    // right neighbor
                    if (x === X - 1 || data[x + 1][y][z] === 0) {
                        for (const vertex of cubeData.right.vertices) {
                            vertices.push([
                                cubeSize * (vertex[0] / 2 + x),
                                cubeSize * (vertex[1] / 2 + y),
                                cubeSize * (vertex[2] / 2 + z),
                            ]);
                            normals.push(cubeData.right.normal);
                            colors.push(colorFunc(data[x][y][z]));
                        }
                    }

                    // top neighbor
                    if (y === Y - 1 || data[x][y + 1][z] === 0) {
                        for (const vertex of cubeData.top.vertices) {
                            vertices.push([
                                cubeSize * (vertex[0] / 2 + x),
                                cubeSize * (vertex[1] / 2 + y),
                                cubeSize * (vertex[2] / 2 + z),
                            ]);
                            normals.push(cubeData.top.normal);
                            colors.push(colorFunc(data[x][y][z]));
                        }
                    }

                    // bottom neighbor
                    if (y === 0 || data[x][y - 1][z] === 0) {
                        for (const vertex of cubeData.bottom.vertices) {
                            vertices.push([
                                cubeSize * (vertex[0] / 2 + x),
                                cubeSize * (vertex[1] / 2 + y),
                                cubeSize * (vertex[2] / 2 + z),
                            ]);
                            normals.push(cubeData.bottom.normal);
                            colors.push(colorFunc(data[x][y][z]));
                        }
                    }

                    // front neighbor
                    if (z === Z - 1 || data[x][y][z + 1] === 0) {
                        for (const vertex of cubeData.front.vertices) {
                            vertices.push([
                                cubeSize * (vertex[0] / 2 + x),
                                cubeSize * (vertex[1] / 2 + y),
                                cubeSize * (vertex[2] / 2 + z),
                            ]);
                            normals.push(cubeData.front.normal);
                            colors.push(colorFunc(data[x][y][z]));
                        }
                    }

                    // back neighbor
                    if (z === 0 || data[x][y][z - 1] === 0) {
                        for (const vertex of cubeData.back.vertices) {
                            vertices.push([
                                cubeSize * (vertex[0] / 2 + x),
                                cubeSize * (vertex[1] / 2 + y),
                                cubeSize * (vertex[2] / 2 + z),
                            ]);
                            normals.push(cubeData.back.normal);
                            colors.push(colorFunc(data[x][y][z]));
                        }
                    }

                }
            }
        }
    }

    return {
        'position': new BufferAttribute(new Float32Array(vertices.flat()), 3),
        'normal': new BufferAttribute(new Float32Array(normals.flat()), 3),
        'color': new BufferAttribute(new Float32Array(colors.flat()), 3)
    };
}



export function getSubBlock(data: number[][][], start: [number, number, number], size: [number, number, number]): number[][][] {
    const subset: number[][][] = [];
    for (let x = 0; x < size[0]; x++) {
        subset.push([]);
        for (let y = 0; y < size[1]; y++) {
            subset[x].push([]);
            for (let z = 0; z < size[2]; z++) {
                subset[x][y].push(data[x + start[0]][y + start[1]][z + start[2]]);
            }
        }
    }
    return subset;
}
