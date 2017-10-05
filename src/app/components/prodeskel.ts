import { Component, Input, Output, EventEmitter } from '@angular/core';
import * as uuid from 'uuid';
import schemas from '../schemas';

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');

@Component({
   selector: 'prodeskel',
   templateUrl: '../templates/prodeskel.html',
})
export default class ProdeskelComponent {
    private _hot;
    private _data;
    private _elementClass;

    @Input()
    set elementClass(value) {
       this._elementClass = value;
    }
    get elementClass() {
       return this._elementClass;
    }

    constructor() {}

    ngOnInit(): void {
      this._data = [];

      let me = this;

      setTimeout(() => {
          let element = $('.' + me.elementClass)[0];

          me._hot = new Handsontable(element, {
              data: me._data,
              topOverlay: 34,
              rowHeaders: true,
              colHeaders: schemas.getHeader(schemas.prodeskel),
              columns: schemas.getColumns(schemas.prodeskel),
              colWidths: schemas.getColWidths(schemas.prodeskel),
              rowHeights: 23,
              columnSorting: true,
              sortIndicator: true,
              hiddenColumns: { columns: [0], indicators: true },
              renderAllRows: false,
              outsideClickDeselects: false,
              autoColumnSize: false,
              search: true,
              schemaFilters: true,
              contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
              dropdownMenu: ['filter_by_condition', 'filter_action_bar']
          });
      }, 2000);
    }
    
    updateHotData(data): void {
        //TODO -- CHECK CURRENT DATA TO MERGE

        this._data = data;
        this._hot.loadData(this._data);

        setTimeout(() => {
           this._hot.render();
        }, 200)
    }

    unlistenHot(): void {
        this._hot.unlisten();
    }
    
    listenHot(): void {
        this._hot.listen();
    }
}
