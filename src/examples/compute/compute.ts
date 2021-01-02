export type ArrBuffer = Uint8Array | Uint32Array | Float32Array | Float64Array;
let GPUBufferUsage: any;
let GPUShaderStage: any;



export const createInputBuffer = (device: any, data: ArrBuffer) => {

    const gpuBuffer = device.createBuffer({
        mappedAtCreation: true,
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE
    });
    const jsBuffer = gpuBuffer.getMappedRange();
    new Uint8Array(jsBuffer).set(data);
    gpuBuffer.unmap();

    return gpuBuffer;
};


export const createOutputBuffer = (device: any, size: number) => {
    const gpuBuffer = device.createBuffer({
        size: size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    return gpuBuffer;
};


export const createBindGroupAndLayout = (device: any, inputs: any[], outputs: any[]) => {

    const layoutEntries = [];
    for (let i = 0; i < inputs.length; i++) {
        layoutEntries.push({
            binding: i,
            visibility: GPUShaderStage.COMPUTE,
            type: "readonly-storage-buffer"
        });
    }
    for (let i = 0; i < outputs.length; i++) {
        layoutEntries.push({
            binding: inputs.length + i,
            visibility: GPUShaderStage.COMPUTE,
            type: "storage-buffer"
        });
    }

    const bindGroupEntries = [];
    for (let i = 0; i < inputs.length; i++) {
        bindGroupEntries.push({
            binding: i,
            resource: {
                buffer: inputs[i]
            }
        });
    }
    for (let i = 0; i < outputs.length; i++) {
        bindGroupEntries.push({
            binding: inputs.length + i,
            resource: {
                buffer: outputs[i]
            }
        });
    }

    const bindGroupLayout = device.createBindGroupLayout({
        entries: layoutEntries,
    });

    const bindGoup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: bindGroupEntries
    });

    return bindGroupLayout;
};



async function main() {
    // @ts-ignore
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
}

main();