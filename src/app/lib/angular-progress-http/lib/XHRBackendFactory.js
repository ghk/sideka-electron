"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var ProgressBrowserXhrFactory_1 = require("./ProgressBrowserXhrFactory");
var XHRBackendFactory = /** @class */ (function () {
    function XHRBackendFactory(responseOptions, xsrfStrategy, progressBrowserXhrFactory) {
        this.responseOptions = responseOptions;
        this.xsrfStrategy = xsrfStrategy;
        this.progressBrowserXhrFactory = progressBrowserXhrFactory;
    }
    XHRBackendFactory.prototype.create = function (upload, download) {
        var progressBrowserXhr = this.progressBrowserXhrFactory.create(upload, download);
        return new http_1.XHRBackend(progressBrowserXhr, this.responseOptions, this.xsrfStrategy);
    };
    XHRBackendFactory.decorators = [
        { type: core_1.Injectable },
    ];
    /** @nocollapse */
    XHRBackendFactory.ctorParameters = function () { return [
        { type: http_1.ResponseOptions, },
        { type: http_1.XSRFStrategy, },
        { type: ProgressBrowserXhrFactory_1.ProgressBrowserXhrFactory, },
    ]; };
    return XHRBackendFactory;
}());
exports.XHRBackendFactory = XHRBackendFactory;
