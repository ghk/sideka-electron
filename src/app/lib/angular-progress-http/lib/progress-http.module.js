"use strict";
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
var ProgressHttpModule = /** @class */ (function () {
    function ProgressHttpModule() {
    }
    ProgressHttpModule.decorators = [
        { type: core_1.NgModule, args: [{
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
                },] },
    ];
    /** @nocollapse */
    ProgressHttpModule.ctorParameters = function () { return []; };
    return ProgressHttpModule;
}());
exports.ProgressHttpModule = ProgressHttpModule;
