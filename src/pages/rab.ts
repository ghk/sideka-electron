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

const kodeAkun = [{nama_akun:'pendapatan',akun:'4.'},{nama_akun:'belanja',akun:'5.'},{nama_akun:'pembiayaan',akun:'6.'}]

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
                        if(item.nama_akun !='belanja'){
                            let content = data.filter(c=>c.Akun == item.akun)
                            that.initialDatasets[item.nama_akun]=that.objectToArray(content,item.akun); 
                            promises.push(that.promiseHot(item.nama_akun));                          
                        }
                    })
                    Promise.all(promises).then(data=>{
                        setTimeout(function() {                            
                            data.forEach(content=>{
                                let key = Object.keys(content)[0]
                                that.hots[key] = content[key];
                            })
                            that.selectTab('pendapatan');
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
            
            if(type != 'belanja'){
                hot = this.initSheet(type,sheetContainer);
                hot.loadData(this.initialDatasets[type]);    
                setTimeout(function() {
                    hot.render();
                    resolve({[type]:hot})
                }, 50);
            }
        })
    }
    

    objectToArray(data,akun){
        let results =[];
        let keyName= ['Nama_Kelompok','Nama_Jenis','Nama_Obyek'];
        let keyNameBelanja = ['Nama_Bidang', 'Nama_Kegiatan'];

        
        let totalJenis,totalKelompok,currentKdKel,currentKdJenis;
        let totalAnggaran = data.map(c=>c.Anggaran).reduce((a,b)=>a+b,0);
        results.push([data[0].Akun,data[0].Nama_Akun,'','',totalAnggaran]);


        if(akun !== '5.'){              
            data.forEach(content => {
                let temp = [];
                
                keyName.forEach(item=>{
                    let res = [];
                    res.push(content[item.split('_')[1]],content[item],'','','') 
                    temp.push(res)
                });
                (currentKdJenis == content.Jenis) ?  '' : temp.map(c=>results.push(c));
                currentKdJenis = content.Jenis;
                results.push(['',content.No_Urut +'. '+content.Uraian,content.JmlSatuan+' '+content.Satuan,content.Anggaran,content.Anggaran])
            });
            return results;
        };
    }
}

RabComponent['parameters'] = [ApplicationRef, NgZone,ActivatedRoute];
export default RabComponent;
