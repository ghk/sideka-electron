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

const jenisSPP={UM:"Panjar",LS:"Definitif",PBY:"Pembiayaan"}
const fields = [
    {
        category:'rincian',
        fieldName:['Kd_Rincian','Nama_SubRinci','','Sumberdana','Nilai']
    }
    ];
const currents = [{code:'',category:'rincian',fieldName:'Kd_Rincian',value:''}];

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
    templateUrl: 'templates/spp.html',
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
        super('spp');       
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;      
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]); 
    }

    initSheet(sheetContainer){ 
        let me = this; 
        let config =    {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.spp),        
            columns: schemas.spp,

            colWidths: schemas.getColWidths(schemas.spp),
            rowHeights: 23,

            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {
                columns:schemas.spp.map((c,i)=>{return (c.hiddenColumn==true) ? i:''}).filter(c=>c!== ''),
                indicators: true
            },
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
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
        setTimeout(function() {            
            hot.render()
        }, 200);
    }

    ngOnInit(){  
        titleBar.blue("SPP - " +dataApi.getActiveAuth()['desa_name']);
        let that = this;
        let noSPP;
        
        this.sub = this.route.queryParams.subscribe(params=>{
            noSPP = params['no_spp'];  
        });
        let sheetContainer = document.getElementById("sheet");
        this.hot = hot = this.initSheet(sheetContainer);
        
        
        hot.render();

        this.siskeudes.getDetailSPP(noSPP,data=>{
            console.log(data);
            let results = [];
            data.forEach(content=>{
                let res=[];                
                fields.forEach((item,idx)=>{
                    let current = currents.filter(c=>c.category==item.category)[0];
                    let code = this.getnewCode(current.code, idx)
                    res.push(code);     
                    for(let i=0;i< item.fieldName.length;i++){
                        let contentPush = (item.fieldName[i] == '') ? '':content[item.fieldName[i]];
                        res.push(contentPush)
                    }
                    res.push(current.category);
                    if(current.value != content[current.fieldName]){current.code = code; results.push(res)};
                    current.value = content[current.fieldName]; 
                })                
            });         
            hot.loadData(results);
            setTimeout(function() {
                hot.render();
            }, 200);
        });        
    }
    getnewCode(code, fieldNumber){
        code = (code == '') ? '1': (parseInt(code)+1).toString();
        let newCode;
        for(let i = 0; i < fieldNumber+1;i++){
            let code = (currents[i].code == '') ? '1': (parseInt(currents[i].code)+1).toString();
            newCode = ((fieldNumber - i) == 0) ? code : code+'.';
        }
        return newCode;
    }
    
    filterContent($event){ 
       
    }
}

SppComponent['parameters'] = [ApplicationRef, NgZone, ActivatedRoute];
export default SppComponent;
