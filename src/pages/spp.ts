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

const jenisSPP={UM:"Panjar",LS:"Definitif",PBY:"Pembiayaan"}
const fields = [
    {
        category:'rincian',
        fieldName:['Kd_Rincian','Nama_SubRinci','','Sumberdana','Nilai']
    },
    {
        category:'bukti',
        fieldName:['No_Bukti','Keterangan_Bukti','Tgl_Bukti','','Nilai_SPP_Bukti','Nm_Penerima','Alamat','Nm_Bank','Rek_Bank','NPWP']
    },
    {
        category:'potongan',
        fieldName:['Kode_Potong','Nama_Obyek','','','Nilai_SPPPot']
    }
    ];
const currents = [
    {
        code:'',
        category:'rincian',
        fieldName:'Kd_Rincian',
        value:''
    },
    {
        code:'',
        category:'bukti',
        fieldName:'No_Bukti',
        value:''
    },
    {
        code:'',
        category:'potongan',
        fieldName:'Kode_Potong',
        value:''
    }
    ];


var app = remote.app;
var hot;


var sheetContainer;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath("userData");

window['jQuery'] = $;
window['app'] = app;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/spp.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

class SppComponent{
    hot: any;
    appRef: any;
    zone: any;
    siskeudes:any;   
    route:any;
    sub:any;
    savingMessage: string;
    initialDatasets:any={};
    hots:any={};
    tableSearcher: any;

    constructor(appRef, zone, route){  
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;      
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]); 
    }

    initSheet(sheetContainer){ 
        let me = this; 
        let config =    {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.spp),        
            columns: schemas.spp,

            colWidths: schemas.getColWidths(schemas.spp),
            rowHeights: 23,

            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {
                columns:schemas.spp.map((c,i)=>{return (c.hiddenColumn==true) ? i:''}).filter(c=>c!== ''),
                indicators: true
            },
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
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
        result.addHook("beforeRemoveRow", (index, amount) => {
            console.log(index);
        });
        
        return result;
    }

    onResize(event) {
        setTimeout(function() {            
            hot.render()
        }, 200);
    }

    ngOnInit(){  
        titleBar.blue("SPP - " +dataApi.getActiveAuth()['desa_name']);
        let that = this;
        let noSPP;
        
        this.sub = this.route.queryParams.subscribe(params=>{
            noSPP = params['no_spp'];  
        });
        let sheetContainer = document.getElementById("sheet");
        this.hot = hot = this.initSheet(sheetContainer);
        
        
        hot.render();

        this.siskeudes.getDetailSPP(noSPP,data=>{
            let results = [];
            data.forEach(content=>{
                let temp = [];          
                fields.forEach((item,idx)=>{
                    let res=[];
                    let current = currents.filter(c=>c.category==item.category)[0];
                    let code = this.getnewCode(current, idx, content);
                    if(content[current.fieldName] || content[current.fieldName] !== null){
                        res.push(code.full_code);    
                        for(let i=0;i< item.fieldName.length;i++){
                            let contentPush = (item.fieldName[i] == '') ? '':content[item.fieldName[i]];
                            res.push(contentPush);
                        }
                        if(current.value != content[current.fieldName]){
                            if(currents[idx+1])currents[idx+1].code='';
                            current.code = code.single_code; 
                            temp.push(res);
                        };
                        current.value = content[current.fieldName]; 
                    }
                });     
                temp.map(c=>results.push(c))        
            });         
            hot.loadData(results);
            setTimeout(function() {
                hot.render();
            }, 200);
        });        
    }
    
    getnewCode(current, currentIndex,source){
        let results = {single_code:'',full_code:''}
        if(current.code=='')current.code='0';
        results.single_code = (current.value == source[current.fieldName]) ? current.code: (parseInt(current.code)+1).toString();        
        for(let i = 0; i < currentIndex+1;i++){
            let code = (currents[i].value == source[currents[i].fieldName]) ? currents[i].code : (parseInt(currents[i].code)+1).toString();
            results.full_code += ((currentIndex - i) == 0) ? code : code +'.';
        }
        return results;
    }
    
    filterContent($event){ 
       
    }
}

SppComponent['parameters'] = [ApplicationRef, NgZone, ActivatedRoute];
export default SppComponent;
