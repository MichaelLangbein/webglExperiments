

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string, format = 'png') {
    const url = canvas.toDataURL(format);
    window.open(url);
    // const link = document.createElement('a') as HTMLAnchorElement;
    // link.href = url;
    // link.download = filename + '.' + format;
    // link.click();
}