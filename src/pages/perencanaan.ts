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

export default class PerencanaanComponent {
    siskeudes:any;   
    activeType: any; 
    types: any;   
    idVisi:string;
    tahunAnggaran:string;
    sub:any;
    rpjmYears:any;
    savingMessage: string;
    initialDatasets:any={};
    renstraDatasets:any;
    hots:any={};
    activeHot:any;
    tableSearcher: any;
    isFileMenuShown = false;
    contentSelect:any=[];
    contentSelectMisi:any=[];
    categorySelected:string;
    

    constructor(private appRef: ApplicationRef, private zone: NgZone, private route:ActivatedRoute){ 
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
        if(type=='renstra'){
            result.addHook("beforeRemoveRow", (index, amount) => {
                let rows = [];
                let data = result.getDataAtRow(index);
                let sourceData = result.getSourceData();
                let currentCode = data[0].replace(this.idVisi,'');
                
                for(let i=index;i<sourceData.length;i++){
                    let code = sourceData[i][0].replace(this.idVisi,'');                    
                    if(code.slice(0,currentCode.length)!= currentCode)
                        break;
                    rows.push({index:i,data:sourceData[i]})
                }
                console.log(rows);
            });            
        }
        return result;
    }
          
    selectTab(type){
        let that = this;
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
    openAddRowDialog(){    
        let type = this.activeType.match(/[a-z]+/g)[0];
        switch(type){
            case 'renstra':{
                let category = 'misi'
                let selected = this.activeHot.getSelected();                

                if(selected){
                    let data = this.activeHot.getDataAtRow(selected[0]);
                    let code = data[0].replace(this.idVisi,'');
                    let current = currents.filter(c=>c.lengthId==code.length+2)[0];
                    if(!current) current = currents.filter(c=>c.lengthId ==6)[0];
                    category = current.fieldName.split('_')[1].toLowerCase();
                }
                this.zone.run(()=>{
                    this.categorySelected = category;
                    $("#modal-add-"+type).modal("show"); 
                    $('input[name=category][value='+category+']').checked = true;                    
                });                
                this.renstraDatasets = this.activeHot.getSourceData();
                if(category!== 'misi')this.categoryOnChange(category);
                break;               
            }
        }           
    }

    addRow(){
        let type = this.activeType.match(/[a-z]+/g)[0];
        let lastRow;
        let position;
        let data = $("#form-add-"+type).serializeArray().map(i => i.value);
        let sourceData = this.activeHot.getSourceData();
        switch(type){
            case 'renstra':{
                let lastCode;
                if(data[0] !== 'misi'){
                    let code = data[1].replace(this.idVisi,'');                     
                    for(let i = 0;i < sourceData.length; i++){
                        let codeSource = sourceData[i][0].replace(this.idVisi,'');
                        if(codeSource.length == code.length+2 && codeSource.slice(0,code.length) == code)
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
            case 'rpjm':{

            }
        }

        if(position != 0){
            this.activeHot.alter("insert_row", position);
            this.activeHot.populateFromArray(position, 0, [data], position, 3, null, 'overwrite');
        }        
    }

    addOneRow(): void{
        let type = this.activeType.match(/[a-z]+/g)[0]
        this.addRow();
        $("#modal-add-"+type).modal("hide");
        $('#form-add-'+type)[0].reset();
       
    }

    addOneRowAndAnother():void{        
        this.addRow();
        this.contentSelectMisi=[];
        this.contentSelect=[];    
        this.categoryOnChange(this.categorySelected); 
    }

    categoryOnChange(value){
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

    selectedOnChange($event){
        let value =  $event.target.value.replace(this.idVisi,'');
        this.contentSelect=[];
        this.renstraDatasets.forEach(data=>{
            let code = data[0].replace(this.idVisi,'');
            if(code.length == 4 && code.slice(0,2)==value)
                this.contentSelect.push(data);
        })        
    }


        
}

