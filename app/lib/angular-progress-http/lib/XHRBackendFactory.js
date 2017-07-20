"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var ProgressBrowserXhrFactory_1 = require("./ProgressBrowserXhrFactory");
var XHRBackendFactory = (function () {
    function XHRBackendFactory(responseOptions, xsrfStrategy, progressBrowserXhrFactory) {
        this.responseOptions = responseOptions;
        this.xsrfStrategy = xsrfStrategy;
        this.progressBrowserXhrFactory = progressBrowserXhrFactory;
    }
    XHRBackendFactory.prototype.create = function (upload, download) {
        var progressBrowserXhr = this.progressBrowserXhrFactory.create(upload, download);
        return new http_1.XHRBackend(progressBrowserXhr, this.responseOptions, this.xsrfStrategy);
    };
    XHRBackendFactory = __decorate([
        core_1.Injectable(),
        __metadata("design:paramtypes", [http_1.ResponseOptions,
            http_1.XSRFStrategy,
            ProgressBrowserXhrFactory_1.ProgressBrowserXhrFactory])
    ], XHRBackendFactory);
    return XHRBackendFactory;
}());
exports.XHRBackendFactory = XHRBackendFactory;
//# sourceMappingURL=XHRBackendFactory.js.map