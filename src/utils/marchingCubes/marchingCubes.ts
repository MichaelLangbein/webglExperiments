import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ArrayCube } from '../arrayMatrix';


export function fetchWasm(): Observable<MarchingCubeService> {
    const memory = new WebAssembly.Memory({
        initial: 100, // in pages (64KiB / Page)
        maximum: 1000
    });

    const sourcePromise = WebAssembly.instantiateStreaming(fetch('assets/marchingCubes.wasm'), {
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


interface Pointer {
    name: string;
    location: number;
    size: number;
}


export class MarchingCubeService {

    exports: Record<string, WebAssembly.ExportValue>;

    constructor(
        private source: WebAssembly.WebAssemblyInstantiatedSource,
        private memory: WebAssembly.Memory) {
        this.exports = this.source.instance.exports;
    }

    marchCubes(data: ArrayCube): Float32Array {
        const maxNrVertices = (this.exports['getMaxNrVertices'] as Function)(data.X, data.Y, data.Z);
        const resultMemory = this.malloc();
    }

    malloc(data: ArrayLike): Pointer {

    }

    free(ptr: Pointer): void {
        
    }
}