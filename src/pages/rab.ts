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
import BasePage from "./basePage";

import { Component, ApplicationRef, NgZone, HostListener} from "@angular/core";
import {ActivatedRoute} from "@angular/router";

const path = require("path");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');

const kodeAkun = [{nama_akun:'pendapatan',akun:'4.'},{nama_akun:'belanja',akun:'5.'},{nama_akun:'pembiayaan',akun:'6.'},{nama_akun:'apbdes',akun:''}];
const flatten = arr => arr.reduce((acc, val) => acc.concat(['',''],val));


var app = remote.app;
var hot;

var sheetContainer;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");

@Component({
    selector: 'apbdes',
    templateUrl: 'templates/rab.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})
class RabComponent extends BasePage{
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
    year:any;
    savingMessage: string;
    initialDatasets:any={};
    hots:any={};
    tableSearcher: any;
    rabArray:any=[];
    
    constructor(appRef, zone, route){ 
        super('rab');       
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;      
        let dataFile = path.join(DATA_DIR, "siskeudesPath.json"); 
        
        let data = JSON.parse(jetpack.read(dataFile));
        this.siskeudes = new Siskeudes(data.path); 
    }    
    onResize(event) {
        this.hot = hot = this.hots[this.activeType]
        setTimeout(function() {            
            hot.render()
        }, 200);
    }
    initSheet(type,sheetContainer){ 
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
                me.initialDatasets[type].splice(row, 1);
            }
        }
        let result = new Handsontable(sheetContainer, config);
        return result;
    }

    ngOnInit(){  
        let that = this;    
        this.zone.run(()=>{
            this.types = kodeAkun;
            this.activeType = 'pendapatan';
        });
        this.sub = this.route.queryParams.subscribe(params=>{
            let year = params['year'];  
            let promises = [];
            setTimeout(function() {
                that.siskeudes.getRAB(year,data=>{
                    kodeAkun.forEach(item=>{
                        if(item.nama_akun != 'apbdes'){
                            let content = data.filter(c=>c.Akun == item.akun);
                            let result = that.objectToArray(content,item.akun);
                            that.initialDatasets[item.nama_akun]= result;
                            that.rabArray.push(result);
                        }                       
                        promises.push(that.promiseHot(item.nama_akun));
                    })
                    Promise.all(promises).then(data=>{
                        setTimeout(function() {                            
                            data.forEach(content=>{
                                let key = Object.keys(content)[0]
                                that.hots[key] = content[key];
                            })
                        }, 0);
                    })                
                })                
            }, 200);            
        }); 
    }
    ngOnDestroy() {
        this.sub.unsubscribe();
    }
    selectTab(type){
        this.activeType = type;
        this.hot = hot = this.hots[type];  
        setTimeout(function() {
            hot.render;
        }, 200);
    }

    promiseHot(type){
        return new Promise((resolve,rejected)=>{
            let hot;            
            let elementId = "sheet-" + type;
            let sheetContainer = document.getElementById(elementId); 
            let data;
            
            hot = this.initSheet(type,sheetContainer);
            
            (type=='apbdes') ? data = flatten(this.rabArray):data = this.initialDatasets[type];
           
            hot.loadData(data)

            setTimeout(function() {
                hot.render();
                resolve({[type]:hot})
            }, 50);
           
        })
    }
    

    objectToArray(data,akun){
        let results =[];
        let fieldBdgAndKeg = [ {fieldName:'Nama_Bidang',fieldCode:'Kd_Bid'},{fieldName:'Nama_Kegiatan',fieldCode:'Kd_Keg'}]
        let fieldObyek = [ {fieldName:'Nama_Kelompok',fieldCode:'Kelompok'},{fieldName:'Nama_Jenis',fieldCode:'Jenis'},{fieldName:'Nama_Obyek',fieldCode:'Obyek'}];

        let currentKdBid,currentKdKeg,currentKdKel,currentKdJenis,currentKdObyek;
        let totalAnggaran = data.map(c=>c.Anggaran).reduce((a,b)=>a+b,0);
        results.push([data[0].Akun,data[0].Nama_Akun,'','',totalAnggaran]);

        if(akun !== '5.'){              
            data.forEach(content => {
                let temp = [];
                
                fieldObyek.forEach(item=>{
                    let res = [];
                    res.push(content[item.fieldCode],content[item.fieldName],'','','')
                    temp.push(res)
                });
                
                (currentKdJenis == content.Jenis) ?  '' : temp.map(c=>results.push(c));
                currentKdJenis = content.Jenis;
                
                results.push(['',content.No_Urut +'. '+content.Uraian,content.JmlSatuan+' '+content.Satuan,content.Anggaran,content.Anggaran])
            });
            return results;
        }

        data.forEach(content => {
            let tempBid = [];
            let tempJenis = [];

            fieldBdgAndKeg.forEach(item=>{
                let res = [];      
                res.push(content[item.fieldCode],content[item.fieldName],'','','');
                tempBid.push(res);
            });
            (currentKdBid == content.Kd_Bid) ?  ((currentKdKeg == content.Kd_Keg) ?  '' : results.push(tempBid[1])) : tempBid.map(c=> results.push(c));
            
            fieldObyek.slice(1,fieldObyek.length).forEach(item=>{
                let res = [];
                res.push(content[item.fieldCode],content[item.fieldName],'','','') 
                tempJenis.push(res)
            });            
            (currentKdJenis == content.Jenis) ?  ((currentKdObyek == content.Obyek) ?  '' : results.push(tempJenis[1])) : tempJenis.map(c=> results.push(c));

            results.push(['',content.No_Urut +'. '+content.Uraian,content.JmlSatuan+' '+content.Satuan,content.Anggaran,content.Anggaran])
            currentKdJenis = content.Jenis;currentKdBid = content.Kd_Bid;currentKdKeg = content.Kd_Keg;currentKdObyek = content.Obyek;         
        })
        return results;               
    }
}

RabComponent['parameters'] = [ApplicationRef, NgZone,ActivatedRoute];
export default RabComponent;
