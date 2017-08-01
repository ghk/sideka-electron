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

const FIELDS = [{
        name: "penerimaan",
        fields:[
            ['No_Bukti','Uraian','','','Tgl_Bukti','Nama_Penyetor','Alamat_Penyetor','TTD_Penyetor','NoRek_Bank','Nama_Bank'],['Kd_Rincian','Nama_Obyek','Nilai','SumberDana']
        ],
        current: { fieldName: 'No_Bukti', value: '' }
    },{
        name: "penyetoran",
        fields:[
            ['No_Bukti','Uraian','','','Tgl_Bukti','NoRek_Bank','Nama_Bank'],['No_TBP','Uraian_Rinci','Nilai']
        ],
        current: { fieldName: 'No_Bukti', value: '' }
    }]

@Component({
    selector: 'penerimaan',
    templateUrl: 'templates/penerimaan.html',
})

export default class PenerimaanComponent {
    activeSheet: string;
    sheets: any;

    idVisi: string;
    rpjmYears: any;
    kdDesa: string;
    tahunAnggaran: string;

    messageIsExist: string;
    isExist: boolean;

    initialDatasets: any = {};
    hots: any = {};
    activeHot: any;

    contentSelection: any = {};
    refDatas: any = {};
    newBidangs: any[] = [];

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

        this.getContent('penerimaanTunai', data => {
            this.activeHot = this.hots.penerimaanTunai;
            this.activeHot.loadData(data);            
            this.initialDatasets['penerimaanTunai'] = data.map(c => c.slice());
            this.activeSheet = 'penerimaanTunai';

            setTimeout(function () {
                me.activeHot.sumCounter.calculateAll();
                me.activeHot.render();                
            }, 500);
        });
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
        result.addHook("afterChange", (changes, source) => {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                let renderer = false;
                let checkBox = [10, 11, 12, 13, 14, 15, 16, 17, 18];

                if (me.stopLooping) {
                    me.stopLooping = false;
                    return
                }

                changes.forEach(item => {
                });
            }
        });

        return result;
    }

    transformData(source): any[] {
        let results = [];
        let currentFields = (this.activeSheet != 'penyetoran') ? 
            FIELDS.find(c => c.name == 'penerimaan'):        
            FIELDS.find(c => c.name == 'penyetoran');

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

            this.siskeudesService.saveToSiskeudesDB(bundle, sheet, response => {
                let type = Object.keys(response)[0];
                if (response[type].length == 0) {
                    this.toastr.success('Penyimpanan ' + type.toUpperCase() + ' Berhasil!', '');
                    this.loadDataToSheet(type);
                }
                else
                    this.toastr.error('Penyimpanan ' + type.toUpperCase() + ' Gagal!', '');

                i++;

                if (sheet.startsWith('rkp'))
                    isRKPSheet = true;
                
            });
        });
    };


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
        let sheet = type.match(/[a-z]+/g)[0];
        let extendCol = { Kd_Desa: this.kdDesa }
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };

        switch (sheet) {
        }

        return bundleData;
    }

    bundleArrToObj(content): any {
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
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let lastRow;
        let me = this;
        let position = 0;
        let data = this.valueNormalized(this.model);
        let content = []
        let sourceData = this.activeHot.getSourceData();

        if (this.isExist)
            return;

        switch (sheet) {
            case 'renstra':
                let lastCode;
                if (data['category'] == 'Misi') {
                    let sourDataFiltered = sourceData.filter(c => {
                        if (c[0].replace(this.idVisi, '').length == 2) return c;
                    });
                    if(sourDataFiltered.length !== 0)
                        lastCode = sourDataFiltered[sourDataFiltered.length - 1][0];
                    else 
                        lastCode = this.idVisi + '00';
                    position = sourceData.length;
                }

                if (data['category'] != 'Misi') {
                    let code = ((data['category'] == 'Tujuan') ? data['Misi'] : data['Tujuan']).replace(this.idVisi, '');

                    sourceData.forEach((content, i) => {
                        let value = content[0].replace(this.idVisi, '');

                        if (value.length == code.length + 2 && value.startsWith(code))
                            lastCode = content[0];

                        if (value.startsWith(code))
                            position = i + 1;
                    });

                    if (!lastCode){
                        lastCode = (data['category'] == 'Tujuan') ? data['Misi'] + '00' 
                        : (data['category'] == 'Misi') ? '00' 
                        :  data['Tujuan'] + '00';
                    }
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

                break;
        }

        this.activeHot.alter("insert_row", position);
        this.activeHot.populateFromArray(position, 0, [content], position, content.length, null, 'overwrite');

        let endColumn = (this.activeSheet == 'renstra') ? 2 : 6;
        this.activeHot.selectCell(position, 0, position, endColumn, null, null);
    }


    openAddRowDialog(): void {        
        this.model = {};        
        this.model.category = 'TBP';
        this.getNoTBPOrSTS();
        $("#modal-add-penerimaan").modal("show");
    }

    getNoTBPOrSTS(): void {
        if(this.activeSheet != 'penyetoran'){
            this.siskeudesService.getMaxNoTBP(data => {
                if(data.length == 0){

                }
                else
                    this.model.No_Bukti = this.getNextNumber(data[0].No_Bukti);                
            })
        }
        else{
            this.siskeudesService.getMaxNoSTS(data => {
                if(data.length == 0){

                }
                else
                    this.model.No_Bukti = this.getNextNumber(data[0].No_Bukti);                
            })
        }   
    }
    
    getNextNumber(code){
        let pad = '0000';
        let splitCode = code.split('/');
        let lastNumber = splitCode[0];
        let newNumber = (parseInt(lastNumber)+1).toString();
        let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
        let result = stringNum + '/' + splitCode.slice(1).join('/');  
        return result;
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
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let data = {};
        $("#form-add-" + sheet).serializeArray().map(c => { data[c.name] = c.value });

        if (sheet == 'rpjm' && this.isExist || sheet == 'rkp' && this.isExist) {
            this.toastr.error('Kegiatan Ini Sudah Pernah Ditambahkan', '');
            return
        }

        let isFilled = this.validateForm(data);
        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)', '')
        }
        else {
            if (sheet == 'rkp') {
                if (this.validateDate()) {
                    this.toastr.error('Pastikan Tanggal Mulai Tidak Melebihi Tanggal Selesai!', '')
                }
                else {
                    this.addRow();
                    $("#modal-add-" + sheet).modal("hide");
                    $('#form-add-' + sheet)[0].reset();
                }
            }
            else {
                this.addRow();
                $("#modal-add-" + sheet).modal("hide");
                $('#form-add-' + sheet)[0].reset();
            }

        }
    }

    addOneRowAndAnother(): void {
        let sheet = this.activeSheet.match(/[a-z]+/g)[0];
        let category = this.model.category;
        
    }

    categoryOnChange(value): void {
        this.model = {};
        this.getNoTBPOrSTS();
        this.setDefaultvalue();
        this.model.category = value;
    }

    selectedOnChange(selector, value): void {

    }

    getReferences(kdDesa, type): void {
        switch (type) {
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

        if (this.activeSheet == 'renstra') {
            let requiredColumn = { Tujuan: ['Misi'], Sasaran: ['Misi', 'Tujuan'] }
            if (category == 'Misi')
                return false;

            for (let i = 0; i < requiredColumn[category].length; i++) {
                let col = requiredColumn[category][i];

                if (data[col] == '' || !data[col] || data[col] == 'null') {
                    result = true;
                    break;
                }
            }
            return result
        }
        else if (this.activeSheet == 'rpjm') {
            let requiredColumn = ['Kd_Bid', 'Kd_Keg'];

            for (let i = 0; i < requiredColumn.length; i++) {
                if (data[requiredColumn[i]] == '' || !data[requiredColumn[i]] || data[requiredColumn[i]] == 'null') {
                    result = true;
                    break;
                }
            }
            return result;
        }
        else if (this.activeSheet.startsWith('rkp')) {
            let requiredColumn = ['Kd_Bid', 'Kd_Keg', 'Kd_Sumber', 'Mulai', 'Selesai'];

            for (let i = 0; i < requiredColumn.length; i++) {
                if (data[requiredColumn[i]] == '' || !data[requiredColumn[i]] || data[requiredColumn[i]] == 'null') {
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

        if (sourceData.length < 1)
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

    validateDate() {
        if (this.model.Mulai != "" && this.model.Selesai != "") {
            let mulai = moment(this.model.Mulai, "YYYY-MM-DD").format("DD/MM/YYYY");
            let selesai = moment(this.model.Selesai, "YYYY-MM-DD").format("DD/MM/YYYY");

            if (mulai > selesai)
                return true;
            return false
        }
    }

    valueNormalized(model): any {
        if (this.model.Mulai != "" && this.model.Selesai != "") {
            if (this.model.Mulai != null && this.model.Selesai != null) {
                this.model.Mulai = moment(this.model.Mulai, "YYYY-MM-DD").format("DD/MM/YYYY");
                this.model.Selesai = moment(this.model.Selesai, "YYYY-MM-DD").format("DD/MM/YYYY");
            }
        }

        Object.keys(model).forEach(val => {
            if (model[val] == null || model[val] === undefined)
                model[val] = '';
        })
        return model;
    }
}