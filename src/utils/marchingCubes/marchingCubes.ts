import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshLambertMaterial, MeshPhongMaterial, MeshStandardMaterial } from 'three';
import { ArrayCubeF32 } from '../arrayMatrix';


/**
 * Thanks to https://surma.dev/things/c-to-webassembly/ !
 */


export function fetchWasm(): Observable<MarchingCubeService> {
    const memory = new WebAssembly.Memory({
        initial: 10000, // in pages (64KiB / Page)
        maximum: 10000
    });

    const sourcePromise = (WebAssembly as any).instantiateStreaming(fetch('assets/marchingCubes.wasm'), {
        env: {
            memory: memory
        }
    });

    return from(sourcePromise).pipe(
        map((source: WebAssembly.WebAssemblyInstantiatedSource) => {
            return new MarchingCubeService(source, memory);
        })
    );
}



export class MarchingCubeService {

    exports: Record<string, any>;

    constructor(
        private source: WebAssembly.WebAssemblyInstantiatedSource,
        private memory: WebAssembly.Memory) {
        this.exports = this.source.instance.exports;
    }


    marchCubes(X: number, Y: number, Z: number, data: Float32Array,
        threshold: number, cubeWidth: number, cubeHeight: number, cubeDepth: number,
        x0: number, y0: number, z0: number): Float32Array {

        // writing entry data into memory
        const entryDataAddress = this.exports.__heap_base;
        const entryData = new Float32Array(this.memory.buffer, entryDataAddress, data.length);
        entryData.set(data);

        // writing result data placeholder into memory
        const resultDataAddress = entryDataAddress + entryData.length * entryData.BYTES_PER_ELEMENT;
        const maxNrVertices = (this.exports['getMaxNrVertices'] as Function)(X, Y, Z);
        const resultData = new Float32Array(this.memory.buffer, resultDataAddress, maxNrVertices * 3);
        // resultData.set(new Array(maxNrVertices * 3).fill(0).map(i => 0)); <-- Avoid setting data as much as possible - array copying takes a *lot* of time!

        // marching cubes
        const resultNrVertices = (this.exports['marchCubes'] as Function)
            (resultDataAddress, entryDataAddress, X, Y, Z, threshold, cubeWidth, cubeHeight, cubeDepth, x0, y0, z0);

        // accessing result memory
        return resultData.slice(0, resultNrVertices * 3);
    }


    getNormals(vertices: Float32Array, X: number, Y: number, Z: number) {

        // writing entry data into memory
        const entryDataAddress = this.exports.__heap_base;
        const entryData = new Float32Array(this.memory.buffer, entryDataAddress, vertices.length);
        entryData.set(vertices);

        // writing result data placeholder into memory
        const resultDataAddress = entryDataAddress + entryData.length * entryData.BYTES_PER_ELEMENT;
        const resultData = new Float32Array(this.memory.buffer, resultDataAddress, vertices.length);
        // resultData.set(new Array(vertices.length).fill(0).map(i => 0)); <-- Avoid setting data as much as possible - array copying takes a *lot* of time!

        // calculating normals
        const success = (this.exports['getNormals'] as Function)
            (entryDataAddress, vertices.length, resultDataAddress);

        // returning result memory copy
        const copy = new Float32Array(vertices.length);
        copy.set(resultData);
        return copy;
    }


    mapColors(
        vertices: Float32Array,
        data: Float32Array, X: number, Y: number, Z: number,
        normals: Float32Array,
        minVal: number, maxVal: number,
        sizeX: number, sizeY: number, sizeZ: number, x0: number, y0: number, z0: number) {

        // writing entry data into memory
        const entryDataAddress1 = this.exports.__heap_base;
        const entryData1 = new Float32Array(this.memory.buffer, entryDataAddress1, vertices.length);
        entryData1.set(vertices);
        const entryDataAddress2 = entryDataAddress1 + entryData1.length * entryData1.BYTES_PER_ELEMENT;
        const entryData2 = new Float32Array(this.memory.buffer, entryDataAddress2, data.length);
        entryData2.set(data);
        const entryDataAddress3 = entryDataAddress2 + entryData2.length * entryData2.BYTES_PER_ELEMENT;
        const entryData3 = new Float32Array(this.memory.buffer, entryDataAddress3, normals.length);
        entryData3.set(normals);

        // writing result data placeholder into memory
        const resultDataAddress = entryDataAddress3 + normals.length * entryData3.BYTES_PER_ELEMENT;
        const resultData = new Float32Array(this.memory.buffer, resultDataAddress, vertices.length);
        // resultData.set(new Array(vertices.length).fill(0).map(i => 0)); <-- Avoid setting data as much as possible - array copying takes a *lot* of time!

        // calculating colors
        const success = (this.exports['mapColors'] as Function)
        // (float* data, int X, int Y, int Z,
        //     Vertex* vertices, int nrVertices, float sizeX, float sizeY, float sizeZ, float x0, float y0, float z0,
        //     Vertex* normals, 
        //     Vertex* colors, float minVal, float maxVal) 
            (entryDataAddress2, X, Y, Z,
            entryDataAddress1, vertices.length, sizeX, sizeY, sizeZ, x0, y0, z0,
            entryDataAddress3,
            resultDataAddress, minVal, maxVal);

        // returning result memory copy
        const copy = new Float32Array(vertices.length);
        copy.set(resultData);
        return copy;
    }

}




export interface Bbox {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
}



export class BlockContainer {

    public mesh: Mesh;

    constructor(
        private mcSvc: MarchingCubeService,
        public startPoint: [number, number, number], // dataSet-offset; !== worldCoords-offset
        public blockSize: [number, number, number],
        public data: Float32Array,
        public dataDimensions: [number, number, number],
        public threshold: number,
        public cubeSize: [number, number, number],
        public minVal: number,
        public maxVal: number) {

        const attrs = this.calculateAttributes();
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', attrs.position);
        geometry.setAttribute('normal', attrs.normal);
        geometry.setAttribute('color', attrs.color);
        const material = new MeshStandardMaterial({
            vertexColors: true,
            side: DoubleSide,
            wireframe: false
        });
        const mesh = new Mesh(geometry, material);

        this.mesh = mesh;
    }

    public getBbox(): Bbox {
        const startPointWorldCoords = this.mesh.position.toArray();
        const xLength = this.blockSize[0] * this.cubeSize[0];
        const yLength = this.blockSize[1] * this.cubeSize[1];
        const zLength = this.blockSize[2] * this.cubeSize[2];
        return {
            xMin: startPointWorldCoords[0],
            yMin: startPointWorldCoords[1],
            zMin: startPointWorldCoords[2],
            xMax: startPointWorldCoords[0] + 2 * xLength,
            yMax: startPointWorldCoords[1] + 2 * yLength,
            zMax: startPointWorldCoords[2] + 2 * zLength,
        };
    }

    public translate(newPos: [number, number, number]): void {
        this.mesh.translateX(newPos[0]);
        this.mesh.translateY(newPos[1]);
        this.mesh.translateZ(newPos[2]);
    }

    public updateData(data: Float32Array): void {
        this.data = data;
        const attrs = this.calculateAttributes();
        (this.mesh.geometry as BufferGeometry).setAttribute('position', attrs.position);
        (this.mesh.geometry as BufferGeometry).setAttribute('normal', attrs.normal);
        (this.mesh.geometry as BufferGeometry).setAttribute('color', attrs.color);
    }

    public updateThreshold(threshold: number): void {
        this.threshold = threshold;
        const attrs = this.calculateAttributes();
        (this.mesh.geometry as BufferGeometry).setAttribute('position', attrs.position);
        (this.mesh.geometry as BufferGeometry).setAttribute('normal', attrs.normal);
        (this.mesh.geometry as BufferGeometry).setAttribute('color', attrs.color);
    }

    private calculateAttributes() {
        const vertices = this.mcSvc.marchCubes(
            this.dataDimensions[0], this.dataDimensions[1], this.dataDimensions[2],
            this.data, this.threshold,
            this.cubeSize[0], this.cubeSize[1], this.cubeSize[2],
            0, 0, 0);
        const normals = this.mcSvc.getNormals(vertices,
            this.dataDimensions[0], this.dataDimensions[1], this.dataDimensions[2]);
        const colors = this.mcSvc.mapColors(
            vertices, this.data, this.dataDimensions[0], this.dataDimensions[1], this.dataDimensions[2], normals,
            this.minVal, this.maxVal, this.cubeSize[0], this.cubeSize[1], this.cubeSize[2], 0, 0, 0);

        const attrs = {
            position: new BufferAttribute(vertices, 3, false),
            normal: new BufferAttribute(normals, 3, false),
            color: new BufferAttribute(colors, 3, false)
        };

        return attrs;
    }
}


export function createMarchingCubeBlockMeshes(
    data: ArrayCubeF32, threshold: number,
    cubeSize: [number, number, number], blockSize: [number, number, number],
    minVal: number, maxVal: number,
    mcSvc: MarchingCubeService): BlockContainer[] {
    const blocks: BlockContainer[] = [];

    const X = data.X;
    const Y = data.Y;
    const Z = data.Z;
    let x0 = 0;
    let y0 = 0;
    let z0 = 0;

    while (x0 < X) {
        y0 = 0;
        while (y0 < Y) {
            z0 = 0;
            while (z0 < Z) {

                const startPoint: [number, number, number] = [x0, y0, z0];
                const blockSizeAdjusted: [number, number, number] = [
                    Math.min(blockSize[0], (X - x0)),
                    Math.min(blockSize[1], (Y - y0)),
                    Math.min(blockSize[2], (Z - z0))
                ];
                const subBlockData = data.getSubBlock(startPoint, blockSizeAdjusted);
                const container = new BlockContainer(
                    mcSvc, startPoint, blockSizeAdjusted, subBlockData.data,
                    [subBlockData.X, subBlockData.Y, subBlockData.Z],
                    threshold, cubeSize, minVal, maxVal
                );
                container.translate([x0 * cubeSize[0], y0 * cubeSize[1], z0 * cubeSize[2]]);
                blocks.push(container);

                z0 += blockSize[2] - 1;
            }
            y0 += blockSize[1] - 1;
        }
        x0 += blockSize[0] - 1;
    }

    return blocks;
}