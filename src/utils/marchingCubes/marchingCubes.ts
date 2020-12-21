import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';


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
        threshold: number, cubeWidth: number, cubeHeight: number, cubeDepth: number): Float32Array {

        // writing entry data into memory
        const entryDataAddress = this.exports.__heap_base;
        const entryData = new Float32Array(this.memory.buffer, entryDataAddress, data.length);
        entryData.set(data);

        // writing result data placeholder into memory
        const resultDataAddress = entryDataAddress + entryData.length * entryData.BYTES_PER_ELEMENT;
        const maxNrVertices = (this.exports['getMaxNrVertices'] as Function)(X, Y, Z);
        const resultData = new Float32Array(this.memory.buffer, resultDataAddress, maxNrVertices * 3);
        resultData.set(new Array(maxNrVertices * 3).fill(0).map(i => 0));

        // marching cubes
        const resultNrVertices = (this.exports['marchCubes'] as Function)
            // (Vertex* vertices, float* data, int X, int Y, int Z, float threshold, float cubeWidth, float cubeHeight, float cubeDepth)
              (resultDataAddress, entryDataAddress, X,    Y,     Z,       threshold,       cubeWidth,       cubeHeight,       cubeDepth);
        
        // accessing result memory
        console.log('resultData', resultData);
        console.log('resultData max', resultData.reduce((c, v) => v > c ? v : c));
        return resultData.slice(0, resultNrVertices * 3);
    }

}