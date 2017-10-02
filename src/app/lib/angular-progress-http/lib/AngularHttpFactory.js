"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var AngularHttpFactory = /** @class */ (function () {
    function AngularHttpFactory() {
    }
    AngularHttpFactory.prototype.create = function (backend, requestOptions) {
        return new http_1.Http(backend, requestOptions);
    };
    AngularHttpFactory.decorators = [
        { type: core_1.Injectable },
    ];
    /** @nocollapse */
    AngularHttpFactory.ctorParameters = function () { return []; };
    return AngularHttpFactory;
}());
exports.AngularHttpFactory = AngularHttpFactory;
