import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { ToastsManager } from 'ng2-toastr';

import { Siskeudes } from '../stores/siskeudes';
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';

import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import SumCounter from "../helpers/sumCounter";
import { Diff, DiffTracker } from "../helpers/diffTracker";
import titleBar from '../helpers/titleBar';

import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import * as uuid from 'uuid';

var $ = require('jquery');
var path = require("path");
var jetpack = require("fs-jetpack");
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var base64 = require("uuid-base64");

window['jQuery'] = $;
var bootstrap = require('./node_modules/bootstrap/dist/js/bootstrap.js');

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");

const renstra = {
    fields: [['ID_Visi', 'Visi', 'Uraian_Visi'], ['ID_Misi', 'Misi', 'Uraian_Misi'], ['ID_Tujuan', 'Tujuan', 'Uraian_Tujuan'], ['ID_Sasaran', 'Sasaran', 'Uraian_Sasaran']],
    currents: [{ fieldName: 'ID_Visi', value: '', lengthId: 0 }, { fieldName: 'ID_Misi', value: '', lengthId: 2 }, { fieldName: 'ID_Tujuan', value: '', lengthId: 4 }, { fieldName: 'ID_Sasaran', value: '', lengthId: 6 }]
}

const fieldWhere = {
    Ta_RPJM_Visi: ['ID_Visi'],
    Ta_RPJM_Misi: ['ID_Misi'],
    Ta_RPJM_Tujuan: ['ID_Tujuan'],
    Ta_RPJM_Sasaran: ['ID_Sasaran'],
    Ta_RPJM_Kegiatan: ['Kd_Keg'],
    Ta_RPJM_Pagu_Tahunan: ['Kd_Keg','Kd_Tahun']
}

const references = ['kegiatan', 'bidang', 'sasaran', 'sumberDana', 'RPJMBidAndKeg']

enum Types { Visi = 0, Misi = 2, Tujuan = 4, Sasaran = 6 };
enum Tables { Ta_RPJM_Visi = 0, Ta_RPJM_Misi = 2, Ta_RPJM_Tujuan = 4, Ta_RPJM_Sasaran = 6 };

var sheetContainer;

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html',
})

export default class PerencanaanComponent {
    siskeudes: any;
    activeSheet: string;
    sheets: any;
    idVisi: string;
    tahunAnggaran: string;
    sub: any;
    rpjmYears: any;
    savingMessage: string;
    messageIsExist: string;
    initialDatasets: any = {};
    hots: any = {};
    activeHot: any;
    isFileMenuShown = false;
    contentSelection: any = {};
    codeKegiatan: string;
    categorySelected: string;
    diffTracker: DiffTracker;
    kdDesa: string;
    refDatas: any = {};
    newBidangs: any[] = [];
    isExist: boolean;
    diffContents: any = {};
    afterSaveAction:string;
    renstraModel:any = {};
    rkpModel: any = {};
    stopLooping: boolean;
    date: Date;

    constructor(private appRef: ApplicationRef, private zone: NgZone, private route: ActivatedRoute, public toastr: ToastsManager, vcr: ViewContainerRef) {
        this.appRef = appRef;
        this.zone = zone;
        this.route = route;
        this.diffTracker = new DiffTracker();
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]);
        this.sheets = ['renstra', 'rpjm', 'rkp1', 'rkp2', 'rkp3', 'rkp4', 'rkp5', 'rkp6'];
        this.activeSheet = 'renstra';
        this.isExist = false;
        this.diffContents = {diff:[],total:0};
        this.toastr.setRootViewContainerRef(vcr);
        this.renstraModel = {};
        this.sub = this.route.queryParams.subscribe(params => {
            this.idVisi = params['id_visi'];
            this.tahunAnggaran = params['first_year'] + '-' + params['last_year'];
            this.kdDesa = params['kd_desa'];
            let me = this;
            
            setTimeout(function() {                
                me.checkAndGetReferences(me.kdDesa);
            }, 500);
            
        });
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
        document.location.href="app.html";
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            document.location.href = "app.html";
        else if (this.afterSaveAction == "quit")
            APP.quit();
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    onResize(event): void {
        let that = this;
        this.activeHot = this.hots[this.activeSheet];
        setTimeout(function () {
            that.activeHot.render()
        }, 200);
    }

    createSheet(sheetContainer, sheet): any {
        let me = this;
        sheet = sheet.match(/[a-z]+/g)[0];

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

        result.addHook("afterChange", (changes, source) => {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                let renderer = false;
                let checkBox = [10, 11, 12, 13, 14, 15, 16, 17, 18];

                if(me.stopLooping){
                    me.stopLooping = false;
                    return
                }
                
                changes.forEach(item => {
                    let row = item[0];
                    let col = item[1];
                    let prevValue = item[2];
                    let value = item[3];

                    if (me.activeSheet == 'rpjm' && checkBox.indexOf(col) !== -1)
                        renderer = true;
                    if (col == 13 && me.activeSheet.startsWith('rkp') || col == 14 && me.activeSheet.startsWith('rkp')){
                        let dataRow = result.getDataAtRow(row);
                        let mulai = moment(dataRow[13], "DD-MM-YYYY").format();
                        let selesai = moment(dataRow[14], "DD-MM-YYYY").format();

                        if(mulai > selesai){
                            me.toastr.error('Tanggal Mulai Tidak Boleh Melebihi Tanggal Selesai!','');
                            me.stopLooping = true; 
                            result.setDataAtCell(row, col, prevValue);                            
                        }
                        else
                            me.stopLooping = false; 

                    }

                });
            }
        });

        return result;
    }

    ngOnInit() {
        titleBar.title("Data Keuangan - " +dataApi.getActiveAuth()['desa_name']);
        titleBar.blue();

        let that = this;

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

        this.getContent('renstra', data => {
            this.activeHot = this.hots.renstra;
            this.activeHot.loadData(data);
            this.initialDatasets['renstra'] = data.map(c => c.slice());
            this.activeSheet = 'renstra';

            setTimeout(function() {
                that.activeHot.render();
            }, 500);
        })
    }
    
    getContent(sheet, callback) {
        let results;
        switch (sheet) {
            case "renstra":
                renstra.currents.map(c => c.value = '');
                this.siskeudes.getRenstraRPJM(this.idVisi, data => {
                    results = this.transformData(data);
                    callback(results);
                });
                break;

            case "rpjm":
                this.siskeudes.getRPJM(this.kdDesa, data => {
                    base64.encode(uuid.v4());
                    results = data.map(o => {
                        let data = schemas.objToArray(o, schemas.rpjm)
                        data[0] = base64.encode(uuid.v4());
                        return data;
                    });
                    callback(results);
                });
                break;

            default:
                let indexRKP = sheet.match(/\d+/g)[0];
                this.siskeudes.getRKPByYear(this.kdDesa, indexRKP, data => {
                    if(data.length < 1){
                        results = [];
                    }
                    else {
                        results = data.map(o => {
                            let data = schemas.objToArray(o, schemas.rkp)
                            data[0] = base64.encode(uuid.v4());
                            return data;
                        });
                    }
                    callback(results);
                });
                break;
        };

    }

    transformData(source): any[] {
        let results = [];
        source.forEach(content => {
            renstra.fields.forEach((field, idx) => {
                let res = [];
                let current = renstra.currents[idx];
                let valueNulled = false;

                for (let i = 0; i < field.length; i++) {
                    let value = content[field[i]]

                    if (!value) {
                        let string = JSON.stringify(value);
                        if (string == 'null') { valueNulled = true; break; }
                    }

                    let data = (content[field[i]]) ? content[field[i]] : field[i];
                    res.push(data)
                }

                if (valueNulled) return;
                if (current.value !== content[current.fieldName]) results.push(res);

                current.value = content[current.fieldName];
            })

        })

        return results;
    }

    applyDataToSheet(sheet) {
        this.getContent(sheet, data => {
            let hot = this.hots[sheet];
            this.initialDatasets[sheet] = data.map(c => c.slice());
            hot.loadData(data);
            
            if(this.activeSheet == sheet){
                setTimeout(function() {
                    hot.render();
                }, 300);
            }
        });        
    }

    saveContent(): void {
        let bundleSchemas = {};
        let bundleData = {};
        let diff = this.getDiffContents();
        let i = 0;
        let isRKPSheet = false;
        $('#modal-save-diff').modal('hide');   

        Object.keys(this.initialDatasets).forEach(sheet => {
            let hot = this.hots[sheet];
            let sourceData = hot.getSourceData();
            let initialDataset = this.initialDatasets[sheet];

            let diffcontent = this.trackDiff(initialDataset, sourceData)

            if (diffcontent.total < 1) return;
            let bundle = this.bundleData(diffcontent, sheet);
            
            this.savingMessage = '';
            dataApi.saveToSiskeudesDB(bundle, sheet, response => {
                let type = Object.keys(response)[0];
                if (response[type].length == 0){
                    this.toastr.success('Penyimpanan '+type.toUpperCase()+' Berhasil!', '');
                    this.applyDataToSheet(type);
                }
                else
                    this.toastr.error('Penyimpanan '+type.toUpperCase()+' Gagal!','');

                i++;

                if(sheet.startsWith('rkp'))
                    isRKPSheet = true;

                if(i === diff.diff.length && isRKPSheet)
                    this.updateSumberDana();
                else 
                    this.afterSave();
            });
        });
    };

    updateSumberDana(): void {
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };
        let results = [];
        this.siskeudes.getSumberDanaPaguTahunan(this.kdDesa, data =>{
            data.forEach(row => {
                let content =  results.find( c => c.Kd_Keg == row.Kd_Keg );

                if(content){
                    let sumberdana = content.Sumberdana; 
                    sumberdana = sumberdana.replace(/\s/g, '');
                    let splitSumberdana = sumberdana.split(',');

                    if(splitSumberdana.indexOf(row.Sumberdana) == -1){
                        let newSumberDana = splitSumberdana.join(', ') + (', ') + row.Kd_Sumber;                        
                        let bundleUpdate = bundleData.update.find(c => c.Ta_RPJM_Kegiatan.whereClause.Kd_Keg == row.Kd_Keg )

                        content.Sumberdana = newSumberDana;
                        bundleUpdate.Ta_RPJM_Kegiatan.data.Sumberdana = newSumberDana;
                    }

                }
                else{
                    let whereClause = {whereClause: {Kd_Keg: row.Kd_Keg},data:{Sumberdana:row.Kd_Sumber}}
                    bundleData.update.push({['Ta_RPJM_Kegiatan']:whereClause});
                    results.push({Kd_Keg:row.Kd_Keg, Sumberdana: row.Kd_Sumber})
                }
            });  

            
            dataApi.saveToSiskeudesDB(bundleData, null, response => {
                this.afterSave();
            });
            
        });
    }

    arrayToObj(arr, schema): any {
        let result = {};
        for (let i = 0; i < schema.length; i++){
            let newValue;
            if(arr[i] == 'true' || arr[i] == 'false')
                newValue = arr[i] == 'true' ? true : false
            else
                newValue = arr[i];

            result[schema[i]] = newValue;
        }

        return result;
    }

    bundleData(bundleDiff, type): any {
        let sheet = type.match(/[a-z]+/g)[0];
        let extendCol = {Kd_Desa:this.kdDesa}
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };

        switch(sheet) {
            case "renstra":
                bundleDiff.added.forEach(content => {
                    let result = this.bundleArrToObj(content);

                    Object.assign(result.data,extendCol);
                    bundleData.insert.push({[result.table]:result.data});
                });

                bundleDiff.modified.forEach(content => {
                    let res= {whereClause:{},data:{}}
                    let results = this.bundleArrToObj(content);
                    Object.assign(results.data, extendCol);

                    fieldWhere[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = this.sliceObject(results.data, fieldWhere[results.table]);
                    bundleData.update.push({ [results.table]: res })
                });

                bundleDiff.deleted.forEach(content => {
                    let results = this.bundleArrToObj(content);
                    let res = { whereClause: {}, data: {} };

                    fieldWhere[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = this.sliceObject(results.data, fieldWhere[results.table]);
                    bundleData.delete.push({ [results.table]: res });
                });
                break;
            case "rpjm":
            case "rkp":
                let unique = Array.from(new Set(this.newBidangs));
                let table =  (sheet == 'rpjm') ? 'Ta_RPJM_Kegiatan' : 'Ta_RPJM_Pagu_Tahunan';

                if(sheet =='rkp'){
                    let indexRKP = type.match(/\d+/g);
                    extendCol['Kd_Tahun'] = `THN${indexRKP}`
                }

                if(sheet == 'rpjm'){
                    unique.forEach(c=>{
                        let tableBidang = 'Ta_RPJM_Bidang';
                        let data =  this.refDatas['bidang'].find(o=> o.Kd_Bid == c.substring(this.kdDesa.length));
                        Object.assign(data, extendCol, { Kd_Bid:c });

                        bundleData.insert.push({ [tableBidang]: data });
                    });
                }

                bundleDiff.added.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[sheet]);
                    if(sheet == 'rkp' && !data.Pola_Kegiatan)
                        data.Pola_Kegiatan = "";

                    Object.assign(data, extendCol);
                    bundleData.insert.push({ [table]: data });
                });

                bundleDiff.modified.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[sheet]);
                    let res = { whereClause: {}, data: {} }
                    let ID_Keg = data.Kd_Keg.substring(this.kdDesa.length);

                    if(sheet == 'rpjm' && !data['Keluaran'])
                        data['Keluaran'] = "";
                    
                    if(sheet == 'rkp' && !data.Pola_Kegiatan)
                        data.Pola_Kegiatan = "";

                    Object.assign(data, extendCol, { ID_Keg: ID_Keg })

                    fieldWhere[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = this.sliceObject(data, fieldWhere[table]);
                    bundleData.update.push({ [table]: res });
                });

                bundleDiff.deleted.forEach(content => {
                    let data = schemas.arrayToObj(content, schemas[sheet]);
                    let res = { whereClause: {}, data: {} };

                    fieldWhere[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = this.sliceObject(data, fieldWhere[table]);
                    bundleData.delete.push({ [table]: res });
                });
                break;
        }

        return bundleData;
    }

    bundleArrToObj(content): any {
        let result = {};
        let code = content[0].substring(this.idVisi.length);
        let table = Tables[code.length];
        let field = renstra.fields.find(c => c[1] == content[1])
        let data = this.arrayToObj(content.slice(0, field.length), field);
        let codes = this.parsingCode(content[0]);

        Object.assign(data, codes);

        return { table: table, data: data }

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

    parsingCode(codeSource): any {
        let fields = ['ID_Visi', 'ID_Misi', 'ID_Tujuan', 'ID_Sasaran'];
        let code = codeSource.substring(this.idVisi.length);
        let type = Types[code.length];

        let posField = fields.indexOf('ID_' + type)
        let results = {};

        fields.slice(posField - 1, posField).forEach(field => {
            let endSlice = Types[field.split('_')[1]]
            results[field] = this.idVisi + code.slice(0, parseInt(endSlice))
        });

        results['No_' + type] = (type == 'Visi') ? this.idVisi.substring(this.kdDesa.length).slice(0, -1) : code.slice(-2);
        return results;
    }


    addRow(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let lastRow;
        let position = 0;
        let data = {}
        let content = []
        let sourceData = this.activeHot.getSourceData();
        $("#form-add-" + sheet).serializeArray().map(c => { data[c.name] = c.value });

        if (this.isExist)
            return;

        switch (sheet) {
            case 'renstra':
                let lastCode;
                if (data['category'] == 'Misi') {
                    let sourDataFiltered = sourceData.filter(c => {
                        if (c[0].replace(this.idVisi, '').length == 2) return c;
                    });

                    lastCode = sourDataFiltered[sourDataFiltered.length - 1][0];
                    position = sourceData.length;
                }

                if (data['category'] != 'Misi') {
                    let code = ((data['category'] == 'Tujuan') ? data['Misi'] : data['Tujuan']).replace(this.idVisi, '');

                    sourceData.forEach((content,i) =>{
                        let value = content[0].replace(this.idVisi, '');

                        if (value.length == code.length + 2 && value.startsWith(code))
                            lastCode = content[0];

                        if (value.startsWith(code))
                            position = i + 1;
                    });

                    if (!lastCode) lastCode = (data['category'] == 'Tujuan') ? data['Misi'] + '00' : data['Tujuan'] + '00';
                }

                let newDigits = ("0" + (parseInt(lastCode.slice(-2)) + 1)).slice(-2);
                let newCode = lastCode.slice(0, -2) + newDigits;

                content = [newCode, data['category'], data['uraian']];
                break;

            case 'rpjm':
            case 'rkp':
                let sourceObj = sourceData.map(a => schemas.arrayToObj(a, schemas[sheet]));
                let isNewBidang = true;

                sourceObj.forEach((content, i) => {
                    if (data['Kd_Bid'] == content.Kd_Bid)
                        isNewBidang = false;

                    if (data['Kd_Keg'] > content.Kd_Keg)
                        position = position + 1;
                });

                if (isNewBidang && sheet == 'rpjm')
                    this.newBidangs.push(data['Kd_Bid']);

                let res = this.completedRow(data, sheet);

                content = schemas.objToArray(res, schemas[sheet]);
                break;
        }

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length, null, 'overwrite');

        let endColumn =  (this.activeSheet == 'renstra') ? 3 : 6;
        this.activeHot.selectCell(position, 0, position, endColumn, true, true);
    }

    completedRow(obj, type): any {
        let values = { Tahun1:false, Tahun2:false, Tahun3:false,Tahun4:false,Tahun5:false, Tahun6:false, Swakelola:false, Kerjasama:false, Pihak_Ketiga:false};

        if(type == 'rpjm') {
            Object.keys(values).forEach(c=>{
                if(obj[c] == 'on') {
                    obj[c] = true;
                    return;
                }
                obj[c] = values[c];
            });

             
            obj['Uraian_Sasaran'] = this.refDatas['sasaran'].find(c => c.ID_Sasaran == obj.Kd_Sas).Uraian_Sasaran;
            obj['Nama_Kegiatan'] = this.refDatas['kegiatan'].find(c => c.ID_Keg == obj.Kd_Keg.substring(this.kdDesa.length)).Nama_Kegiatan;
            obj['Nama_Bidang'] = this.refDatas['bidang'].find(c => c.Kd_Bid == obj.Kd_Bid.substring(this.kdDesa.length)).Nama_Bidang;            
        }
        else {
            obj['Nama_Kegiatan'] = this.refDatas['rpjmKegiatan'].find(c => c.Kd_Keg == obj.Kd_Keg).Nama_Kegiatan;
            obj['Nama_Bidang'] = this.refDatas['rpjmBidang'].find(c => c.Kd_Bid == obj.Kd_Bid).Nama_Bidang;
        }

        obj['id'] = base64.encode(uuid.v4());

        return obj
    }

    openAddRowDialog(): void {
        this.resetForm();

        let type = this.activeSheet.match(/[a-z]+/g)[0];
        let selected = this.activeHot.getSelected();
        let category = 'Misi';

        if(type !== 'renstra'){
            this.zone.run(() => {
                $("#modal-add-" + type).modal("show");
            });
            return
        }

        if (selected) {
            let data = this.activeHot.getDataAtRow(selected[0]);
            let code = data[0].replace(this.idVisi, '');
            let current = renstra.currents.find(c => c.lengthId == code.length + 2);

            if (!current) current = renstra.currents.find(c => c.lengthId == 6);
            category = current.fieldName.split('_')[1];
        }

        this.zone.run(() => {
            this.categorySelected = category;
            $("#modal-add-" + type).modal("show");
            $('input[name=category][value=' + category + ']').checked = true;
        });

        if (category !== 'Misi') this.categoryOnChange(category);

    }

    openSaveDialog() {
        let that = this;
        this.diffContents = this.getDiffContents();
        
        if(this.diffContents.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff").modal("show");
            setTimeout(() => {
                that.hots[that.activeSheet].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
        else{
            this.toastr.warning('Tidak ada data yang berubah', '');
        }      
    }

    addOneRow(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let data = {};
        $("#form-add-" + sheet).serializeArray().map(c => { data[c.name] = c.value });

             
        if(sheet == 'rpjm' && this.isExist || sheet == 'rkp' && this.isExist){
             this.toastr.error('Kegiatan Ini Sudah Pernah Ditambahkan (*)', '');
             return
        }

        let isFilled = this.validateForm(data); 
        if(isFilled){
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)', '')
        }
        else {
            if(sheet == 'rkp'){
                if(this.validateDate()){
                    this.toastr.error('Pastikan Tanggal Mulai Tidak Melebihi Tanggal Selesai!', '')
                }
                else {
                    this.addRow();
                    $("#modal-add-" + sheet).modal("hide");
                    $('#form-add-' + sheet)[0].reset(); 
                }
            }
            else{
                this.addRow();
                $("#modal-add-" + sheet).modal("hide");
                $('#form-add-' + sheet)[0].reset();     
            } 
                       
        }
    }

    addOneRowAndAnother(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let data = {};
        $("#form-add-" + sheet).serializeArray().map(c => { data[c.name] = c.value });
        let category = this.categorySelected;

        if(sheet == 'rpjm' && this.isExist || sheet == 'rkp' && this.isExist){
             this.toastr.error('Kegiatan Ini Sudah Pernah Ditambahkan', '');
             return
        }

        let isFilled = this.validateForm(data);
        if(isFilled){
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)', '')
        }
        else {
            if(sheet == 'rkp'){
                if(this.validateDate()){
                    this.toastr.error('Pastikan Tanggal Mulai Tidak Melebihi Tanggal Selesai!', '')
                }
                else {
                    this.addRow();
                    this.categoryOnChange(this.categorySelected);
                }
            }
            else{
                this.addRow();
                this.categoryOnChange(this.categorySelected);     
            }       
        }
    }

    categoryOnChange(value): void {
        if(this.activeSheet == 'renstra'){
            let sourceData = this.activeHot.getSourceData();
            this.categorySelected = value;

            this.contentSelection['contentMisi'] = sourceData.filter(c => {
                let code = c[0].replace(this.idVisi, '');
                if (code.length == 2) return c;
            });

            if(value == 'Sasaran'){
                this.renstraModel.Tujuan = null;
                if(this.renstraModel.Misi != null || this.renstraModel.Misi){
                    this.contentSelection['contentTujuan'] = sourceData.filter(c => {
                        let code = c[0].replace(this.idVisi, '');
                        if (code.length == 4 && c[0].startsWith(this.renstraModel.Misi)) return c;
                    });
                }
            }
        }

    }

    selectedOnChange(selector, value): void {
        let type = this.activeSheet.match(/[a-z]+/g)[0];
        let sourceData = this.activeHot.getSourceData();
        let content;

        switch (selector) {
            case 'misi':
                this.contentSelection['contentTujuan'] = [];
                sourceData.forEach(data => {
                    let code = data[0].replace(this.idVisi, '');

                    if(code.length == 4 && data[0].startsWith(value))
                        this.contentSelection['contentTujuan'].push(data);
                })
                break;
            case 'bidangRPJM':
                value = value.substring(this.kdDesa.length);
                content = this.refDatas['kegiatan'];

                this.contentSelection['kegiatan'] = content.filter(c => c.Kd_Bid == value);
                break;
            case 'bidangRKP':
                value = value.substring(this.kdDesa.length);
                content = this.refDatas['rpjmKegiatan'];

                this.contentSelection['kegiatan'] = content.filter(c => c.Kd_Bid == value);
                break;
        }
    }

    checkAndGetReferences(kdDesa){
        references.forEach( c=> {
            if(c == 'RPJMBidAndKeg'){
                if(!this.refDatas['rpjmBidang'] || !this.refDatas['rpjmKegiatan'])
                    this.getReferences(kdDesa,c) 
                
                else if (this.refDatas['rpjmBidang'].length < 1 || this.refDatas['rpjmKegiatan'].length < 1)
                    this.getReferences(kdDesa,c) 
                
                return
            }

            if(!this.refDatas[c] || this.refDatas[c].length < 1 ){
                this.getReferences(kdDesa,c)               
            }
        })
    }

    getReferences(kdDesa, type): void {
        switch(type){
            case 'kegiatan':
                this.siskeudes.getRefKegiatan(data => {
                    this.refDatas['kegiatan'] = data;
                })
                break
            case 'bidang':
                this.siskeudes.getRefBidang(data => {
                    this.refDatas['bidang'] = data;
                })
                break;
            case 'sasaran':
                this.siskeudes.getAllSasaranRenstra(kdDesa, data => {
                    this.refDatas['sasaran'] = data;
                })
                break;
            case 'sumberDana':
                this.siskeudes.getRefSumberDana(data=> {
                    this.refDatas["sumberDana"] = data;
                })       
                break; 
            case 'RPJMBidAndKeg':
                this.siskeudes.getRPJMBidAndKeg(kdDesa, data => {
                    let contentBid = [];
                    let contentKegiatan = [];

                    data.forEach(content => {
                        let values = { Kd_Bid: content.Kd_Bid, Nama_Bidang: content.Nama_Bidang }

                        if (!contentBid.find(c => c.Kd_Bid == content.Kd_Bid ))
                            contentBid.push(values);

                        let bidangCode = content.Kd_Bid.substring(kdDesa.length);
                        contentKegiatan.push ({ Kd_Keg: content.Kd_Keg, Nama_Kegiatan:content.Nama_Kegiatan, Kd_Bid:bidangCode })

                    });

                    this.refDatas['rpjmBidang'] = contentBid
                    this.refDatas['rpjmKegiatan'] = contentKegiatan;
                });
                break;
        }
    }

    selectTab(type): void {
        let that = this;
        this.isExist = false;
        this.activeSheet = type;
        this.activeHot = this.hots[type];
        let sourceData = this.activeHot.getSourceData();

        if(type !== 'renstra'){
            this.checkAndGetReferences(this.kdDesa)
        }

        if (sourceData.length < 1)
            this.applyDataToSheet(type);
            
        else {
            setTimeout(function () {
                that.activeHot.render();
            }, 500);
        }
    }

    trackDiff(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    getDiffContents(): any {
        let res = {diff:[],total:0};
        Object.keys(this.initialDatasets).forEach(sheet => {
            let sourceData = this.hots[sheet].getSourceData();
            let initialData = this.initialDatasets[sheet];
            let diffcontent = this.diffTracker.trackDiff(initialData, sourceData);

            if(diffcontent.total > 0){
                res.diff.push({data: diffcontent,sheet:[sheet]})
                res.total += diffcontent.total;
            }
        })
        return res;
    }

    validateForm(data):boolean {
        let result = false;
        let category = this.categorySelected;

        if(this.activeSheet == 'renstra'){
            let requiredColumn = {Tujuan:['Misi'], Sasaran:['Misi','Tujuan']}
            if(category == 'Misi')
                return false;
            
            for(let i = 0;i < requiredColumn[category].length; i++){
                let col = requiredColumn[category][i];

                if(data[col] == '' || !data[col] || data[col] == 'null'){
                    result = true;
                    break; 
                }
            }
            return result
        }
        else if(this.activeSheet == 'rpjm'){
             let requiredColumn = ['Kd_Bid','Kd_Keg','Kd_Sas'];

             for(let i = 0; i < requiredColumn.length; i++){
                 if(data[requiredColumn[i]] == '' || !data[requiredColumn[i]] || data[requiredColumn[i]] == 'null'){
                     result = true; 
                    break;
                 }
             }
             return result;
        }
        else if(this.activeSheet.startsWith('rkp')){
            let requiredColumn = ['Kd_Bid','Kd_Keg', 'Kd_Sumber', 'Mulai', 'Selesai'];

            for(let i = 0; i < requiredColumn.length; i++){
                 if(data[requiredColumn[i]] == '' || !data[requiredColumn[i]] || data[requiredColumn[i]] == 'null'){
                     result = true; 
                    break;
                 }
             }
             return result;
        }
    }

    validateIsExist(value, message, schemasType): void {
        let sourceData: any[] = this.activeHot.getSourceData().map(a => schemas.arrayToObj(a, schemas[schemasType]));
        this.messageIsExist = message;

        if(sourceData.length < 1)
            this.isExist = false;

        for (let i = 0; i < sourceData.length; i++) {
            if (sourceData[i].Kd_Keg == value) {
                this.zone.run(() => {
                    this.isExist = true;
                })
                break;
            }
            this.isExist = false;
        }
    }

    validateDate(){
        if(this.rkpModel.Mulai != "" && this.rkpModel.Selesai != ""){
            let mulai = moment(this.rkpModel.Mulai, "DD-MM-YYYY").format();
            let selesai = moment(this.rkpModel.Selesai, "DD-MM-YYYY").format();

            if(mulai > selesai)
                return true;
            return false
        }
    }

    resetForm(){
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        $('#form-add-' + sheet)[0].reset();       
        this.isExist = false;
    }
}

