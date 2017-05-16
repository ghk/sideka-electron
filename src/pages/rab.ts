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
import { Component, ApplicationRef, NgZone, HostListener} from "@angular/core";
import {ActivatedRoute} from "@angular/router";

const path = require("path");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');

const akun = [{nama_akun:'pendapatan',akun:'4.'},{nama_akun:'belanja',akun:'5.'},{nama_akun:'pembiayaan',akun:'6.'}];
const categories = [
    {
        name:'pendapatan',
        code:'4.',
        fields:[
            ['Akun','','Nama_Akun'],['Kelompok','','Nama_Kelompok'],['Jenis','','Nama_Jenis'],['Obyek','','Nama_Obyek'],
            ['','No_Urut','Uraian','JmlSatuan','Satuan','HrgSatuan','SumberDana','Anggaran','RABRinci_AnggaranPAK']
        ],
        currents:[{fieldName:'Akun',value:''},{fieldName:'Kelompok',value:''},{fieldName:'Jenis',value:''},{fieldName:'Obyek',value:''}]
    },{
        name:"belanja",
        code:'5.',
        fields:[
            ['Akun','','Nama_Akun'],['Kd_Bid','','Nama_Bidang'],['Kd_Keg','','Nama_Kegiatan'],['Jenis','','Nama_Jenis'],['Obyek','','Nama_Obyek'],
            ['','No_Urut','Uraian','JmlSatuan','Satuan','HrgSatuan','SumberDana','Anggaran','RABRinci_AnggaranPAK']
        ],
        currents:[{fieldName:'Akun',value:''},{fieldName:'Kd_Bid',value:''},{fieldName:'Kd_Keg',value:''},{fieldName:'Jenis',value:''},{fieldName:'Obyek',value:''}]
    },{
        name:'pembiayaan',
        code:'6.',
        fields:[
            ['Akun','','Nama_Akun'],['Kelompok','','Nama_Kelompok'],['Jenis','','Nama_Jenis'],['Obyek','','Nama_Obyek'],
            ['','No_Urut','Uraian','JmlSatuan','Satuan','HrgSatuan','SumberDana','Anggaran','RABRinci_AnggaranPAK']
        ],
        currents:[{fieldName:'Akun',value:''},{fieldName:'Kelompok',value:''},{fieldName:'Jenis',value:''},{fieldName:'Obyek',value:''}]
    }];

var app = remote.app;
var hot;

var sheetContainer;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");

window['jQuery'] = $;
@Component({
    selector: 'apbdes',
    templateUrl: 'templates/rab.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})
export default class RabComponent{
    hot: any;
    siskeudes:any;   
    activeType: any; 
    sub:any;
    year:string;
    tableSearcher: any;
    regionCode:string;
    categorySelected:string;
    rapSelected:string;
    rabSelected:string;
    refDatasets:any={};
    contentSelection:any={};
    
    constructor(private appRef: ApplicationRef, private zone: NgZone, private route:ActivatedRoute){ 
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;
        this.siskeudes =new Siskeudes(settings.data["siskeudes.path"]); 
        this.sub = this.route.queryParams.subscribe(params=>{
            this.year = params['year'];  
            this.regionCode = params['kd_desa'];
            this.getReferences();
        })
    }    
    
    onResize(event) {
        setTimeout(function() {            
            hot.render()
        }, 200);
    }

    createHot(sheetContainer){ 
        let me = this; 
        let config =    {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.rab),        
            columns: schemas.rab,

            colWidths: schemas.getColWidths(schemas.rab),
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
            dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
            beforeRemoveRow: function (row, amount) {
                this.initialData.splice(row, 1);
            }
        }
        let result = new Handsontable(sheetContainer, config);
        return result;
    }

    ngOnInit(){  
        let ctrl = this;        
        this.siskeudes.getRAB(this.year,this.regionCode,data=>{
            let that = this;     
            let elementId = "sheet";
            let sheetContainer = document.getElementById(elementId); 
            let results = this.transformData(data);
            let rsult = [];
            ctrl.hot = hot = this.createHot(sheetContainer);                
            hot.loadData(results);
            setTimeout(function() {
                hot.render();
            }, 500);                
        }); 
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    } 



    transformData(data){
        let results =[];
        data.forEach(content=>{
            let category = categories.filter(c=>c.code == content.Akun)[0]
            category.fields.forEach((field,idx)=>{
                let res=[];
                let current = category.currents[idx];
                for(let i = 0; i < field.length;i++){
                    let data = (content[field[i]]) ? content[field[i]] : '';
                    res.push(data)
                }
                if(current){
                    if(current.value !== content[current.fieldName])results.push(res);                
                    current.value = content[current.fieldName];     
                }else{
                    results.push(res);
                }      
            })
        });
        return results;
    }

    openAddRowDialog(){
        let selected = this.hot.getSelected();       
        this.rapSelected = 'rap';
        let category = 'pendapatan';
        let sourceData = this.hot.getSourceData();   

        if(selected){
            let data = this.hot.getDataAtRow(selected[0]);
            let currentCategory = categories.filter(c=>c.code.slice(0,2) == data[0].slice(0,2))[0];        
        }
        this.zone.run(()=>{
            this.categorySelected = category;
            $("#modal-add").modal("show"); 
            $('input[name=category][value='+category+']').checked = true;                    
        });                
        this.categoryOnClick(category);        
    
    }

    addRow(){
        $("#form-add").serializeArray();
    }

    addOneRow(): void{
        this.addRow();
        $("#modal-add").modal("hide");
        $('#form-add')[0];
    }

    addOneRowAndAnother():void{        
        this.addRow();  
    }

    categoryOnClick(value):void{
        switch(value){
            case "pendapatan":
                
                this.contentSelection['contentJenis'] = [];
                this.contentSelection['contentObyek'] = [];
                this.zone.run(()=>{
                    this.rapSelected='rap';
                    Object.assign(this.refDatasets,this.refDatasets['pendapatan']);
                });
                break;
            
            case "belanja":
                this.rabSelected='rab';
                break;
            
            case "pembiayaan":
                
                this.contentSelection['contentJenis'] = [];
                this.contentSelection['contentObyek'] = [];
                this.zone.run(()=>{
                    this.rapSelected='rap';
                    Object.assign(this.refDatasets,this.refDatasets['pembiayaan']);
                    let value = this.refDatasets['Kelompok'].filter(c=>c[0]=='6.1.');
                    this.refDatasets['Kelompok'] = value
                });
                break;            
        }
        
    }    

    subCategoryOnClick(value){
        switch(value){
            case "rapRinci":
                let code = (this.categorySelected == 'pendapatan') ? '4' : '6';
                let sourceData = this.hot.getSourceData();
                let data = sourceData.filter(c=>c[0].slice(0,1) == '4' && c[0].split('.').length == 4);
                this.refDatasets["availableObyek"]=data;
                break;      
            case "rab":

                break;
            case "rabRinci":

                break;  

        }

    }

    selectedOnChange(selector, value){
        let data = [];
        let results = [];
        
        switch(this.categorySelected){
            case "pendapatan":      
            case "pembiayaan": 
                let type = (selector == 'Kelompok') ?  'Jenis' : 'Obyek';
                this.contentSelection['content'+type] = [];
                
                data = this.refDatasets[type];
                results = data.filter(c=>c[0].slice(0, value.length)==value);
                this.contentSelection['content'+type]=results;
                break;
            case "belanja":
                switch(selector){
                    case "bidang":
                        this.contentSelection['contentKegiatan'] = [];
                        data = this.refDatasets['Kegiatan'].filter(c=>c[0].slice(0, value.length)==value);
                        this.contentSelection['contentKegiatan']= data;
                        break;
                    case "kegiatan":
                        if(this.rabSelected != 'rabRinci')
                            break;
                        this.contentSelection['obyekAvailable'] = [];
                        let sourceData = this.hot.getSourceData();
                        let contentObyek = [];
                        let currentCode = '';

                        sourceData.forEach(content=>{
                            let lengthCode = content[0].split('.').length -1;                            
                            if(lengthCode == 4 && content[0].slice(0,this.regionCode.length)==this.regionCode){
                                currentCode = content[0];
                                return;
                            }
                            if(currentCode == value && lengthCode ==4)
                                contentObyek.push(content);
                        });
                        this.contentSelection['obyekAvailable'] = contentObyek;
                        break;

                    case "jenis":
                        this.contentSelection['contentObyek'] = [];
                        data = this.refDatasets['belanja']['Obyek'].filter(c=>c[0].slice(0, value.length)==value);
                        this.contentSelection['contentObyek']= data;
                        break;
                }
                break;
                
            
        }

    }

    refTransformData(data,fields,currents,results){
        let keys = Object.keys(results)
        currents.map(c=>c.value="");
        data.forEach(content=>{
            fields.forEach((field,idx)=>{
                let res=[];
                let current = currents[idx];
                for(let i = 0; i < field.length;i++){
                    let data = (content[field[i]]) ? content[field[i]] : '';
                    res.push(data)
                }                            
                if(current.value !== content[current.fieldName])results[keys[idx]].push(res);                
                current.value = content[current.fieldName]; 
            })
        });
        return results;
    }


    getReferences(){
        categories.forEach(content=>{
            this.siskeudes.getRefRekByCode(content.code, data=>{
                let returnObject = (content.name != 'belanja') ? {Kelompok:[],Jenis:[],Obyek:[]}:{Jenis:[],Obyek:[]};
                let endSlice = (content.name != 'belanja') ? 4 : 5;
                let startSlice = (content.name != 'belanja') ? 1 : 3;
                let fields = content.fields.slice(startSlice,endSlice);
                let currents = content.currents.slice(startSlice,endSlice);
                let results = this.refTransformData(data, fields, currents, returnObject); 

                this.zone.run(()=>{
                    this.refDatasets[content.name] = results
                }); 

            })
        });

        this.siskeudes.getRefBidangAndKegiatan(this.regionCode,data=>{
            let returnObject = {Bidang:[],Kegiatan:[]};
            let fields = categories[1].fields.slice(1,3);
            let currents = categories[1].currents.slice(1,3);
            let results = this.refTransformData(data, fields, currents, returnObject);                    
            this.zone.run(()=>{
                Object.assign(this.refDatasets,results); 
            });                    
        });     

        this.siskeudes.getRefSumberDana(data=>{
            this.zone.run(()=>{
                this.refDatasets["sumberDana"] = data;
            });
        })
        
    }

    
}