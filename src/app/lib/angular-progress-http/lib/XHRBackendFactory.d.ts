import { XHRBackend, ResponseOptions, XSRFStrategy } from "@angular/http";
import { Progress } from "./interfaces";
import { ProgressBrowserXhrFactory } from "./ProgressBrowserXhrFactory";
export declare class XHRBackendFactory {
    private responseOptions;
    private xsrfStrategy;
    private progressBrowserXhrFactory;
    constructor(responseOptions: ResponseOptions, xsrfStrategy: XSRFStrategy, progressBrowserXhrFactory: ProgressBrowserXhrFactory);
    create(upload: (progress: Progress) => void, download: (progress: Progress) => void): XHRBackend;
}
