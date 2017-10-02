import { BrowserXhr } from "@angular/http";
import { ProgressBrowserXhr } from "./ProgressBrowserXhr";
import { Progress } from "./interfaces";
export declare class ProgressBrowserXhrFactory {
    private browserXhr;
    constructor(browserXhr: BrowserXhr);
    create(upload: (progress: Progress) => void, download: (progress: Progress) => void): ProgressBrowserXhr;
}
