var $ = require('jquery');
import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import { Siskeudes } from '../stores/siskeudes';
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import diffProps from '../helpers/diff';
import titleBar from '../helpers/titleBar';

import { Component, ApplicationRef, NgZone, HostListener} from "@angular/core";
import {ActivatedRoute} from "@angular/router";

const path = require("path");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');

var app = remote.app;


const renstraFields = [{id:'ID_Visi',desc:'Uraian_Visi',lengthId:0},{id:'ID_Misi',desc:'Uraian_Misi',lengthId:2},{id:'ID_Tujuan',desc:'Uraian_Tujuan',lengthId:4},{id:'ID_Sasaran',desc:'Uraian_Sasaran',lengthId:6}];
const currents = [{fieldName:'ID_Visi',value:'',lengthId:0},{fieldName:'ID_Misi',value:'',lengthId:2},{fieldName:'ID_Tujuan',value:'',lengthId:4},{fieldName:'ID_Sasaran',value:'',lengthId:6}];
//const renstaCategory = ['visi','misi','tujuan', 'sasaran'];
const initCategory = 'misi';


var sheetContainer;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");

window['jQuery'] = $;
window['app'] = app;
window['hots'] = {};
require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

class PerencanaanComponent {
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
    activeHot:any;
    tableSearcher: any;
    isFileMenuShown = false;
    isActiveSelection = false;

    constructor(appRef, zone, route){ 
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;      
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]); 
        this.types =  ['renstra','rpjm','rkp1','rkp2','rkp3','rkp4','rkp5','rkp6'];
        this.activeType ='renstra';
        this.sub = this.route.queryParams.subscribe(params=>{
            this.idVisi = params['id_visi'];  
            this.tahunAnggaran = params['first_year'] +'-'+ params['last_year'];
        });
    }

    ngOnInit(){  
        let that = this;
        this.types.forEach(type => {
            let sheetContainer = document.getElementById('sheet-'+type);
            this.hots[type] = this.createHot(sheetContainer, type);
            window['hots'][type] = this.hots[type];

        });
        this.types.forEach(type=>{
            that.getContent(type,data=>{
                let hot = this.hots[type];
                this.initialDatasets[type] = data;
                hot.loadData(data);
                if(type==='renstra'){
                    this.activeHot = hot;
                    setTimeout(function() {
                        that.activeHot.render();
                    }, 500);
                }
            })
        })
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    onResize(event) {
        let that = this;
        that.activeHot= this.hots[this.activeType]
        setTimeout(function() {            
            that.activeHot.render()
        }, 200);
    }
    
    createHot(sheetContainer,type){
        type = type.match(/[a-z]+/g)[0];

        let result = new Handsontable(sheetContainer, {
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
            
        });

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
        result.addHook("beforeRemoveRow", (index, amount) => {
            console.log(result.getDataAtRow(index));
        });
        result.addHook("afterSelection", (row, col, rowEnd, colEnd) => {
            this.isActiveSelection = true;
        });
        return result;
    }
          
    selectTab(type){
        let that = this;
        this.isActiveSelection=false;
        this.clearFilters();
        this.activeType = type;
        this.activeHot = this.hots[type];   

        setTimeout(function() {
            that.activeHot.render();
        }, 500);
    }

    getContent(type,callback){
        let results;
        switch(type){
            case "renstra":{ 
                this.siskeudes.getRenstraRPJM(this.idVisi,data=>{
                    results =  this.transformData(data);  
                    callback(results);
                });
                break;
            }
            case "rpjm":{
                this.siskeudes.getRPJM(this.idVisi,data=>{
                    results =  data.map(o => schemas.objToArray(o, schemas[type]));
                    callback(results);
                });
                break;
            }
            default:{
                let indexType = type.match(/\d+/g);
                this.siskeudes.getRKPByYear(this.idVisi,indexType,data=>{                   
                    results =  data.map(o => schemas.objToArray(o, schemas['rkp']));
                    callback(results);
                });
                break;
            }
        };

    }

    transformData(source){
        let results =[];

        source.forEach(content => {
            renstraFields.forEach(item=>{  
                let res= []; 
                let code = content[item.id].replace(this.idVisi,'');
                let current = currents.filter(c=>c.lengthId == code.length)[0];
                let category = item.id.split('_')[1];
                res.push(content[item.id],category,content[item.desc])
                if(current.value != content[current.fieldName])results.push(res);
                current.value = content[current.fieldName];               
            })
            
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
    };

    showFileMenu(isFileMenuShown){
        this.isFileMenuShown = isFileMenuShown;
        (isFileMenuShown) ? titleBar.normal() : titleBar.blue();
    }
    
    clearFilters(){    
        let filter = this.activeHot.getPlugin('Filters');    
        filter.clearFormulas();
        filter.filter();
        filter.conditionComponent._states = {};
    }

    addRow(){
        let type = this.activeType;        
        if(!this.isActiveSelection)
            return;
        let lastRow;
        let position;
        let data;
        let indexRow = this.activeHot.getSelected()[0];
        let dataRow = this.activeHot.getDataAtRow(indexRow);
        let sourceData = this.activeHot.getSourceData();
        switch(type){
            case 'renstra':{
                let currentCode = dataRow[0].replace(this.idVisi,'');
                let nextRow = currents.filter(c=>c.lengthId==currentCode.length+2)[0];
                if(!nextRow) nextRow = currents.filter(c=>c.lengthId ==6)[0];                

                for(let i=indexRow;i<sourceData.length;i++){
                let code = sourceData[i][0].replace(this.idVisi,'');           
                if(code.length == nextRow.lengthId && code.slice(0,currentCode.length)== currentCode)
                    lastRow=sourceData[i];           
                if(code.slice(0,currentCode.length)== currentCode)
                        position= i+1;
                }

                if(!lastRow)lastRow =[dataRow[0]+'00',nextRow.fieldName.split('_')[1]]
                let newDigits = ("0" +(parseInt(lastRow[0].slice(-2))+1)).slice(-2);
                let newCode = lastRow[0].slice(0,-2) + newDigits;
                data = [newCode,lastRow[1],''];
            }
            case 'rpjm':{

            }
        }

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [data], position, 3, null, 'overwrite');

        
    }


        
}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone, ActivatedRoute];
export default PerencanaanComponent;
