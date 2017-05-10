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
let currents =[{

}]

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
    
    constructor(private appRef: ApplicationRef, private zone: NgZone, private route:ActivatedRoute){ 
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;
        this.siskeudes =new Siskeudes(settings.data["siskeudes.path"]); 
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
        this.sub = this.route.queryParams.subscribe(params=>{
            let year = params['year'];  
            this.regionCode = params['kd_desa'];
            this.siskeudes.getRAB(year,this.regionCode,data=>{
                let that = this;     
                let elementId = "sheet";
                let sheetContainer = document.getElementById(elementId); 
                let results = this.transformData(data);

                ctrl.hot = hot = this.createHot(sheetContainer);                
                hot.loadData(results);
                setTimeout(function() {
                    hot.render();
                }, 500);                
            });              
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
                    results.push(res)
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
        this.categoryOnChange(category);        
    
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

    categoryOnChange(value):void{
        
    } 
    selectedOnChange(selector, value){
        switch(selector){
            case "kelompok":{
                break;
            }
            case "jenis":{
                break;
            }
            case "Obyek":{
                break;
            }
        }

    }

}