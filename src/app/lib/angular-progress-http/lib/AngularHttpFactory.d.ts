import { Http, RequestOptions, ConnectionBackend } from "@angular/http";
import { HttpFactory } from "./interfaces";
export declare class AngularHttpFactory implements HttpFactory {
    create(backend: ConnectionBackend, requestOptions: RequestOptions): Http;
}
