"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var XHRBackendFactory_1 = require("./XHRBackendFactory");
var http_factory_token_1 = require("./http-factory.token");
var ProgressHttp = (function (_super) {
    __extends(ProgressHttp, _super);
    function ProgressHttp(xhrBackendFactory, requestOptions, httpFactory, backend) {
        var _this = _super.call(this, null, requestOptions) || this;
        _this.xhrBackendFactory = xhrBackendFactory;
        _this.requestOptions = requestOptions;
        _this.httpFactory = httpFactory;
        _this._uploadCallback = null;
        _this._downloadCallback = null;
        _this.http = httpFactory.create(backend, requestOptions);
        return _this;
    }
    ProgressHttp_1 = ProgressHttp;
    ProgressHttp.prototype.request = function (url, options) {
        return this.http.request(url, options);
    };
    ProgressHttp.prototype.withDownloadProgressListener = function (listener) {
        this._downloadCallback = listener;
        return this._buildProgressHttpInstance();
    };
    ProgressHttp.prototype.withUploadProgressListener = function (listener) {
        this._uploadCallback = listener;
        return this._buildProgressHttpInstance();
    };
    ProgressHttp.prototype._buildProgressHttpInstance = function () {
        var progressHttp = new ProgressHttp_1(this.xhrBackendFactory, this.requestOptions, this.httpFactory, this._buildXHRBackend());
        progressHttp._uploadCallback = this._uploadCallback;
        progressHttp._downloadCallback = this._downloadCallback;
        return progressHttp;
    };
    ProgressHttp.prototype._buildXHRBackend = function () {
        var backend = this.xhrBackendFactory.create(this._uploadCallback, this._downloadCallback);
        return backend;
    };
    ProgressHttp = ProgressHttp_1 = __decorate([
        core_1.Injectable(),
        __param(2, core_1.Inject(http_factory_token_1.HTTP_FACTORY)),
        __metadata("design:paramtypes", [XHRBackendFactory_1.XHRBackendFactory,
            http_1.RequestOptions, Object, http_1.ConnectionBackend])
    ], ProgressHttp);
    return ProgressHttp;
    var ProgressHttp_1;
}(http_1.Http));
exports.ProgressHttp = ProgressHttp;
//# sourceMappingURL=progress-http.service.js.map