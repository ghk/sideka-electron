"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var ProgressBrowserXhrFactory_1 = require("./ProgressBrowserXhrFactory");
var XHRBackendFactory_1 = require("./XHRBackendFactory");
var progress_http_service_1 = require("./progress-http.service");
var http_factory_token_1 = require("./http-factory.token");
var AngularHttpFactory_1 = require("./AngularHttpFactory");
function progressHttpFactory(xhrBackendFactory, backend, requestOptions, httpFactory) {
    return new progress_http_service_1.ProgressHttp(xhrBackendFactory, requestOptions, httpFactory, backend);
}
exports.progressHttpFactory = progressHttpFactory;
var ProgressHttpModule = (function () {
    function ProgressHttpModule() {
    }
    ProgressHttpModule = __decorate([
        core_1.NgModule({
            providers: [
                ProgressBrowserXhrFactory_1.ProgressBrowserXhrFactory,
                XHRBackendFactory_1.XHRBackendFactory,
                AngularHttpFactory_1.AngularHttpFactory,
                { provide: http_factory_token_1.HTTP_FACTORY, useClass: AngularHttpFactory_1.AngularHttpFactory },
                {
                    provide: progress_http_service_1.ProgressHttp,
                    useFactory: progressHttpFactory,
                    deps: [XHRBackendFactory_1.XHRBackendFactory, http_1.XHRBackend, http_1.RequestOptions, http_factory_token_1.HTTP_FACTORY]
                },
            ]
        })
    ], ProgressHttpModule);
    return ProgressHttpModule;
}());
exports.ProgressHttpModule = ProgressHttpModule;
//# sourceMappingURL=progress-http.module.js.map