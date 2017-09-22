import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

import * as uuid from 'uuid';

import schemas from '../schemas';

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

@Component({
    selector: 'log-pembangunan',
    templateUrl: 'templates/logPembangunan.html',
}) 
export default class LogPembangunanComponent implements OnInit, OnDestroy{
    private _bundleData;
    private _bundleSchemas;
    
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

    @Output()
    onViewProperties:EventEmitter<any> = new EventEmitter<any>();

    hot: any;

    constructor() {}

    ngOnInit(): void {
        setTimeout(() => {
            let element = $('#pembangunan-sheet')[0];

            this.hot = new Handsontable(element, { 
                data: [],
                topOverlay: 34,
                rowHeaders: true,
                colHeaders: schemas.getHeader(schemas.logPembangunan),
                columns: schemas.getColumns(schemas.logPembangunan),
                colWidths: schemas.getColWidths(schemas.logPembangunan),
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
            
            this.hot.addHook('afterRender', (isForced) => {
                this.setEvents();
            });
        }, 200);
    }

    ngOnDestroy(): void {
        this.hot.destroy();
    }

    getDataByFeatureId(featureId): any {
        let data = this.hot.getSourceData();

        let feature = data.filter(e => e[2] === featureId)[0];

        if(!feature)
            return null;
        
        return feature;
    }

    pushData(data): void {
        if(!this.bundleData['log_pembangunan'])
            this.bundleData['log_pembangunan'] = [];
 
        this.bundleData['log_pembangunan'].push(data);
        
        this.hot.loadData(this.bundleData['log_pembangunan']);

        let me = this;

        setTimeout(() => {
            me.hot.render();
        });
    }
    
    updateData(newData): void {
        let hotData = this.hot.getSourceData();
        let oldData = hotData.filter(e => e[2] === newData[2])[0];

        if(!oldData)
            return;
        
        oldData = newData;
        
        this.hot.loadData(hotData);
        this.hot.render();
    }

    setEvents(): void {
        if(!this.bundleData['log_pembangunan'])
            return;
        
        for(let i=0; i<this.bundleData['log_pembangunan'].length; i++){
            $('#btn1-' + i + '-4').on('click', this.viewProperties.bind(this));
            $('#btn1-' + i + '-5').on('click', this.viewProperties.bind(this));
        }
    }

    viewProperties(e): void {
        let id = e.target.id;
        let segmentedId = id.split('-');
        let row = segmentedId[1];
        let column = segmentedId[2];
        let dataHot = this.hot.getDataAtRow(row);
        this.onViewProperties.emit({ column: column, data: dataHot });
    }
}
