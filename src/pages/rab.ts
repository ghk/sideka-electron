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
import * as uuid from 'uuid';

const path = require("path");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');
const base64 = require("uuid-base64");

const akun = [{nama_akun:'pendapatan',akun:'4.'},{nama_akun:'belanja',akun:'5.'},{nama_akun:'pembiayaan',akun:'6.'}];
const categories = [
    {
        name:'pendapatan',
        code:'4.',
        fields:[
            ['','Akun','','Nama_Akun'],['','Kelompok','','Nama_Kelompok'],['','Jenis','','Nama_Jenis'],['','Obyek','','Nama_Obyek'],
            ['','Obyek_Rincian','','Uraian','JmlSatuan','JmlSatuanPAK','Satuan','HrgSatuan','HrgSatuanPAK','Sumber','Anggaran','AnggaranStlhPAK', 'Perubahan']
        ],
        currents:[{fieldName:'Akun',value:''},{fieldName:'Kelompok',value:''},{fieldName:'Jenis',value:''},{fieldName:'Obyek',value:''}]
    },{
        name:"belanja",
        code:'5.',
        fields:[
            ['','Akun','','Nama_Akun'],['','','Kd_Bid','Nama_Bidang'],['','','Kd_Keg','Nama_Kegiatan'],['','Jenis','','Nama_Jenis'],['Kd_Keg','Obyek','','Nama_Obyek'],
            ['Kd_Keg','Kode_Rincian','','Uraian','JmlSatuan','JmlSatuanPAK','Satuan','HrgSatuan','HrgSatuanPAK','Sumber','Anggaran','AnggaranStlhPAK', 'Perubahan']
        ],
        currents:[{fieldName:'Akun',value:''},{fieldName:'Kd_Bid',value:''},{fieldName:'Kd_Keg',value:''},{fieldName:'Jenis',value:''},{fieldName:'Obyek',value:''}]
    },{
        name:'pembiayaan',
        code:'6.',
        fields:[
            ['','Akun','','Nama_Akun'],['','Kelompok','','Nama_Kelompok'],['','Jenis','','Nama_Jenis'],['','Obyek','','Nama_Obyek'],
            ['','Obyek_Rincian','','Uraian','JmlSatuan','JmlSatuanPAK','Satuan','HrgSatuan','HrgSatuanPAK','Sumber','Anggaran','AnggaranStlhPAK', 'Perubahan']
        ],
        currents:[{fieldName:'Akun',value:''},{fieldName:'Kelompok',value:''},{fieldName:'Jenis',value:''},{fieldName:'Obyek',value:''}]
    }];

enum Jenis { Kelompok = 2, Jenis = 3, Obyek = 4}

var app = remote.app;
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
    isExist:boolean;
    messageIsExist:string;
    kegiatanSelected:string;
    isObyekRABSub:boolean;
    
    constructor(private appRef: ApplicationRef, private zone: NgZone, private route:ActivatedRoute){ 
        this.appRef = appRef;       
        this.zone = zone;
        this.route = route;
        this.isExist = false;
        this.isObyekRABSub = false;
        this.kegiatanSelected='';
        this.siskeudes =new Siskeudes(settings.data["siskeudes.path"]); 
        this.sub = this.route.queryParams.subscribe(params=>{
            this.year = params['year'];  
            this.regionCode = params['kd_desa'];
            this.getReferences();
            this.siskeudes.getTaDesa(this.regionCode,data=>{
                this.refDatasets['taDesa']
            });
        })
    }    
    
    onResize(event) {
        let that = this;
        setTimeout(function() {            
            that.hot.render()
        }, 200);
    }

    createSheet(sheetContainer){ 
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
        }
        let result = new Handsontable(sheetContainer, config);

        result.sumCounter = new SumCounter(result,'rab');

        result.addHook('afterChange', function(changes, source){
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;
                changes.forEach(function(item){
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];
                        
                    if(col == 7){
                        rerender = true;
                    }
                });
                if(rerender){
                    result.sumCounter.calculateAll();
                    result.render();
                }
            }
        });
        return result;
    }

    ngOnInit(){  
        let that = this;        
        this.siskeudes.getRAB(this.year,this.regionCode,data=>{
                 
            let elementId = "sheet";
            let sheetContainer = document.getElementById(elementId); 
            let oldKdKegiatan ='';
                        
            this.hot = this.createSheet(sheetContainer); 

            let inputSearch = document.getElementById("input-search");
            this.tableSearcher = initializeTableSearch(this.hot, document, inputSearch, null);

            let results = this.transformData(data);            

            this.hot.loadData(results);
            this.hot.sumCounter.calculateAll();
            setTimeout(function() {
                that.hot.render();
            }, 500);                
        }); 
    }

    transformData(data): any[] {
        let results =[];
        let oldKdKegiatan ='';
        let oldCategory = '';

        data.forEach(content=>{
            let category = categories.find(c=>c.code == content.Akun);
            let fields = category.fields.slice();
            let currents = category.currents.slice();

            if(content.Jenis=='5.1.3.'){
                fields.splice(5, 0, [ '', 'Kode_SubRinci' , '', 'Nama_SubRinci' ])
                currents.splice(5, 0, { fieldName:'Kode_SubRinci', value:''})
            }

            fields.forEach((field,idx)=>{
                let res = [];
                let current = currents[idx];
                
                res.push(base64.encode(uuid.v4()))
                
                for(let i = 0; i < field.length;i++){
                    let data = (content[field[i]]) ? content[field[i]] : '';

                    res.push(data)
                }     

                if(!current){
                    results.push(res);
                    return;
                }
                    
                if(current.value !== content[current.fieldName])
                    results.push(res);

                current.value = content[current.fieldName]; 

                if(current.fieldName == "Kd_Keg"){
                    if(oldKdKegiatan != '' && oldKdKegiatan !== current.value)
                        currents.filter(c=>c.fieldName == 'Jenis' || c.fieldName == 'Obyek').map( c=> { c.value = '' });
                    
                    oldKdKegiatan = current.value;
                }   
            })
            oldCategory = category.name;
        });

        return results;
    }

    ngOnDestroy(){
        this.sub.unsubscribe();
    } 

    openAddRowDialog():void{
        let selected = this.hot.getSelected();   
        this.isExist = false;    
        this.rapSelected = 'rap';
        let category = 'pendapatan';
        let sourceData = this.hot.getSourceData();   

        if(selected){
            let data = this.hot.getDataAtRow(selected[1]);
            let currentCategory = categories.find(c=>c.code.slice(0,2) == data[1].slice(0,2));        
        }

        this.categorySelected = category;
        $("#modal-add").modal("show"); 
        $('input[name=category][value='+category+']').checked = true;

        this.categoryOnClick(category);        
    
    }

    addRow():void{
        let position=0;        
        let data = {};
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let contents = [];
        $("#form-add").serializeArray().map(c=> {data[c.name]=c.value});

        let currents ={ Kelompok:'', Jenis:'' , Obyek:'', Kd_Bid:'', Kd_Keg:''}
        let positions = { Kelompok:0, Jenis:0, Obyek:0}
        let parentGreaterObyek = false, parentSmallerObyek = false, smaller=false, parent=false; 
        let parentSmallerJenis=false,parentGreaterJenis=false;
        let types = ['Kelompok','Jenis','Obyek'];
        let currentKdKegiatan = '', oldKdKegiatan='',oldBidang='';
        let same = []; 

        if(this.isExist)
            return;
        
        if(this.rapSelected=='rapRinci' || this.rabSelected =='rabRinci'){

        }
        else {
            
            for(let i =0; i < sourceData.length; i++){
                let content = sourceData[i];
                let dotCount = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length -1 : content.kode_rekening.split('.').length;

                if(content.kode_rekening.startsWith('5.') && this.categorySelected=='pendapatan')
                    break;


                if(Jenis[dotCount] && content.kode_rekening > data[Jenis[dotCount]] && content.kode_rekening.startsWith(data[Jenis[dotCount-1]])){
                    positions[Jenis[dotCount]] = i;
                }else if(Jenis[dotCount] && content.kode_rekening < data[Jenis[dotCount]]){
                    positions[Jenis[dotCount]] = i;
                }

                if(content.kode_rekening.startsWith(data[Jenis[3]])){
                    positions[Jenis[3]] = i;
                }

                if(content.kode_rekening == data[Jenis[dotCount]])
                    same.push(Jenis[dotCount]);                
            }


        }

        
        /*
        if(this.rapSelected=='rapRinci' || this.rabSelected =='rabRinci'){
            let lastCode = '00';            

            for(let i=0;i<sourceData.length;i++){
                let code = sourceData[i][0];  
                let lengthCode = code.split('.').length -1;
                let isKdKegiatan = (code.slice(0,this.regionCode.length)===this.regionCode);
                
                if(code !== "" &&parent)
                    parent=false;

                if(lengthCode == 4 && isKdKegiatan)
                    currentKdKegiatan = code;

                if(currentKdKegiatan == data['Kd_Keg'] && this.rabSelected =='rabRinci'){
                    if(lengthCode == 4 && data['Obyek'] == code || parent){
                        position = i+1;
                        (parent) ? lastCode = sourceData[i][1]:'';
                        parent=true;                            
                    }
                }

                if(this.rabSelected == 'rabRinci')continue;
                if(lengthCode == 4 && data['Obyek'] == code || parent){
                    position = i+1;
                    (parent) ? lastCode = sourceData[i][1]:'';
                    parent=true;                            
                }
            }

            let allFields = categories.filter(c=>c.name == this.categorySelected)[0].fields;
            let fields = allFields[allFields.length-1];
            let results = [];

            data['No_Urut'] = ("0" +(parseInt(lastCode)+1)).slice(-2);
            fields.forEach(c => {
                let value = (data[c]) ? data[c] : "";
                results.push(value)
            });

            contents.push(results);
        }

        else if(this.rabSelected == 'rabSub' && this.categorySelected =='belanja'){
            let lastCode = "";
            let currentCode = "";
            
            for(let i=0;i<sourceData.length;i++){ 
                let code = sourceData[i][0];  
                let lengthCode = (code.slice(-1) == '.') ? code.split('.').length -1 : code.split('.').length;
                let isBidang = (code.slice(0,this.regionCode.length)===this.regionCode);
                
                if(lengthCode == 4 && !isBidang)
                    currentCode = code;
                if (code !="" && parentGreaterObyek)parentGreaterObyek=false;
                if (code !="" && parentSmallerObyek)parentSmallerObyek=false

                if(oldKdKegiatan == data['Kd_Keg'] && !isBidang || parentGreaterObyek || parentSmallerObyek){
                    let isObyek = (data['Obyek'] < currentCode);    

                    if(isObyek &&  !smaller  || parentGreaterObyek){
                        positions.Obyek = i;
                        parentGreaterObyek =true;
                    }

                    if(!isObyek || parentSmallerObyek){
                        positions.Obyek = i+1;                            
                        parentSmallerObyek=true;
                        smaller=true;
                    }      

                    if(code.slice(0, data["Obyek"].length) == data["Obyek"] && lengthCode == 5)
                        lastCode = code;                                 
                }               

                if(isBidang && lengthCode == 4)
                    oldKdKegiatan = code;
            }
            let digits = "00";
            let newCode = (lastCode =='') ? data['Obyek'] + '01' : data['Obyek'] + ("0" +(parseInt(lastCode.slice(-2))+1)).slice(-2);

            position = positions.Obyek;
            contents.push([ newCode,'',data['Uraian'] ])
        }
        else{
            for(let i=0;i<sourceData.length;i++){ 
                let code = sourceData[i][0];  
                let lengthCode = (code.slice(-1) == '.') ? code.split('.').length -1 : code.split('.').length;

                let isBidang = (code.slice(0,this.regionCode.length)===this.regionCode);
                let type = (isBidang && this.categorySelected =='belanja') ? ((lengthCode == 3) ? 'Kd_Bid' : 'Kd_Keg') : types[lengthCode-2];

                if(code=='5.' && this.categorySelected=='pendapatan')
                    break;

                position = i+1;
                
                if(type)
                    currents[type] = code;
                
                if (code !="" && parentGreaterObyek)parentGreaterObyek=false;
                if (code !="" && parentSmallerObyek)parentSmallerObyek=false;
                if (code !="" && parentSmallerJenis)parentSmallerJenis=false;
                if (code !="" && parentGreaterJenis)parentGreaterJenis=false;

                if(this.categorySelected =='belanja'){
                    if(oldKdKegiatan == data['Kd_Keg'] || parentGreaterObyek || parentSmallerObyek || parentSmallerJenis || parentGreaterJenis){

                        let isJenis = (data['Jenis'] < currents.Jenis);

                        if( isJenis &&  lengthCode==3 || parentGreaterJenis){
                            positions.Jenis = i;
                            parentGreaterJenis = true;
                        }

                        if( !isJenis || parentSmallerJenis){
                            positions.Jenis = i;
                            parentSmallerJenis=true;
                        }

                        let isObyek = (data['Obyek'] < currents.Obyek);    
                        let isParent = (code.slice(0,data['Jenis'].length) == data['Jenis'])

                        if(isObyek && isParent && !smaller  || parentGreaterObyek){
                            positions.Obyek = i;
                            parentGreaterObyek =true;
                        }

                        if(!isObyek && isParent || parentSmallerObyek){
                            positions.Obyek = i+1;                            
                            parentSmallerObyek=true;
                            smaller=true;
                        }

                        if(code == data[type])  
                        same.push(type);  
                    }

                    if(isBidang && lengthCode == 4)
                        oldKdKegiatan = code;
                }

                if (this.categorySelected === 'belanja') continue;
                if( currents[type] && currents[type] !='' || parentGreaterObyek || parentSmallerObyek || parentSmallerJenis || parentGreaterJenis){
                    
                    if(data['Kelompok'] < currents.Kelompok && lengthCode==2)
                        positions.Kelompok = i;

                    let isJenis = (data['Jenis'] < currents.Jenis);
                    let isParent = (code.slice(0,data['Kelompok'].length) == data['Kelompok']);

                    if( isJenis && isParent && lengthCode==3 || parentGreaterJenis){
                        positions.Jenis = i;
                        parentGreaterJenis = true;
                    }

                    if( !isJenis && isParent || parentSmallerJenis){
                        positions.Jenis = i+1;
                        parentSmallerJenis=true;
                    }

                    let isObyek = (data['Obyek'] < currents.Obyek);    
                    isParent = (code.slice(0,data['Jenis'].length) == data['Jenis'])

                    if(isObyek && isParent && !smaller  || parentGreaterObyek){
                        positions.Obyek = i;
                        parentGreaterObyek =true;
                    }

                    if(!isObyek && isParent || parentSmallerObyek){
                        positions.Obyek = i+1;                            
                        parentSmallerObyek=true;
                        smaller=true;
                    }
                    if(code == data[type])  
                    same.push(type);  
                }    
            }       

            types = (this.categorySelected=='belanja') ? types.slice(1) : types;
            types.forEach(value=>{
                if(same.indexOf(value)!== -1)return;
                let content = this.refDatasets[value].filter(c=>c[0]==data[value])[0];
                (content) ? contents.push(content):'';
            })
            position = (same.length==0 && positions[types[0]] == 0) ? position : positions[types[same.length]];
        }

        contents.forEach((content,i)=>{
            //let newPosition = position+i;
            //this.hot.alter("insert_row", newPosition);
            //this.hot.populateFromArray(newPosition, 0, [content], newPosition, content.length-1, null, 'overwrite');
        })
        */
    }

    addOneRow(): void{
        this.addRow();
        $("#modal-add").modal("hide");
        $('#form-add')[0].reset();
    }

    addOneRowAndAnother():void{        
        this.addRow();  
    }

    checkIsExist(value, message){
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        this.messageIsExist = message;

        if(this.categorySelected == 'belanja'&&this.rabSelected != 'rabRinci'){   
            let currentKdKegiatan='';  

            for(let i=0;i<sourceData.length;i++){
                let codeKeg  = sourceData[i].no_bid_or_keg;
                let lengthCode = codeKeg.split('.').length -1;

                if(lengthCode == 4)
                    currentKdKegiatan = codeKeg;

                if(currentKdKegiatan == this.kegiatanSelected){
                    if(value == sourceData[i].kode_rekening){
                        this.isExist = true;
                        break;
                    }              
                }
                this.isExist = false; 
            }
            return;       
        }

        for(let i=0;i<sourceData.length;i++){
            if(sourceData[i].kode_rekening == value){
                this.isExist = true;                
                break;
            }
            this.isExist = false;
        }
    }
    
    categoryOnClick(value):void{       
        this.isExist = false; 
        this.kegiatanSelected = '';
        switch(value){
            case "pendapatan":               
                this.contentSelection['contentJenis'] = [];
                this.contentSelection['contentObyek'] = [];

                this.rabSelected='rab';
                this.rapSelected='rap';
                Object.assign(this.refDatasets,this.refDatasets['pendapatan']);
                break;
            
            case "belanja":
                this.rabSelected='rab';
                this.rapSelected='rap';
                Object.assign(this.refDatasets,this.refDatasets['belanja']);
                break;
            
            case "pembiayaan":              
                this.contentSelection['contentJenis'] = [];
                this.contentSelection['contentObyek'] = [];

                this.rabSelected='rab';
                this.rapSelected='rap';
                Object.assign(this.refDatasets,this.refDatasets['pembiayaan']);
                let value = this.refDatasets['Kelompok'].filter(c=>c[1]=='6.1.');
                this.refDatasets['Kelompok'] = value;
                break;            
        }
        
    }    

    typeOnClick(selector,value):void{        
        this.isExist = false;
        this.isObyekRABSub = false;

        switch(selector){
            case "rap":
                if(value == 'rap')                    
                    break;

                let code = (this.categorySelected == 'pendapatan') ? '4.' : '6.';
                let sourceData = this.hot.getSourceData();
                let data = sourceData.filter(c => {
                    let lengthCode = c[2].slice(-1) == '.' ?  c[2].split('.').length - 1: c[2].split('.').length;
                    return c[2].startsWith(code) &&  lengthCode == 4
                });
                this.contentSelection["availableObyek"]=data;                
                break;   
            case "rab":
                if(this.kegiatanSelected != '' && value == 'rabRinci' || value == 'rabSub'){
                    this.rabSelected = value;
                    this.selectedOnChange('kegiatan',this.kegiatanSelected);
                }
                break;
        }

    }

    selectedOnChange(selector, value){
        let data = [];
        let results = [];
        
        switch(this.categorySelected){
            case "pendapatan":      
            case "pembiayaan": 
                this.isExist = false;
                let type = (selector == 'Kelompok') ?  'Jenis' : 'Obyek';
                this.contentSelection['content'+type] = [];
                
                data = this.refDatasets[type];
                results = data.filter(c=>c[1].startsWith(value));
                this.contentSelection['content'+type]=results;
                break;

            case "belanja":
                switch(selector){
                    case "bidang":
                        this.kegiatanSelected = '';
                        this.contentSelection['contentKegiatan'] = [];
                        data = this.refDatasets['Kegiatan'].filter(c=>c[2].startsWith(value));
                        this.contentSelection['contentKegiatan']= data;
                        break;

                    case "kegiatan":                        
                        this.kegiatanSelected = value;

                        if(this.rabSelected == 'rab')
                            break;                       

                        this.contentSelection['obyekAvailable'] = [];
                        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                        let contentObyek = [];
                        let currentCodeKeg = '';

                        sourceData.forEach(content=>{
                            let lengthCodeKeg = (content.no_bid_or_keg.slice(-1) == '.') ? content.no_bid_or_keg.split('.').length -1 : content.no_bid_or_keg.split('.').length;
                            let lengthCodeRek = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length -1 : content.kode_rekening.split('.').length;

                            if(lengthCodeKeg == 4){
                                currentCodeKeg = content.no_bid_or_keg;
                                return;
                            }

                            if(currentCodeKeg == value && lengthCodeRek == 4)
                                contentObyek.push(content);
                        });
                        
                        this.contentSelection['obyekAvailable'] = contentObyek.map(c => schemas.objToArray(c, schemas.rab));
                        break;

                    case "jenis":
                        this.contentSelection['contentObyek'] = [];
                        data = this.refDatasets['belanja']['Obyek'].filter(c=>c[1].startsWith(value));
                        this.contentSelection['contentObyek']= data;
                        break;

                    case "obyek":
                        let codeBelanjaModal = '5.1.3.';
                        let currentKdKegiatan = '';

                        if(value.startsWith(codeBelanjaModal)) {
                            this.isObyekRABSub = true;

                            if(this.rabSelected == "rabSub")
                                break;

                            let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                            let results = [];

                            sourceData.forEach(content => {
                                let code  = content.kode_rekening;
                                let lengthCodeRek = (code.slice(-1) == '.') ? code.split('.').length -1 : code.split('.').length;
                                let lengthCodeKeg = (content.no_bid_or_keg.slice(-1) == '.') ? content.no_bid_or_keg.split('.').length -1 : content.no_bid_or_keg.split('.').length;

                                if(lengthCodeKeg == 4)
                                    currentKdKegiatan = content.no_bid_or_keg;

                                if(currentKdKegiatan == this.kegiatanSelected){
                                    if(code.startsWith(value) && lengthCodeRek == 5)
                                        results.push(content)
                                }
                            });
                            
                            this.contentSelection['rabSubAvailable'] = results.map(c => schemas.objToArray(c, schemas.rab));
                            break;
                        }

                        this.isObyekRABSub = false;
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

    getReferences():void{
        categories.forEach(content=>{
            this.siskeudes.getRefRekByCode(content.code, data=>{
                let returnObject = (content.name != 'belanja') ? {Kelompok:[],Jenis:[],Obyek:[]}:{Jenis:[],Obyek:[]};
                let endSlice = (content.name != 'belanja') ? 4 : 5;
                let startSlice = (content.name != 'belanja') ? 1 : 3;
                let fields = content.fields.slice(startSlice,endSlice);
                let currents = content.currents.slice(startSlice,endSlice);
                let results = this.refTransformData(data, fields, currents, returnObject); 
                
                this.refDatasets[content.name] = results;
            })
        });

        this.siskeudes.getRefBidangAndKegiatan(this.regionCode,data=>{
            let returnObject = {Bidang:[],Kegiatan:[]};
            let fields = categories[1].fields.slice(1,3);
            let currents = categories[1].currents.slice(1,3);
            let results = this.refTransformData(data, fields, currents, returnObject);
            Object.assign(this.refDatasets,results);             
        });     

        this.siskeudes.getRefSumberDana(data=>{
            this.refDatasets["sumberDana"] = data;
        })        
    }  
}
