import { BrowserXhr } from "@angular/http";
export declare class ProgressBrowserXhr implements BrowserXhr {
    private browserXhr;
    private upload;
    private download;
    constructor(browserXhr: BrowserXhr, upload?: any, download?: any);
    build(): any;
    private createProgressListener(listener);
}
