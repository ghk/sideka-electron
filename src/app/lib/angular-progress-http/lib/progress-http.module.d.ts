import { RequestOptions, XHRBackend } from "@angular/http";
import { XHRBackendFactory } from "./XHRBackendFactory";
import { ProgressHttp } from "./progress-http.service";
import { HttpFactory } from "./interfaces";
export declare function progressHttpFactory(xhrBackendFactory: XHRBackendFactory, backend: XHRBackend, requestOptions: RequestOptions, httpFactory: HttpFactory): ProgressHttp;
export declare class ProgressHttpModule {
}
