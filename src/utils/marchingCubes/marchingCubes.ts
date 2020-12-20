import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';


export function fetchWasm(): Observable<MarchingCubeService> {
    const memory = new WebAssembly.Memory({
        initial: 1000, // in pages (64KiB / Page)
        maximum: 1000
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
        const entryDataAddress = 0;
        const entryData = new Float32Array(this.memory.buffer, entryDataAddress, data.length);
        entryData.set(data);

        // result data properties
        const resultDataAddress = entryDataAddress + entryData.length * entryData.BYTES_PER_ELEMENT;
        const maxNrVertices = (this.exports['getMaxNrVertices'] as Function)(X, Y, Z);
        const resultData = new Float32Array(this.memory.buffer, resultDataAddress, maxNrVertices*3);

        const resultNrVertices = (this.exports['marchCubes'] as Function)
            (resultDataAddress, entryDataAddress, X, Y, Z, threshold, cubeWidth, cubeHeight, cubeDepth);
        const shortenedData = resultData.slice(0, resultNrVertices*3);

        return shortenedData;
    }

}