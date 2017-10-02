"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var ProgressBrowserXhr_1 = require("./ProgressBrowserXhr");
var ProgressBrowserXhrFactory = /** @class */ (function () {
    function ProgressBrowserXhrFactory(browserXhr) {
        this.browserXhr = browserXhr;
    }
    ProgressBrowserXhrFactory.prototype.create = function (upload, download) {
        return new ProgressBrowserXhr_1.ProgressBrowserXhr(this.browserXhr, upload, download);
    };
    ProgressBrowserXhrFactory.decorators = [
        { type: core_1.Injectable },
    ];
    /** @nocollapse */
    ProgressBrowserXhrFactory.ctorParameters = function () { return [
        { type: http_1.BrowserXhr, },
    ]; };
    return ProgressBrowserXhrFactory;
}());
exports.ProgressBrowserXhrFactory = ProgressBrowserXhrFactory;
