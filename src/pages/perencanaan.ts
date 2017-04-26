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

const renstraFields = [{id:'ID_Misi',desc:'Uraian_Misi'},{id:'ID_Tujuan',desc:'Uraian_Tujuan'},{id:'ID_Sasaran',desc:'Uraian_Sasaran'}];
//const renstaCategory = ['visi','misi','tujuan', 'sasaran'];
const initCategory = 'misi';


var sheetContainer;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");

window['jQuery'] = $;
window['app'] = app;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

class PerencanaanComponent {
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
        titleBar.blue("RPJM - " +dataApi.getActiveAuth()['desa_name'])
        this.types = ['renstra','rpjm','rkp 1','rkp 2','rkp 3','rkp 4','rkp 5','rkp 6'];
        this.activeType = 'renstra';

        let that = this;
        this.sub = this.route.queryParams.subscribe(params=>{
            this.idVisi = params['id_visi'];  
            this.tahunAnggaran = params['first_year'] +'-'+ params['last_year'];
        });

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
                        let elementId = "sheet-" + type;
                        let sheetContainer = document.getElementById(elementId);
                        let propertyName = type;
                        if(parseInt(type.match(/\d+/g)))
                            type = 'rkp';
                        that.hot = hot = that.initSheet(type,propertyName,sheetContainer);
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
        this.hot = hot = this.hots[propertyName];        
        
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
        let fields = renstraFields;
        let current = {};
        let init = data[0];
        results.push([init.ID_Visi,'Visi',init.Uraian_Visi]);
        fields.map(c=>{current[c.id] =''});

        data.forEach(content => {
            fields.forEach(field=>{ 
                if(current[field.id]!==content[field.id])               
                    results.push([
                        content[field.id],
                        field.id.split('_')[1],
                        content[field.desc]
                    ]); 
                current[field.id]=content[field.id];
            });
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
        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }

    openAddRowDialog(){
        let type = this.activeType;
        let hot;
        if(parseInt(type.match(/\d+/g)))type = 'rkp'; 

        switch(type){
            case 'renstra':{
                $("#modal-add-"+type).modal("show"); 
                this.zone.run(()=>{
                    hot = this.hots[type];
                    this.renstraDatasets = hot.getSourceData();
                });
                break;
               
            }
        }         
                    
    }

    addRow(){
        let type = this.activeType;
        let propertyName = type;
        let position=0;
        if(parseInt(type.match(/\d+/g))){
                        propertyName = type.replace(' ','');
            type = 'rkp';                    
        }
        let data = $("#form-add-"+type).serializeArray().map(i => i.value); 
        this.hot = hot = this.hots[propertyName];
        let sourceData = hot.getSourceData();
        switch(type){
            case 'renstra':{
                let lastCode;
                if(data[0] !== 'misi'){
                    let code = data[1].replace(this.idVisi,'');                     for(let i = 0;i < sourceData.length; i++){
                        let codeSource = sourceData[i][0].replace(this.idVisi,'');
                        if(codeSource.length == codeSource.length+2 && codeSource.slice(0,code.length) == code)
                            lastCode = sourceData[i][0];
                        if(codeSource.slice(0,code.length) == code)
                            position = i+1;                            
                    };
                    if(!lastCode)lastCode = data[1]+'00';
                }else{
                    let data = sourceData.filter(c=>{
                        let code = c[0].replace(this.idVisi,'');
                        if(code.length == 2)return c;
                    });
                    lastCode = data[data.length-1][0];
                    position = sourceData.length;
                }
                let newDigits = ("0" +(parseInt(lastCode.slice(-2))+1)).slice(-2);
                let newCode = lastCode.slice(0,-2) + newDigits; 
                let capitalize = data[0].charAt(0).toUpperCase() + data[0].slice(1);               
                data=[newCode,capitalize,data[2]];
                break;
            }

        }
        if(position != 0){
            hot.alter("insert_row", position);
            hot.populateFromArray(position, 0, [data], position, 3, null, 'overwrite');
            $('#form-add-'+type)[0].reset();
        }
        
    }

    addOneRow(): void{
        let type = this.activeType;
        if(parseInt(type.match(/\d+/g)))type = 'rkp'; 
        this.addRow();
        $("#modal-add-"+type).modal("hide");
    }

    addOneRowAndAnother():void{        
        this.addRow();
        this.contentSelectMisi=[];
        this.contentSelect=[];        
        this.selectedCategory='misi';
    }

    categoryOnChange($event){
        let value = $event.target.value;
        switch(value){
            case 'tujuan':{
                 this.contentSelect =  this.renstraDatasets.filter(c=>{
                    let code = c[0].replace(this.idVisi,'');
                    if(code.length == 2)return c;
                 });
                 this.contentSelectMisi=[];
                 break;
            }
            case 'sasaran':{
                this.contentSelect = [];
                this.contentSelectMisi = this.renstraDatasets.filter(c=>{
                    let code = c[0].replace(this.idVisi,'');
                    if(code.length == 2)return c;
                 });
                break;
            }
            default:{
                this.contentSelect = [];
                this.contentSelectMisi =[];

            }
        }
    }   

    misiSelectedOnChange($event){
        let value =  $event.target.value.replace(this.idVisi,'');
        this.contentSelect=[];
        this.renstraDatasets.forEach(data=>{
            let code = data[0].replace(this.idVisi,'');
            if(code.length == 4 && code.slice(0,2)==value)
                this.contentSelect.push(data);
        })        
    }


}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone, ActivatedRoute];
export default PerencanaanComponent;
