import { remote, app as remoteApp, shell } from 'electron';
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastsManager } from 'ng2-toastr';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import settings from '../stores/settings';
import schemas from '../schemas';
import SumCounterPenerimaan from "../helpers/sumCounterPenerimaan";

import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var path = require('path');
var jetpack = require('fs-jetpack');
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var base64 = require('uuid-base64');

window['jQuery'] = $;
var bootstrap = require('./node_modules/bootstrap/dist/js/bootstrap.js');

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath('userData');

const CATEGORY = [{
        name: "penerimaan",
        fields:[
            ['No_Bukti','Uraian','','','Tgl_Bukti','Nama_Penyetor','Alamat_Penyetor','TTD_Penyetor','NoRek_Bank','Nama_Bank'],['Kd_Rincian','Nama_Obyek','Nilai','SumberDana']
        ],
        current: { fieldName: 'No_Bukti', value: '' }
    },{
        name: "penyetoran",
        fields:[
            ['No_Bukti','Uraian','','Tgl_Bukti','NoRek_Bank','Nama_Bank'],['No_TBP','Uraian_Rinci','Nilai']
        ],
        current: { fieldName: 'No_Bukti', value: '' }
    }];

const FIELD_WHERE = {
    Ta_TBP : ['Tahun', 'Kd_Desa', 'No_Bukti'],
    Ta_TBPRinci: ['Tahun', 'Kd_Desa', 'No_Bukti', 'Kd_Rincian', 'Kd_Keg'],
    Ta_STS: ['Tahun', 'Kd_Desa', 'No_Bukti'],
    Ta_STSRinci: ['Tahun', 'Kd_Desa', 'No_Bukti', 'No_TBP']

}

@Component({
    selector: 'penerimaan',
    templateUrl: 'templates/penerimaan.html',
})

export default class PenerimaanComponent {
    activeSheet: string;
    sheets: any;

    messageIsExist: string;
    isExist: boolean;

    initialDatasets: any = {};
    hots: any = {};
    activeHot: any;

    contentSelection: any = {};
    dataReferences: any = {};
    desaDetails: any = {};
    rinciansTBP: any[] = [];

    diffTracker: DiffTracker;
    diffContents: any = {};

    afterSaveAction: string;
    stopLooping: boolean;
    model: any = {};

    constructor(
        private dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef) {

        this.diffTracker = new DiffTracker();
        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit() {
        titleBar.title("Data Keuangan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        this.sheets = ['penerimaanTunai', 'penerimaanBank', 'penyetoran', 'swadaya'];
        this.activeSheet = 'penerimaanTunai';
        this.diffContents = { diff: [], total: 0 };

        let me = this;

        document.addEventListener('keyup', (e) => {
            if (e.ctrlKey && e.keyCode === 83) {
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.ctrlKey && e.keyCode === 80) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);

        this.sheets.forEach(sheet => {
            let sheetContainer = document.getElementById('sheet-' + sheet);
            this.hots[sheet] = this.createSheet(sheetContainer, sheet);
        });

        this.siskeudesService.getTaDesa(null, details =>{        
            this.desaDetails = details[0];
            this.getContent('penerimaanTunai', data => {
                this.activeHot = this.hots.penerimaanTunai;
                this.activeHot.loadData(data);            
                this.initialDatasets['penerimaanTunai'] = data.map(c => c.slice());
                this.activeSheet = 'penerimaanTunai';

                this.getReferences('rincianTBP');                
                setTimeout(function () {
                    me.activeHot.sumCounter.calculateAll();
                    me.activeHot.render();                
                }, 500);
            });
        })
    }

    onResize(event): void {
        let that = this;
        this.activeHot = this.hots[this.activeSheet];
        setTimeout(function () {
            that.activeHot.render()
        }, 200);
    }

    redirectMain() {
        let diff = this.getDiffContents();
        this.afterSaveAction = 'home';

        if (diff.total === 0)
            document.location.href = "app.html";
        else
            this.openSaveDialog();
    }

    forceQuit(): void {
        document.location.href = "app.html";
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            document.location.href = "app.html";
        else if (this.afterSaveAction == "quit")
            APP.quit();
    }

    getContent(sheet, callback) {
        let results;
        switch (sheet) {
            case "penerimaanTunai":
                this.siskeudesService.getPenerimaan(1, data => {
                    results = this.transformData(data);
                    callback(results);
                });
                break;

            case "penerimaanBank":
                this.siskeudesService.getPenerimaan(2, data => {
                    results = this.transformData(data);
                    callback(results);
                });
                break;

            case 'penyetoran':
                this.siskeudesService.getPenyetoran(data => {
                    results = this.transformData(data);
                    callback(results);
                })
                break;

            case 'swadaya':
                this.siskeudesService.getPenerimaan(3, data => {
                    results = this.transformData(data);
                    callback(results);
                });
                break;
         }
    }

    createSheet(sheetContainer, sheet): any {
        let me = this;
        sheet = (sheet == 'penyetoran') ? 'penyetoran' : 'penerimaan';

        let result = new Handsontable(sheetContainer, {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas[sheet]),
            columns: schemas[sheet],

            colWidths: schemas.getColWidths(schemas[sheet]),
            rowHeights: 23,

            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {
                columns: schemas[sheet].map((c, i) => { return (c.hiddenColumn == true) ? i : '' }).filter(c => c !== ''),
                indicators: true
            },

            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar'],

        });
        
        result.sumCounter = new SumCounterPenerimaan(result, sheet);
                result.addHook('afterChange', function (changes, source) {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;

                if (me.stopLooping) {
                    me.stopLooping = false;
                    changes = [];
                }

                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if (col == 3) {
                        let id = result.getDataAtCell(row, 0);
                        if(me.activeSheet == 'penerimaanTunai'){                            
                            let data = result.getDataAtRow(row);                            
                             
                            if(data[0].split('_').length == 1) { 
                                me.stopLooping = true; 
                                result.setDataAtCell(row, col, null);
                                return;
                            }

                            let rincian = me.dataReferences.rincianTBP.find(c => c.Kd_Rincian == data[1]);

                            if(rincian && rincian.Nilai < value){
                                me.toastr.error(`Anggaran Tidak Boleh Lebih dari ${rincian.Nilai}!!`)
                                result.setDataAtCell(row, col, prevValue);
                                me.stopLooping = true;
                                return
                            }
                            rerender = true;
                        }
                    }    
                    else if(col == 5) {
                        let year = moment(value , "DD-MM-YYYY").year()
                        
                        if(me.desaDetails.Tahun < year){
                            me.toastr.error('Tahun Tidak Boleh Melebihi Tahun Anggaran', '');
                            result.setDataAtCell(row, col, prevValue);
                            me.stopLooping = true;
                        }
                    }             
                });
                if (rerender) {
                    result.sumCounter.calculateAll();
                    result.render();
                }
            }
        });

        return result;
    }

    transformData(source): any[] {
        let results = [];
        let currentFields = (this.activeSheet != 'penyetoran') ? 
            CATEGORY.find(c => c.name == 'penerimaan'):        
            CATEGORY.find(c => c.name == 'penyetoran');

        source.forEach(content => {
            currentFields.fields.forEach(fields => {
                let row = [];
                let currentParent = currentFields.current;

                fields.forEach(f => {
                    let value = (content[f]) ? content[f] : '';
                    row.push(value);
                })

                if(fields.indexOf(currentParent.fieldName) !== -1){
                    if(currentParent.value != content[currentParent.fieldName]){
                        let id = content.No_Bukti;
                        row.splice(0,0,id);
                        results.push(row)
                    }

                    currentParent.value = content[currentParent.fieldName];
                }
                else{
                    let id = '';

                    if(this.activeSheet == 'penyetoran')
                        id = `${content.No_Bukti}_${content.No_TBP}`;
                    else
                        id = `${content.No_Bukti}_${content.Kd_Rincian}`;

                    row.splice(0,0,id);
                    results.push(row);
                }
            })
        })
        return results;
    }

    loadDataToSheet(sheet) {
        if(this.initialDatasets[sheet] && this.initialDatasets[sheet] > 1)
            return;
        
        this.getContent(sheet, data => {
            let hot = this.hots[sheet];
            this.initialDatasets[sheet] = data.map(c => c.slice());
                        
            hot.loadData(data);
            hot.sumCounter.calculateAll();

            if(sheet != 'penyetoran')
                this.getReferences('rincianTBP');

            if (this.activeSheet == sheet) {
                setTimeout(function () {
                    hot.render();
                }, 300);
            }
        });
    }

    selectTab(sheet): void {
        let that = this;
        this.isExist = false;
        this.activeSheet = sheet;
        this.activeHot = this.hots[sheet];
        let sourceData = this.activeHot.getSourceData();

        if (sourceData.length < 1)
            this.loadDataToSheet(sheet);
        else {
            setTimeout(function () {
                that.activeHot.render();
            }, 500);
        }
    }

    saveContent(): void {
        let diff = this.getDiffContents();
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };
        $('#modal-save-diff').modal('hide');
        let requiredCol = { Kd_Desa: this.desaDetails.Kd_Desa, Tahun: this.desaDetails.Tahun };              

        this.sheets.forEach(sheet => {
            let hot = this.hots[sheet];
            let sourceData = hot.getSourceData();            
            let initialDataset = this.initialDatasets[sheet];
            let typeSheet = (sheet !== 'penyetoran') ? 'penerimaan' : 'penyetoran';
            
            if(!initialDataset)
                return;            

            let diffcontent = this.trackDiff(initialDataset, sourceData);
            if (diffcontent.total < 1) return;

            diffcontent.added.forEach(content => {
                let row = schemas.arrayToObj(content, schemas[typeSheet]);
                let result = this.getExtraColumns(hot, row, sheet);                
                let data = Object.assign(row, requiredCol, result.data); 
                
                bundleData.insert.push({ [result.table] : data })
            });

            diffcontent.modified.forEach(content => {
                let res = { whereClause: {}, data: {} }
                let row = schemas.arrayToObj(content, schemas[typeSheet]);
                let result = this.getExtraColumns(hot, row, sheet);                
                let data = Object.assign(row, requiredCol, result.data);               
                
                FIELD_WHERE[result.table].forEach(c => {
                    res.whereClause[c] = data[c];
                });

                res.data = this.sliceObject(data, FIELD_WHERE[result.table]);
                bundleData.update.push({ [result.table] : res})
            });

            diffcontent.deleted.forEach(content => {
                let res = { whereClause: {}, data: {} }
                let row = schemas.arrayToObj(content, schemas[typeSheet]);
                let result = this.getExtraColumns(hot, row, sheet);                
                let data = Object.assign(row, requiredCol, result.data);
                
                
                FIELD_WHERE[result.table].forEach(c => {
                    res.whereClause[c] = data[c];
                });

                res.data = this.sliceObject(data, FIELD_WHERE[result.table]);
                bundleData.delete.push({ [result.table] : res})
            });            
        });
        this.siskeudesService.saveToSiskeudesDB(bundleData, null, response => {
        })
    };

    getExtraColumns(hot, row, sheet){
        let result = { table: '', data: {} }
        enum Sheets { penerimaanTunai = 1, penerimaanBank = 2, swadaya = 3 } 

        if(sheet !== 'penyetoran'){
            if(row.Id.split('_').length == 1) {
                result.table = 'Ta_TBP'
                result.data['Nilai'] = hot.sumCounter.sums[row.Code];
                result.data['No_Bukti'] = row.Code;
                result.data['KdBayar'] = Sheets[sheet];
                result.data['TTD_Penyetor'] = (row.TTD_Penyetor = "") ? " " : row.TTD_Penyetor;
            }
            else {
                let rincian = this.dataReferences.rincianTBP.find(c => c.Kd_Rincian == row.Code);   
                
                result.table = 'Ta_TBPRinci'
                result.data['Kd_Rincian'] = row.Code;
                result.data['RincianSD'] = row.Code + rincian.SumberDana;
                result.data['SumberDana'] = row.SumberDana;
                result.data['No_Bukti'] = row.Id.split('_')[0];
                result.data['Kd_Keg'] = (sheet != 'swadaya') ?  this.desaDetails.Kd_Desa +'00.00.' : row.Kd_Keg;                
            }                        
        }
        else {
            if(row.Id.split('_').length == 1) {
                result.table = 'Ta_STS';
                result.data['No_Bukti'] = row.Code;
                result.data['Jumlah'] = hot.sumCounter.sums[row.Code]
            }
            else {
                let sourceDataTBPTunai = this.hots['penerimaanTunai'].getSourceData(c => schemas.arrayToObj(c, schemas.penerimaan));
                let currentTBP  = sourceDataTBPTunai.find(c => c.Code == row.Code);

                result.table = 'Ta_STSRinci';                
                result.data['No_TBP'] = row.Code;
                result.data['No_Bukti'] = row.Id.split('.')[0];
                result.data['Uraian'] = currentTBP.Uraian;
            }
        }

        return result;
    }


    arrayToObj(arr, schema): any {
        let result = {};
        for (let i = 0; i < schema.length; i++) {
            let newValue;
            if (arr[i] == 'true' || arr[i] == 'false')
                newValue = arr[i] == 'true' ? true : false
            else
                newValue = arr[i];

            result[schema[i]] = newValue;
        }

        return result;
    }

    bundleData(bundleDiff, type): any {
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };

        return bundleData;
    }

    sliceObject(obj, values): any {
        let res = {};
        let keys = Object.keys(obj);

        for (let i = 0; i < keys.length; i++) {
            if (values.indexOf(keys[i]) !== -1) continue;
            res[keys[i]] = obj[keys[i]]
        }
        return res;
    }

    addRow(): void {
        let me = this;
        let position = 0;
        let data = this.model;
        let type  = (this.activeSheet != 'penyetoran') ? 'penerimaan' : 'penyetoran';
        let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas[type]));
        let content = [];

        if(this.activeSheet != 'penyetoran'){
            data.NoRek_Bank = (!data.NoRek_Bank || data.NoRek_Bank == '') ? '-' : data.NoRek_Bank;
            data.Nama_Bank = (!data.Nama_Bank || data.Nama_Bank == '') ? '-' : data.Nama_Bank;
            data.Id = (data.category == 'TBP') ? data.No_Bukti :data.No_Bukti +'_'+ data.Kd_Rincian;
            
            position = sourceData.length;
            if(data.category == 'Rincian'){
                sourceData.forEach((c, i) => {
                    if(c.Id.startsWith(data.No_Bukti))
                        position = i + 1;                    
                })
                let rincian = this.dataReferences.rincianTBP.find(c => c.Kd_Rincian == data.Kd_Rincian);
                data.Nama_Obyek = rincian.Nama_Obyek;
                data.SumberDana = rincian.SumberDana;
            }
        }
        else {
            data.Id = (data.category == 'STS') ? data.No_Bukti : data.No_Bukti +'_'+ data.No_TBP;
            if(data.category == 'Rincian'){
                sourceData.forEach((c, i) => {
                    if(c.Id.startsWith(data.No_Bukti))
                        position = i + 1;                    
                })
                let sourceDataTPBTunai = this.hots['penerimaanTunai'].getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
                let content =  sourceDataTPBTunai.find(c => c.No_Bukti == data.No_TBP);
                
                data['Uraian_Rinci'] = content.Nama_Uraian
            }
        }

        let nameCategory = (this.activeSheet != 'penyetoran') ? 'penerimaan' : 'penyetoran';
        let currentCategory = CATEGORY.find(c => c.name == nameCategory);
        let fields = (data.category == 'TBP') ? currentCategory.fields[0] : currentCategory.fields[1];

        content.push(data.Id);
        fields.forEach(f => {
            (data[f]) ? content.push(data[f]) : content.push('');
        });

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length-1, null, 'overwrite');

        let endColumn = (this.activeSheet == 'renstra') ? 2 : 6;
        this.activeHot.selectCell(position, 0, position, endColumn, null, null);
        
        setTimeout(function() {
            me.activeHot.sumCounter.calculateAll();
            me.activeHot.render();
        }, 300);
    }


    openAddRowDialog(): void {
        let sheet = (this.activeSheet != 'penyetoran') ? 'penerimaan' : 'penyetoran'; 

        this.model = {};     
        this.model.category = (sheet == 'penerimaan') ? 'TBP' : 'STS';
        this.getNumTBPOrSTS();
        $("#modal-add-"+sheet).modal("show");
    }

    getNumTBPOrSTS(): void {
        if(this.activeSheet != 'penyetoran'){
            this.siskeudesService.getMaxNoTBP(data => {
                let fixLastNum = 0
                let lastNumFromSheet = this.getLastNumFromSheet('TBP');  

                if(data.length != 0) {
                    let lastNumFromDB = data[0].No_Bukti.split('/')[0];
                    fixLastNum = (parseInt(lastNumFromDB) < lastNumFromSheet) ? lastNumFromSheet : parseInt(lastNumFromDB);                        
                }  

                this.model.No_Bukti = this.getNextCode(fixLastNum);   
            })
        }
        else {
            this.siskeudesService.getMaxNoSTS(data => {
               let fixLastNum = 0
                let lastNumFromSheet = this.getLastNumFromSheet('STS');  
                             
                if(data.length != 0) {
                    let lastNumFromDB = data[0].No_Bukti.split('/')[0];
                    fixLastNum = (parseInt(lastNumFromDB) < lastNumFromSheet) ? lastNumFromSheet : parseInt(lastNumFromDB);                        
                }  

                this.model.No_Bukti = this.getNextCode(fixLastNum);                 
            })
        }   
    }

    getNextCode(lastNumber){
        let kodeDesa = this.desaDetails.Kd_Desa.slice(0,-1);
        let pad = '0000';        
        let type = (this.activeSheet != 'penyetoran') ? 'TBP' : 'STS';
        let newNumber = (parseInt(lastNumber)+1).toString();
        let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
        let result = stringNum + '/' + type + '/' + kodeDesa +'/'+ this.desaDetails.Tahun;  
        return result;
    }
    
    getLastNumFromSheet(type){   
        let maxNumbers = [0];  
        let sheets = ['penerimaanTunai', 'penerimaanBank', 'swadaya'];

        if(this.activeSheet == 'penyetoran')
            sheets = ['penyetoran'];  

        sheets.forEach(sheet => {
            let hot = this.hots[sheet];
            let sourceData = hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
            let numbers = [0];

            if(sourceData.length == 0)
                return;

            sourceData.forEach(c => {
                if(c.Code.split('/').length == 4 && c.Code.search(type) != -1){
                    let splitCode = c.Code.split('/');
                    numbers.push(parseInt(splitCode[0]));
                }
            })
            maxNumbers.push(Math.max.apply(null, numbers))
        }); 
        return Math.max.apply(null, maxNumbers);
    }

    openSaveDialog() {
        let that = this;
        this.diffContents = this.getDiffContents();

        if (this.diffContents.total > 0) {
            this.afterSaveAction = null;
            $("#modal-save-diff").modal("show");
            setTimeout(() => {
                that.hots[that.activeSheet].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
        else
            this.toastr.warning('Tidak ada data yang berubah', '');
    }

    addOneRow(): void {
        this.addRow();
        let sheet = (this.activeSheet != 'penyetoran') ? 'penerimaan' : 'penyetoran';
        $("#modal-add-"+sheet).modal("hide");
    }

    addOneRowAndAnother(): void {
        this.addRow();        
    }

    categoryOnChange(value): void {
        this.model = {};
        this.getNumTBPOrSTS();
        this.setDefaultvalue();
        this.model.category = value;

        if(value !== 'Rincian')
            return;

        if(value == 'Rincian' && this.activeSheet != 'penyetoran'){
            let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
            this.contentSelection['TBPAvailable'] = sourceData.filter(c => c.Code.split('.').length != 5);            
        }
        else {
            let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas.penyetoran));
            this.contentSelection['STSAvailable'] = sourceData.filter(c => c.Code.search('STS') !== -1); 
        }
    }

    selectedOnChange(selector): void {
        let sheet = (this.activeSheet != 'penyetoran') ? 'penerimaan' : 'penyetoran';
        let sourceData = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas[sheet]));
        
        if(sheet == 'penerimaan'){
            this.contentSelection['rincianTBP'] = [];
            let referencesRincian = this.dataReferences.rincianTBP.map(c => Object.assign({},c))
            sourceData.forEach(c => {
                if(c.Id.startsWith(this.model.No_Bukti) && c.Id.split('_').length == 2){                    
                    let index = referencesRincian.findIndex(r => c.Code == r.Kd_Rincian);
                    if(index!= -1)
                      referencesRincian.splice(index,1);
                }                
            });
            this.contentSelection.rincianTBP = referencesRincian;
        }
        else {
            if(selector === 'Penerimaan') {
                if(!this.model.No_TBP  || this.model.No_TBP == 'null')
                    return;
                
                let sums = this.hots['penerimaanTunai'].sumCounter.sums;
                this.model.Nilai = sums[this.model.No_TBP];
                return;
            }

            let results = [];
            let detailsPenyetoran = sourceData.find(c => c.Code == this.model.No_Bukti);
            let sourceDataTPBTunai = this.hots['penerimaanTunai'].getSourceData().map(a => schemas.arrayToObj(a, schemas.penerimaan));
            let datePenyetoran = moment(detailsPenyetoran.Tgl_Bukti, "DD-MM-YYYY");
            
            sourceDataTPBTunai.forEach(c => {
                if(c.Code.split('/').length == 4){
                    let content = sourceData.find(row => row.Code == c.Code);
                    if(!content){
                        let datePenerimaan = moment(c.Tgl_Bukti, "DD-MM-YYYY");

                        if(datePenerimaan <= datePenyetoran)
                            results.push(c);
                    }
                }
            });
            this.contentSelection['TBPTunaiAvailable'] =  results;      
        }
    }

    getReferences(type): void {
        switch (type) {
            case 'rincianTBP':
                this.siskeudesService.getRincianTBP(this.desaDetails.Tahun, this.desaDetails.Kd_Desa, data =>{
                    this.dataReferences['rincianTBP'] = data;
                })
        }
    }

    setDefaultvalue() {

    }

    trackDiff(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    getDiffContents(): any {
        let res = { diff: [], total: 0 };
        Object.keys(this.initialDatasets).forEach(sheet => {
            let sourceData = this.hots[sheet].getSourceData();
            let initialData = this.initialDatasets[sheet];
            let diffcontent = this.diffTracker.trackDiff(initialData, sourceData);

            if (diffcontent.total > 0) {
                res.diff.push({ data: diffcontent, sheet: [sheet] })
                res.total += diffcontent.total;
            }
        })
        return res;
    }

    validateForm(data): boolean {
        let result = false;
        let category = this.model.category;

        return result
    }

  
}