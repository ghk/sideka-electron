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


@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

class PerencanaanComponent extends BasePage{
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
            renderAllRows: false,
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
        return result;
    }

    onResize(event) {
        let type =  this.activeType.replace(' ','')
        let hot = this.hots[type]
        setTimeout(function() {            
            hot.render()
        }, 200);
    }

    ngOnInit(){  
        titleBar.blue("RPJM - " +dataApi.getActiveAuth()['desa_name'])

        let that = this;
        this.sub = this.route.queryParams.subscribe(params=>{
            this.idVisi = params['id_visi'];  
            this.tahunAnggaran = params['first_year'] +'-'+ params['last_year'];
        }); 
        this.types = ['renstra','rpjm','rkp 1','rkp 2','rkp 3','rkp 4','rkp 5','rkp 6'];
        this.activeType = 'renstra';

        function keyup(e) {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
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
        
        setTimeout(function() {   
            that.setInitialDatasets(data=>{
                that.initialDatasets = data;
                let bundleSchemas = {};
                let bundleData = {}; 

                let results= {};
                let promises = [];
                
                that.types.forEach(type=>{
                    let promise = new Promise((resolve,rejected)=>{            
                        type = type.replace(' ','');
                        let hot;
                        let elementId = "sheet-" + type;
                        let sheetContainer = document.getElementById(elementId);
                        let propertyName = type;
                        if(parseInt(type.match(/\d+/g)))
                            type = 'rkp';
                        hot = that.initSheet(type,propertyName,sheetContainer);
                        hot.loadData(that.initialDatasets[propertyName]);        
                        resolve({[propertyName] : hot});   
                        
                    });
                    promises.push(promise);

                    let propertyName = type;
                    if(parseInt(type.match(/\d+/g))){
                        propertyName = type.replace(' ','');
                        type = 'rkp';                    
                    }
                    bundleSchemas[propertyName] = schemas[type];   
                    bundleData[propertyName] = [];  
                });

                /*v2Dataapi.getContent('renstra', null, bundleData, bundleSchemas, (content) => { 
                    that.initialData = JSON.parse(JSON.stringify(content));                
                });*/

                Promise.all(promises).then((data)=>{                    
                    setTimeout(function() {                
                        data.forEach((content)=>{
                            let key = Object.keys(content)[0]
                            that.hots[key] = content[key];
                            results[key] = content[key];
                        });    
                        that.selectTab('renstra')   
                    }, 0);
                }); 
            });    
        }, 500);
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    getSheetId(type){        
        type="sheet-"+type.replace(' ','')
        return type;
    }
   
    selectTab(type){
        let propertyName = type.replace(' ','')
        this.activeType=type;
        let hot = this.hots[propertyName];        
        
        setTimeout(function() {
            hot.render();
        }, 500);
    }

    setInitialDatasets(callback){
        let promises = [];
        let that = this;
        
        this.types.forEach(type => {  
            type=type.replace(' ','');  
            let promise = new  Promise((resolve,rejected)=>{                            
                switch(type){
                    case "renstra":{ 
                        this.siskeudes.getRenstraRPJM(this.idVisi,data=>{
                            let results =  that.objectToArray(type,data);                            
                            resolve({[type]:results});

                        });
                        break;
                    }
                    case "rpjm":{
                        this.siskeudes.getRPJM(this.idVisi,data=>{
                            let results =  data.map(o => schemas.objToArray(o, schemas[type]));
                            resolve({[type]:results});
                        });
                        break;
                    }
                    default:{
                        let indexType = type.match(/\d+/g);
                        this.siskeudes.getRKPByYear(this.idVisi,indexType,data=>{                   
                            let results =  data.map(o => schemas.objToArray(o, schemas['rkp']));
                            resolve({[type]:results});
                        });
                        break;
                    }
                }
            });
           promises.push(promise);
        });

        Promise.all(promises).then((data)=>{
            setTimeout(function() {     
                let results = {};           
                data.forEach(content=>{
                    let key = Object.keys(content)[0]
                    results[key] = content[key];                    
                });       
                callback(results);
            }, 0);            
        })
    };

    objectToArray(type,data){
        let results =[];
        let current = schemas[type].filter(c=>c.hiddenColumn == true).map(c=>{c[c.field] = '';  return c});
        data.forEach(content => {
            let res  = [];
            current.forEach((item,i)=>{
                (item[item.field] == content[item.field]) ? res.push('',) : res.push(content[item.asset]); 
                res.push(content[item.field]);              
                item[item.field] = content[item.field];
            });
            results.push(res);
        });
        return results;
    }

    saveContent(){
        let bundleSchemas = {};
        let bundleData = {};
        let that = this;
        let me = this;
        let bundleName = 'perencanaan';

        this.types.forEach(type=>{
            let propertyName = type;
            let hot;
            if(parseInt(type.match(/\d+/g))){                
                propertyName = type.replace(' ','');
                type = 'rkp';
            }
            hot = that.hots[propertyName];
            bundleSchemas[propertyName] = schemas[type];   
            bundleData[propertyName] = hot.getSourceData();       
        });
    }   

    showFileMenu(isFileMenuShown){
        this.isFileMenuShown = isFileMenuShown;
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }
    
}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone, ActivatedRoute];
export default PerencanaanComponent;
