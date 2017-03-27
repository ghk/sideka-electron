import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import { Siskeudes } from '../stores/siskeudes';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";

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

const initSheet = (type,subType) => {
    
    let elementId = 'sheet-' + type;
    if(subType)elementId +=('-'+subType);
    let sheetContainer = document.getElementById(elementId);
    console.log(sheetContainer);
    if(sheetContainer!= null){
        let result = new Handsontable(sheetContainer, {
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
        });
        console.log(result)
        return result;
    }
}

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html'
})

class PerencanaanComponent {
    hot: any;
    appRef: any;
    zone: any;
    siskeudes:any;
    visiRPJM:any;
    renstraRPJM:any;
    activeSubType: any;
    subTypes: any;
    activeType: any;    
    idVisi:string;
    types: any;
    route:any;
    sub:any;

    constructor(appRef, zone, route: ActivatedRoute){        
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
        this.sub = this.route.params.subscribe(params=>{
            this.idVisi = params['id_visi'];
            this.getTypeAndSubType()
        });      
        var dataFile = path.join(DATA_DIR, "siskeudesPath.json"); 
        var data = JSON.parse(jetpack.read(dataFile));
        this.siskeudes = new Siskeudes(data.path);          
        this.idVisi = '07.01.01.';
        this.loadType(this.idVisi,'renstra',null);
                          
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
            case "rpjmdes":{
                this.siskeudes.getRPJM(idVisi,callback)
                break;
            }case "rkp":{
                this.siskeudes.getRKPByYear(idVisi,subType,callback);
                break;
            }default:{
                return null;
            }
        }
    }

    loadType(idVisi,type,subType):void {
        let ctrl = this;
        this.activeType=type;
        this.activeSubType=subType;
        ctrl.hot = hot = initSheet(type,subType);
       

        this.getDataSiskeudes(idVisi,type,subType,data=>{
            console.log(data);
           // var results = data.map(o => schemas.objToArray(o, schemas[type]));
           // hot.loadData(results);

            setTimeout(function(){
                //hot.render();
            },500);
        })  
    }  

    getTypeAndSubType(){
    }
    
}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone,ActivatedRoute];
export default PerencanaanComponent;
