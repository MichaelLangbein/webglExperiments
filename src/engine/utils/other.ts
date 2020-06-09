

export function downloadJson(data: object, fileName: string) {
    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: 'text/json;charset=utf-8;' });
    return downloadBlob(blob, fileName);
}

export function downloadBlob(blob: Blob, fileName: string) {

    // window.open(url) doesn't work here. Instead, we create a temporary link item and simulate a click on it. 
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}


// export function parseFile(file: File): Observable<string> {

//     return new Observable((subscriber) => {

//         if (!(file instanceof Blob)) {
//             subscriber.error(new Error('`blob` must be an instance of File or Blob.'));
//             return;
//         }

//         const reader: FileReader = new FileReader();

//         reader.onerror = err => subscriber.error(err);
//         reader.onabort = err => subscriber.error(err);
//         reader.onload = () => subscriber.next(reader.result as string);
//         reader.onloadend = () => subscriber.complete();

//         return reader.readAsText(file);
//     });
// }

