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
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var XHRBackendFactory_1 = require("./XHRBackendFactory");
var http_factory_token_1 = require("./http-factory.token");
var ProgressHttp = /** @class */ (function (_super) {
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
        var progressHttp = new ProgressHttp(this.xhrBackendFactory, this.requestOptions, this.httpFactory, this._buildXHRBackend());
        progressHttp._uploadCallback = this._uploadCallback;
        progressHttp._downloadCallback = this._downloadCallback;
        return progressHttp;
    };
    ProgressHttp.prototype._buildXHRBackend = function () {
        var backend = this.xhrBackendFactory.create(this._uploadCallback, this._downloadCallback);
        return backend;
    };
    ProgressHttp.decorators = [
        { type: core_1.Injectable },
    ];
    /** @nocollapse */
    ProgressHttp.ctorParameters = function () { return [
        { type: XHRBackendFactory_1.XHRBackendFactory, },
        { type: http_1.RequestOptions, },
        { type: undefined, decorators: [{ type: core_1.Inject, args: [http_factory_token_1.HTTP_FACTORY,] },] },
        { type: http_1.ConnectionBackend, },
    ]; };
    return ProgressHttp;
}(http_1.Http));
exports.ProgressHttp = ProgressHttp;
