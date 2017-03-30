import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import { Siskeudes } from '../stores/siskeudes';
import v2Dataapi from "../stores/v2Dataapi";
import schemas from '../schemas';
import * as nestedHeaders from '../schemas/nestedHeaders'
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import diffProps from '../helpers/diff';


import { Component, ApplicationRef, NgZone  } from "@angular/core";
import {ActivatedRoute} from "@angular/router";


const fileNameSiskeudes = 'C:\\microvac\\WORKSPACE\\SimKeu_DesaV1.2\\DataAPBDES2016(1).mde'

const path = require("path");
const $ = require("jquery");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');


var app = remote.app;
var hot;

var sheetContainer;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");

const initSheet = (type,sheetContainer) => {   

    let config =    {
        data: [],
        topOverlay: 34,
        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas[type]),        
        columns: schemas[type],
        colWidths: schemas.getColWidths(schemas[type]),
        rowHeights: 23,
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        contextMenu: ['row_above', 'remove_row']
    }
    if(type !== 'renstra'){
        let nested = Object.assign([], nestedHeaders[type]);
        nested.push(schemas.getHeader(schemas[type]));
        config["nestedHeaders"]=nested;
    }
    let result = new Handsontable(sheetContainer, config);
    return result;
}

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html'
})

class PerencanaanComponent extends diffProps{
    hot: any;
    appRef: any;
    zone: any;
    siskeudes:any;   
    activeType: any; 
    types: any;   
    idVisi:string;
    route:any;
    sub:any;
    rpjmYears:any;
    perencanaanData:any;
    savingMessage: string;

    constructor(appRef, zone, route){ 
        super();       
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;      
        let dataFile = path.join(DATA_DIR, "siskeudesPath.json"); 
        let data = JSON.parse(jetpack.read(dataFile));
        this.siskeudes = new Siskeudes(data.path); 
    }

    init(): void {
        window.addEventListener("resize", (e) => {
            if(hot)
                hot.render();
        });
        schemas.registerCulture(window);
    }

    ngOnInit(){  
        let ctrl = this;
        this.types = ['renstra','rpjm','1','2','3','4','5','6'];
        this.sub = this.route.queryParams.subscribe(params=>{
            this.idVisi = params['id_visi'];            
        }); 
        
        function keyup(e) {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
                ctrl.openSaveDiffDialog("perencanaan");
                e.preventDefault();
                e.stopPropagation();
            }
            //ctrl+p
            if (e.ctrlKey && e.keyCode == 80){
                e.preventDefault();
                e.stopPropagation();
            }
        }
        document.addEventListener('keyup', keyup, false);       
        
        let bundleSchemas = {};
        let bundleData = {};
        let me = this;

        this.types.forEach(type=>{
            let propertyName = type
            if(parseInt(type)){
                propertyName = 'rkp'+type;
                type = 'rkp';
            }
            bundleSchemas[propertyName] = schemas[type];   
            bundleData[propertyName] = [];  
        });
        /*
        v2Dataapi.getContent("perencanaan", null, bundleData, bundleSchemas, (content) => { 
            let data = JSON.parse(JSON.stringify(content));
        })*/

        this.loadData();
        setTimeout(function() {
            ctrl.loadType('renstra');
        }, 500);         
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
   
    saveContent(){
        let bundleSchemas = {};
        let bundleData = {};
        let that = this;
        let me = this;
        

        this.types.forEach(type=>{
            let propertyName = type
            if(parseInt(type)){
                propertyName = 'rkp'+type;
                type = 'rkp';
            }
            bundleSchemas[propertyName] = schemas[type];   
            bundleData[propertyName] = this.initialData[propertyName]        
        });
        
         /*
         v2Dataapi.saveContent(this, null, bundleData, bundleSchemas, (err, data) => {
            that.savingMessage = "Penyimpanan berhasil";
            console.log(data);
           // if(!err)
             //   that.initialData = data;

            //hot.loadData(data);
            //that.afterSave();

            //setTimeout(function(){
            //    that.savingMessage = null;
            //}, 2000);
        });*/

    }

    loadType(type):void {        
        this.activeType=type;
        let ctrl = this;
        let propertyName = type;
        let elementId = "sheet-" + type;
        let sheetContainer = document.getElementById(elementId);
        if(Number.isInteger(parseInt(type))){propertyName = 'rkp'+type; type='rkp';}

        this.initialData = Object.assign([], this.perencanaanData[propertyName])
        ctrl.hot = hot = initSheet(type,sheetContainer);
        
        hot.loadData(this.initialData);
        setTimeout(function() {
            hot.render();
        }, 500);  
    }  

    getDataSiskeudes(idVisi,type, callback){
        switch(type){
            case "renstra":{ 
                this.siskeudes.getRenstraRPJM(idVisi,data=>{
                    let results =  data.map(o => schemas.objToArray(o, schemas[type]));
                    callback(results);
                });
                break;
            }
            case "rpjm":{
                this.siskeudes.getRPJM(idVisi,data=>{
                    let results =  data.map(o => schemas.objToArray(o, schemas[type]));
                    callback(results);
                })
                break;
            }default:{
                this.siskeudes.getRKPByYear(idVisi,type,data=>{                   
                    let results =  data.map(o => schemas.objToArray(o, schemas['rkp']));
                    callback(results);
                });
                break;
            }
        }
    }

    loadData(){
        let results = {};
        this.types.forEach(type=>{
            this.getDataSiskeudes(this.idVisi, type, data=>{ 
                let propertyName = type;                                          
                if(parseInt(type)){
                    propertyName = 'rkp'+type
                }
                results[propertyName]=JSON.parse(JSON.stringify(data));
            })            
        });
        this.perencanaanData = results;
    }

}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone,ActivatedRoute];
export default PerencanaanComponent;
