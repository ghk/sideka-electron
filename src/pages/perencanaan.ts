import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import { Siskeudes } from '../stores/siskeudes';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import { Component, ApplicationRef, NgZone } from "@angular/core";


const fileNameSiskeudes = 'C:\\microvac\\DATABASE\\siskeudes\\pancakarsa1_DataAPBDES2016.mde'

const path = require("path");
const $ = require("jquery");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');

window["jQuery"] = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app = remote.app;
var hot;
var sheetContainer;
var resultBefore=[];
var temp1;

var init = () => {
    sheetContainer = document.getElementById('sheet');
    window['hot'] = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.renstra),
        columns: schemas.renstra,

        colWidths: schemas.getColWidths(schemas.renstra),
        rowHeights: 23,

        columnSorting: true,
        sortIndicator: true,        
        hiddenColumns: {indicators: true},

        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,

        search: true,
        schemaFilters: true,        
        contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });

    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot, spanCount);

    window.addEventListener('resize', function(e){
        hot.render();
    })
};

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html'
})
class PerencanaanComponent {
    hot: any;
    appRef: any;
    zone: any;
    siskeudes:any;

    constructor(appRef, zone){
        this.appRef = appRef;   
        this.siskeudes = new Siskeudes(fileNameSiskeudes);     
    }

    ngOnInit(){
        init();
        this.hot = window['hot'];
        var ctrl = this;
        this.siskeudes.getRenstraRPJM((results)=>{
            temp1= results;
            hot.loadData(results);
            hot.render();
        })
    }
}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone];
export default PerencanaanComponent;
