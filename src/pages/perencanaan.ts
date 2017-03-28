import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import { Siskeudes } from '../stores/siskeudes';
import schemas from '../schemas';
import * as nestedHeaders from '../schemas/nestedHeaders'
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import diffProps from '../helpers/apbdesDiff';

import { Component, ApplicationRef, NgZone  } from "@angular/core";
import {ActivatedRoute} from "@angular/router";


const fileNameSiskeudes = 'C:\\microvac\\WORKSPACE\\SimKeu_DesaV1.2\\DataAPBDES2016(1).mde'

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
    activeSubType: any;    
    activeType: any; 
    subTypes: any;
    types: any;   
    idVisi:string;
    route:any;
    sub:any;
    rpjmYears:any;

    constructor(appRef, zone, route){ 
        super();       
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;       
    }

    init(): void {
        window.addEventListener("resize", (e) => {
            if(hot)
                hot.render();
        });

        $('.modal').each((i, modal) => {
            $(modal).on('hidden.bs.modal', () => {
                if(hot)
                    hot.listen();
            });
        });

        schemas.registerCulture(window);
    }

    ngOnInit(){  
        var that = this;
        let dataFile = path.join(DATA_DIR, "siskeudesPath.json"); 
        let data = JSON.parse(jetpack.read(dataFile));
        this.siskeudes = new Siskeudes(data.path);

        this.zone.run(()=>{
            this.sub = this.route.queryParams.subscribe(params=>{
                this.idVisi = params['id_visi'];
                this.getTypesAndSubtypes(params);
            });      
        });  

        setTimeout(function() {
            that.loadType('renstra', null);
        }, 500);      
        console.log(nestedHeaders)    
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
   
    getDataSiskeudes(idVisi,type,subType, callback){
        switch(type){
            case "renstra":{ 
                this.siskeudes.getRenstraRPJM(idVisi,callback);
                break;
            }
            case "rpjm":{
                this.siskeudes.getRPJM(idVisi,callback)
                break;
            }case "rkp":{
                let indexYear = this.subTypes.indexOf(subType);
                this.siskeudes.getRKPByYear(idVisi,++indexYear,callback);
                break;
            }
        }
    }


    loadType(type,subType):void {
        let ctrl = this;
        this.activeType=type;
        this.activeSubType=subType;

        let elementId = "sheet-" + type;
        if(subType)elementId +=("-"+subType);
        let sheetContainer = document.getElementById(elementId);
        

        if (sheetContainer !== null){
            ctrl.hot = hot = initSheet(type,sheetContainer);
            this.getDataSiskeudes(this.idVisi,type,subType,data=>{
                let results = data.map(o => schemas.objToArray(o, schemas[type]));
                hot.loadData(results);
                setTimeout(function(){
                    hot.render();
                },500);
            })
        }       
    }  

    getTypesAndSubtypes(params){
        let subTypes = [];
        for(var i = parseInt(params.first_year); i < parseInt(params.last_year);i++){
            subTypes.push(i.toString())
        };
        this.types = ['renstra','rpjm']
        this.subTypes = subTypes;
    }
    
}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone,ActivatedRoute];
export default PerencanaanComponent;
