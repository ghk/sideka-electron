import { Http, RequestOptionsArgs, RequestOptions, Request, Response, ConnectionBackend } from "@angular/http";
import { Observable } from "rxjs/Observable";
import { HttpWithDownloadProgressListener, HttpWithUploadProgressListener, Progress } from "./interfaces";
import { XHRBackendFactory } from "./XHRBackendFactory";
import { HttpFactory } from "./interfaces";
export declare class ProgressHttp extends Http implements HttpWithUploadProgressListener, HttpWithDownloadProgressListener {
    private xhrBackendFactory;
    private requestOptions;
    private httpFactory;
    private _uploadCallback;
    private _downloadCallback;
    private http;
    constructor(xhrBackendFactory: XHRBackendFactory, requestOptions: RequestOptions, httpFactory: HttpFactory, backend: ConnectionBackend);
    request(url: string | Request, options?: RequestOptionsArgs): Observable<Response>;
    withDownloadProgressListener(listener: (progress: Progress) => void): HttpWithDownloadProgressListener;
    withUploadProgressListener(listener: (progress: Progress) => void): HttpWithUploadProgressListener;
    private _buildProgressHttpInstance();
    private _buildXHRBackend();
}
