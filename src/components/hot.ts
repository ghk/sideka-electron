import { Component, Input, Output, EventEmitter } from "@angular/core";
import schemas from '../schemas';
import dataApi from "../stores/dataApi";

var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

@Component({
    selector: 'hot',
    templateUrl: 'templates/hot.html'
})
export default class HotComponent {
    private _data;
    private _elements;
    private _options;
    private _bundleData;
    private _bundleSchemas;
    private _ids;

    @Input()
    set data(value) {
        this._data = value;
    }
    get data() {
        return this.data;
    }
    @Input()
    set elements(value) {
        this._elements = value;
    }
    get elements() {
        return this._elements;
    }
    @Input()
    set options(value) {
        this._options = value;
    }
    get options() {
        return this._options;
    }
    @Input()
    set bundleData(value) {
        this._bundleData = value;
    }
    get bundleData() {
        return this._bundleData;
    }
    @Input()
    set bundleSchemas(value) {
        this._bundleSchemas = value;
    }
    get bundleSchemas() {
        return this._bundleSchemas;
    }
    @Input()
    set ids(value) {
        this._ids = value;
    }
    get ids() {
        return this._ids;
    }

    hots: any = {};

    ngOnInit(): void {
        this.ids.forEach(id => {
            this.hots[id] = new Handsontable(this.elements[id], this.options[id]);
        });
    }
}
