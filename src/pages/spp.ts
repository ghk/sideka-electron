import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";

import { Siskeudes } from '../stores/siskeudes';
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';

import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import { Diff, DiffTracker } from "../helpers/diffTracker";
import titleBar from '../helpers/titleBar';

import { Component, ApplicationRef, NgZone, HostListener } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

var $ = require('jquery');
var path = require("path");
var jetpack = require("fs-jetpack");
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

window['jQuery'] = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');
require('jquery-ui-bundle');

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");

const FIELDS = [{
    category: 'rincian',
    lengthCode: 1,
    fieldName: ['Kd_Rincian', 'Nama_Obyek', '', 'Sumberdana', 'Nilai'],
    currents: { fieldName: 'Kd_Rincian',  value: '', code: '' }
}, {
    category: 'pengeluaran',
    lengthCode: 2,
    fieldName: ['No_Bukti', 'Keterangan_Bukti', 'Tgl_Bukti', '', 'Nilai_SPP_Bukti', 'Nm_Penerima', 'Alamat', 'Nm_Bank', 'Rek_Bank', 'NPWP'],
    currents: { fieldName: 'No_Bukti',  value: '', code: ''}
}, {
    category: 'potongan',
    lengthCode: 3,
    fieldName: ['Kd_Potongan', 'Nama_Obyek', '', '', 'Nilai_SPPPot'],
    currents: { fieldName: 'Kd_Potongan',  value: '', code: '' }
}];

const FIELD_WHERE = {
    Ta_SPPRinci: ['Kd_Desa', 'No_SPP', 'Kd_Keg', 'Kd_Rincian'],
    Ta_SPPBukti: ['Kd_Desa', 'No_Bukti'],
    Ta_SPPPot: ['Kd_Desa', 'No_SPP', 'No_Bukti', 'Kd_Rincian']
}

const POTONGAN_DESCS = [{ code: '7.1.1.01.', value: 'PPN' }, { code: '7.1.1.02.', value: 'PPh Pasal 21' }, { code: '7.1.1.03.', value: 'PPh Pasal 22' }, { code: '7.1.1.04.', value: 'PPh Pasal 23' }]
const JENIS_SPP = { UM: 'Panjar', LS: 'Definitif', PBY: 'Pembiayaan' }

var sheetContainer;

@Component({
    selector: 'spp',
    templateUrl: 'templates/spp.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

export default class SppComponent {
    hot: any;
    siskeudes: any;
    sub: any;
    hots: any = {};
    contentSelection: any = {};
    potonganDesc: string;
    isExist: boolean;
    message: string;
    refDatasets: any = {};
    kdKegiatan: string;
    initialData: any;
    diffTracker: DiffTracker;
    afterSaveAction: string;
    isDetailSPPEmpty: boolean;
    isEmptyPosting: boolean;
    contentPosting: any[] = [];
    SPP: any = {};
    model: any= {};

    constructor(private appRef: ApplicationRef, private zone: NgZone, private route: ActivatedRoute) {
        this.appRef = appRef;
        this.zone = zone;
        this.route = route;
        this.isExist = false;
        this.kdKegiatan = "";
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]);
        this.diffTracker = new DiffTracker();        
    }

    redirectMain(): void {
        this.hot.sumCounter.calculateAll();
        this.afterSaveAction = 'home';

        document.location.href = "app.html";
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

    initSheet(sheetContainer) {
        let me = this;
        let config = {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.spp),
            columns: schemas.spp,

            colWidths: schemas.getColWidths(schemas.spp),
            rowHeights: 23,

            columnSorting: true,
            sortIndicator: true,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        }
        let result = new Handsontable(sheetContainer, config);
        result.sumCounter = new SumCounter(result, 'spp');

        result.addHook('afterChange', function (changes, source) {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;
                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if (col == 5) {
                        rerender = true;
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

    onResize(event) {
        setTimeout(function () {
            this.hot.render()
        }, 200);
    }

    ngOnInit() {        
        let sheetContainer = document.getElementById("sheet");

        this.hot = this.initSheet(sheetContainer);
        this.sub = this.route.queryParams.subscribe(params => {
            titleBar.blue(`SPP ${JENIS_SPP[params['jenis_spp']] } -`  + dataApi.getActiveAuth()['desa_name']);

            this.SPP['noSPP'] = params['no_spp'];
            this.SPP['kdDesa'] = params['kd_desa'];
            this.SPP['tahun'] = params['tahun'];
            this.SPP['jenisSPP'] = params['jenis_spp'];
            this.getContent();
        });
    }

    getContent(){
        let me = this;

        this.siskeudes.getPostingLog(this.SPP.kdDesa, data => {
            this.contentPosting = data;

            this.siskeudes.getDetailSPP(this.SPP.noSPP, detail => {
                if(detail.length !== 0){
                    let results = this.transformData(detail);

                    this.initialData = results.map(c => c.slice())
                    this.hot.loadData(results);
                }                
                this.getReferences();

                setTimeout(function () {
                    me.hot.render();
                }, 200);
            })
        })  
    }

    transformData(data){
        let results = [];
         data.forEach(content => {
            let temp = [];

            FIELDS.forEach((item, idx) => {
                let res = [];
                let current = item.currents;

                if (content[current.fieldName] || content[current.fieldName] !== null) {

                    for (let i = 0; i < item.fieldName.length; i++) {
                        let contentPush = (item.fieldName[i] == '') ? '' : content[item.fieldName[i]];

                        if (item.fieldName[i] == 'Nilai'){
                            if(item.category == 'rincian' && this.SPP.jenisSPP !== 'UM')
                                continue;
                        }

                        res.push(contentPush);
                    }

                    if (current.value != content[current.fieldName]) {
                        if(FIELDS[idx + 1]) 
                            FIELDS[idx + 1].currents.code = '';

                        temp.push(res);
                    };
                    current.value = content[current.fieldName];
                }
            });
            temp.map(c => results.push(c))
        });
            
        return results;
    }

    saveContent() {
        let bundleSchemas = {};
        let bundleData = {};
        let me = this;
        let bundleName = 'perencanaan';

        let sourceData = this.getSourceDataWithSums();
        let initialDataset = this.initialData;

        let diffcontent = this.trackDiff(initialDataset, sourceData);

        if (diffcontent.total < 1) return;
        let bundle = this.bundleData(diffcontent);

        dataApi.saveToSiskeudesDB(bundle, null, response => {
        });
    };

    trackDiff(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    bundleData(bundleDiff): any {
        let tables = ['Ta_RPJM_Misi', 'Ta_RPJM_Tujuan', 'Ta_RPJM_Sasaran'];
        let extendCol = { Kd_Desa: this.SPP.kdDesa, No_SPP: this.SPP.noSPP, Tahun: this.SPP.year, Kd_Keg: this.kdKegiatan }
        let bundleData = {
            insert: [],
            update: [],
            deleted: []
        };

        bundleDiff.added.forEach(content => {
            let result = this.bundleArrToObj(content);

            Object.assign(result.data, extendCol)
            bundleData.insert.push({ [result.table]: result.data })
        });

        bundleDiff.modified.forEach(content => {
            let results = this.bundleArrToObj(content);
            let res = { whereClause: {}, data: {} }

            FIELD_WHERE[results.table].forEach(c => {
                res.whereClause[c] = results.data[c];
            });

            res.data = this.sliceObject(results.data, FIELD_WHERE[results.table]);
            bundleData.update.push({ [results.table]: res })
        });

        return bundleData;
    }

    bundleArrToObj(content) {
        enum Tables { Ta_SPPRinci = 1, Ta_SPPBukti = 2, Ta_SPPPot = 3 };

        let result = {};
        let dotCount = content[0].split('.').length;
        let field = FIELDS.find(c => c.lengthCode == dotCount).fieldName;
        let data = this.arrayToObj(content, field);

        return { table: Tables[dotCount], data: data }
    }

    parsingCode(code) {
        let sourceData = this.hot.getSourceData();
        let codes = code.split('.');
        let res = {}
        enum Id { No_Bukti = 2, Kd_Rincian = 3 }

        for (let i = 0; i < sourceData.length; i++) {
            let codes = sourceData[i][0];
            let dotCount = code.split('.').length;
            let data = schemas.arrayToObj(sourceData[i], schemas.spp)

            if (codes == 2)
                res['No_Bukti'] = sourceData[i];
        }

    }

    sliceObject(obj, values) {
        let res = {};
        let keys = Object.keys(obj);

        for (let i = 0; i < keys.length; i++) {
            if (values.indexOf(keys[i]) !== -1) continue;
            res[keys[i]] = obj[keys[i]]
        }
        return res;
    }

    arrayToObj(arr, schema) {
        let result = {};
        for (var i = 0; i < schema.length; i++) {
            if (schema[i] == '') continue;
            result[schema[i]] = arr[i + 1];
        }

        return result;
    }

    getSourceDataWithSums(): any {
        let x = new SumCounter(this.hot, 'spp')
        let rows: any[] = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let sums = {};
        let data;

        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            if (row.kode_rekening && !sums[row.kode_rekening])
                row.anggaran = x.getValue(row, i, rows);
        }

        return rows.map(o => schemas.objToArray(o, schemas.spp));
    }

    openAddRowDialog() {
        this.setDefaultValue();

        let selected = this.hot.getSelected();
        let category = 'rincian';
        let sourceData = this.hot.getSourceData();

        if (selected && this.SPP.jenisSPP !== 'UM') {
            let data = this.hot.getDataAtRow(selected[0]);
            let dotCount = data[0].split('.').length;
            let code = data[0];

            if(code.startsWith('5.') && dotCount == 4)
                category = 'pengeluaran';
            else
                category = 'potongan';
        }

        this.model.category = category;
        $("#modal-add").modal("show");

        (sourceData.length < 1 || category != 'rincian') ? this.categoryOnChange(category) : this.getCodeAndChangeSelection();
    }

    addRow() {
        let position = 0;
        let results = [];
        let data = this.model;
        let that = this;
        let currentCode, lastCode;
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let currentField = FIELDS.filter(c => c.category == this.model.category).map(c => c.fieldName)[0];
         
        /*
        if (this.isExist)
            return;

        switch (this.model.category) {
            case 'rincian':
                let rincian = sourceData.filter(c => {
                    let dotCount = (c.code.slice(-1) == '.') ? c.code.length - 1 : c.code.length;

                    if(dotCount == 4 && c.code.startsWith('5.'))
                        return c;
                });

                lastCode = rincian[rincian.length - 1].code;
                data = this.refDatasets.rincianRAB.filter(c => c.Kd_Rincian == data['Kd_Rincian'])[0];
                position = sourceData.length;

                break;

            case 'pengeluaran':
                for (let i = 0; i < sourceData.length; i++) {
                    let lengthCode = sourceData[i].kode_rekening.split('.').length;

                    if (lengthCode == 1)
                        currentCode = sourceData[i].no;

                    if (currentCode == data['Kd_Rincian']) {
                        position = i + 1;

                        if (lengthCode != Types.potongan)
                            kode_rekening = sourceData[i].kode_rekening;

                        if (lengthCode == Types.pengeluaran)
                            lastCode = sourceData[i].kode_rekening;
                    }
                }
                break;

            case 'potongan':
                for (let i = 0; i < sourceData.length; i++) {
                    let lengthCode = sourceData[i].kode_rekening.split('.').length;

                    if (lengthCode == 2)
                        currentCode = sourceData[i].no;

                    if (currentCode == data['Bukti_Pengeluaran']) {
                        position = i + 1;
                        kode_rekening = sourceData[i].kode_rekening;

                        if (lengthCode == Types.potongan)
                            lastCode = sourceData[i].kode_rekening;
                    }
                }

                let currentPotongan = this.refDatasets.potongan.filter(c => c.Kd_Potongan == data['Kd_Potongan'])[0]
                data['Nama_Obyek'] = currentPotongan.Nama_Obyek;

                break;

        }

        if (!lastCode)
            lastCode = kode_rekening + '.0';

        let codes = lastCode.split('.');
        let newDigits = parseInt(codes[codes.length - 1]) + 1;

        codes.splice(codes.length - 1, 1, newDigits.toString())
        results.push(codes.join('.'));

        for (let i = 0; i < currentField.length; i++) {
            let value = (data[currentField[i]]) ? data[currentField[i]] : '';
            results.push(value);
        }

        this.hot.alter("insert_row", position);
        this.hot.populateFromArray(position, 0, [results], position, currentField.length, null, 'overwrite');
        setTimeout(function () {
            that.hot.sumCounter.calculateAll();
            that.hot.render();
        }, 300);

        */
    }

    addOneRow(): void {
        this.addRow();
        $("#modal-add").modal("hide");
    }

    addOneRowAndAnother(): void {
        this.addRow();
    }

    categoryOnChange(value): void {
        this.isExist = false;
        switch (value) {
            case 'rincian': {
                let sourceData = this.hot.getSourceData();
                if (sourceData.length >= 1) {
                    this.getCodeAndChangeSelection();
                    break;
                }

                this.kdKegiatan = '';
                this.contentSelection['allKegiatan'] = this.refDatasets["allKegiatan"];
                break;
            }
            case 'pengeluaran':
            case 'potongan': {
                let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
                let rincian = sourceData.filter(c => {
                    let dotCount = (c.code.slice(-1) == '.') ? c.code.length - 1 : c.code.length;

                    if(dotCount == 4 && c.code.startsWith('5.'))
                        return c;
                });

                this.contentSelection['availableRincian'] = rincian;
                this.model.No_Bukti = '00000/KWT/' + this.SPP.kdDesa + this.SPP.year;
                break;
            }
        }
    }

    getCodeAndChangeSelection(): void {
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let row = sourceData.filter(c => {
            let dotCount = (c.code.slice(-1) == '.') ? c.code.length - 1 : c.code.length;

            if(dotCount == 4 && c.code.startsWith('5.'))
                return c;
        });
        let code = row[0];

        this.siskeudes.getKegiatanByCodeRinci(code, data => {
            this.kdKegiatan = data[0].Kd_Keg;
            this.selectedOnChange(this.kdKegiatan);
        });
    }

    selectedOnChange(value): void {
        switch (this.model.category) {
            case 'rincian':
                this.siskeudes.getSisaAnggaranRAB(value, data => {
                    this.refDatasets["rincianRAB"] = data;
                    this.contentSelection["rincianRAB"] = data;
                });
                break;

            case 'potongan':
                let sourceData = this.hot.getSourceData();
                let currentCode = '';
                let results = [];

                /*
                for (let i = 0; i < sourceData.length; i++) {
                    let dotCount = sourceData[i][0].split('.').length;

                    if (dotCount == Types.rincian)
                        currentCode = sourceData[i][1];

                    if (currentCode == value && dotCount != Types.rincian && dotCount != Types.potongan)
                        results.push(sourceData[i]);
                }
                this.contentSelection['availablePengeluaran'] = results;
                */
                break;
        }
    }

    checkIsExist(value, message) {
        this.message = message;
        let sourceData = this.hot.getSourceData();
        for (let i = 0; i < sourceData.length; i++) {
            if (sourceData[i][1] == value) {
                this.isExist = true;
                break;
            }
            this.isExist = false;
        }
    }

    taxOnChange(value) {
        this.checkIsExist(value, 'Potongan');
        let res = POTONGAN_DESCS.filter(c => c.code == value)[0];
        (!res) ? this.potonganDesc = '' : this.potonganDesc = res.value;
    }

    getReferences(): void {
        this.siskeudes.getRefPotongan(data => {
            this.refDatasets["potongan"] = data;
        })

        this.siskeudes.getAllKegiatan(this.SPP.kdDesa, data => {
            this.refDatasets["allKegiatan"] = data;
        })
    }

    setDefaultValue(){
        this.model = {};        
    }

    /*
    generateNewCode(current, currentIndex, source) {
        let results = { single_code: '', full_code: '' }
        if (current.code == '') current.code = '0';

        results.single_code = (current.value == source[current.fieldName]) ? current.code : (parseInt(current.code) + 1).toString();

        for (let i = 0; i < currentIndex + 1; i++) {
            let code = (FIELDS[i].currents.value == source[FIELDS[i].currents.fieldName]) ? FIELDS[i].currents.code : (parseInt(FIELDS[i].currents.code) + 1).toString();
            results.full_code += ((currentIndex - i) == 0) ? code : code + '.';
        }
        return results;
    }
    */

}
