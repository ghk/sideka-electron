import {BrowserXhr} from "@angular/http";

import { Progress } from "./interfaces";

export class ProgressBrowserXhr implements BrowserXhr {
    public constructor(
        private browserXhr: BrowserXhr,
        private upload:any = null,
        private download:any = null) {
    }

    public build():any {
        const xhr = this.browserXhr.build();

        if(this.upload) {
            xhr.upload.addEventListener("progress", this.createProgressListener(this.upload));
        }

        if(this.download) {
            xhr.addEventListener("progress", this.createProgressListener(this.download));
        }

        return xhr;
    }

    private createProgressListener(listener: (progress:Progress) => void): (event:ProgressEvent) => void {
        return (event: ProgressEvent) => {
            var decompressedContentLength = parseInt((<any>event.target).getResponseHeader('x-decompressed-content-length'));
            const progress: Progress = {
                event,
                lengthComputable: decompressedContentLength ? event.lengthComputable : true,
                loaded: event.loaded
            };
            if(decompressedContentLength){
                progress.total = decompressedContentLength;
                progress.percentage = Math.round((event.loaded * 100 / progress.total));
            } else if (event.lengthComputable) {
                progress.total = event.total;
                progress.percentage = Math.round((event.loaded * 100 / event.total));
            } 

            listener(progress);
        }
    }
}