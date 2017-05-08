var $ = require('jquery');
require('jquery-ui-bundle');
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

const potonganDescs = [{code:'7.1.1.01.',value:'PPN'},{code:'7.1.1.02.',value:'PPh Pasal 21'},{code:'7.1.1.03.',value:'PPh Pasal 22'},{code:'7.1.1.04.',value:'PPh Pasal 23'}]


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

export default class SppComponent{
    hot: any;
    siskeudes:any; 
    sub:any;
    savingMessage: string;
    initialDatasets:any={};
    hots:any={};
    tableSearcher: any;
    categorySelected:string;
    contentSelection:any=[];
    contentTarget:any=[];
    potonganDesc:string;

    constructor(private appRef: ApplicationRef, private zone: NgZone, private route:ActivatedRoute){  
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
        $('#datePicker').datepicker();
        
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

    
    openAddRowDialog(){
        let selected = this.hot.getSelected();       
        let category = 'rincian'; //{1:'rincian',2:'pengeluaran',3:'potongan'}
        let sourceData = this.hot.getSourceData();   

        if(selected){
            let data = this.hot.getDataAtRow(selected[0]);
            let code = data[0];
            category = (code.split('.').length !== 3) ? 'pengeluaran' : 'potongan'; 
        }
        this.zone.run(()=>{
            this.categorySelected = category;
            $("#modal-add").modal("show"); 
            $('input[name=category][value='+category+']').checked = true;                    
        });                

        (sourceData.length < 1) ? this.categoryOnChange(category) : this.getAndChangeSelection();        
    }

    addRow(){
        let data = $("#form-add").serializeArray();
        switch(this.categorySelected){
            case 'rincian':{
                console.log(data);
                

                break;
            }
            case 'pengeluaran':{

            }
            case 'potongan':{

            }
        }

    }

    addOneRow(): void{
        this.addRow();
        $("#modal-add").modal("hide");
        $('#form-add')[0].reset();
       
    }

    addOneRowAndAnother():void{        
        this.addRow();  
    }

    categoryOnChange(value):void{
        this.contentSelection =[];
        switch(value){
            case 'rincian':{
                let sourceData = this.hot.getSourceData();
                if(sourceData.length >= 1) {
                    this.getAndChangeSelection();
                    break;
                }
                this.siskeudes.getAllKegiatan(data=>{
                    this.zone.run(()=>{
                        this.contentSelection = data;
                    });
                });
                break;
            }
            case 'pengeluaran':{
                let sourceData = this.hot.getSourceData();
                let rincian = sourceData.filter(c=>c[0].length ==1);
                this.zone.run(()=>{
                    this.contentSelection = rincian;
                })

                break;
            }
            case 'potongan':{
                this.siskeudes.getRefPotongan(data=>{
                    this.contentSelection = data;
                });
                break;
            }
        }
    } 

    getAndChangeSelection():void{
        let sourceData = this.hot.getSourceData();
        let row = sourceData.filter(c=>c[0].length ==1)[0];
        let code = row[1];
        this.siskeudes.getKegiatanByCodeRinci(code,data=>{
            let codeKegiatan = data[0].Kd_Keg;
            this.contentSelection = [];
            console.log(codeKegiatan);
            this.selectedOnChange(codeKegiatan);
        })
    }  

    selectedOnChange(value):void{ 
        switch(this.categorySelected){
            case 'rincian':{
                this.siskeudes.getRABSubByCode(value,data=>{
                    this.zone.run(()=>{
                        console.log(data)
                        this.contentTarget = data;
                    });
                });
                break;
            }
            case 'pengeluaran':{

                break;
            }
            case 'potongan':{
                console.log(value);
                this.zone.run(()=>{
                    let res = potonganDescs.filter(c=>c.code == value)[0];
                    (!res)  ? this.potonganDesc = '' : this.potonganDesc = res.value;
                    
                })

                break;
            }
        }  
    }
}
