var $ = require('jquery');
import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import { Siskeudes } from '../stores/siskeudes';
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import * as nestedHeaders from '../schemas/nestedHeaders'
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import diffProps from '../helpers/diff';
import BasePage from "./basePage";
import titleBar from '../helpers/titleBar';

import { Component, ApplicationRef, NgZone, HostListener} from "@angular/core";
import {ActivatedRoute} from "@angular/router";

const path = require("path");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');

var app = remote.app;
var hot;


var sheetContainer;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");

window['jQuery'] = $;
window['app'] = app;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'perencanaan',
    //templateUrl: 'templates/perencanaan.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

class SppComponent extends BasePage{
    hot: any;
    appRef: any;
    zone: any;
    siskeudes:any;   
    activeType: any; 
    types: any;   
    idVisi:string;
    tahunAnggaran:string;
    route:any;
    sub:any;
    rpjmYears:any;
    savingMessage: string;
    initialDatasets:any={};
    hots:any={};
    tableSearcher: any;
    isFileMenuShown = false;
    renstraDatasets:any={};
    contentSelect:any=[];
    contentSelectMisi:any=[];
    selectedCategory:string;

    constructor(appRef, zone, route){ 
        super('perencanaan');       
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;      
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]); 
    }

    initSheet(type,propertyName,sheetContainer){ 
        let me = this; 
        let config =    {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas[type]),        
            columns: schemas[type],

            colWidths: schemas.getColWidths(schemas[type]),
            rowHeights: 23,

            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {
                columns:schemas[type].map((c,i)=>{return (c.hiddenColumn==true) ? i:''}).filter(c=>c!== ''),
                indicators: true
            },
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
            beforeRemoveRow: function (row, amount) {
                me.initialDatasets[propertyName].splice(row, 1);
            }
        }
        
        if(type !== 'renstra'){
            let nested = Object.assign([], nestedHeaders[type]);
            config["nestedHeaders"]=nested;
        }
        
        let result = new Handsontable(sheetContainer, config);

        result.addHook("afterChange", (changes, source) => {
            if(source === 'edit' || source === 'undo' || source === 'autofill'){
                let renderer = false;

                changes.forEach(item => {
                    let row = item[0];
                    let col = item[1];
                    let prevValue = item[2];
                    let value = item[3];

                    if(col === 2)
                        renderer = true;
                });
            }
        });
        
        return result;
    }

    onResize(event) {
        let type =  this.activeType.replace(' ','')
        this.hot = hot = this.hots[type]
        setTimeout(function() {            
            hot.render()
        }, 200);
    }

    ngOnInit(){  
        titleBar.blue("RKP - " +dataApi.getActiveAuth()['desa_name']);
        let that = this;
        this.sub = this.route.queryParams.subscribe(params=>{
            this.idVisi = params['id_visi'];  
            this.tahunAnggaran = params['first_year'] +'-'+ params['last_year'];
        });
        console.log('spp')

    }


}

SppComponent['parameters'] = [ApplicationRef, NgZone, ActivatedRoute];
export default SppComponent;
