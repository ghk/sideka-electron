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
    fieldName: ['Kd_Rincian', 'Nama_Obyek', '', 'Sumberdana', 'Nilai']
}, {
    category: 'pengeluaran',
    lengthCode: 2,
    fieldName: ['No_Bukti', 'Keterangan_Bukti', 'Tgl_Bukti', '', 'Nilai_SPP_Bukti', 'Nm_Penerima', 'Alamat', 'Nm_Bank', 'Rek_Bank', 'NPWP']
}, {
    category: 'potongan',
    lengthCode: 3,
    fieldName: ['Kd_Potongan', 'Nama_Obyek', '', '', 'Nilai_SPPPot']
}];

const CURRENTS = [{
    category: 'rincian',
    fieldName: 'Kd_Rincian',
    value: '',
    code: ''
}, {
    category: 'pengeluaran',
    fieldName: 'No_Bukti',
    value: '',
    code: ''
}, {
    category: 'potongan',
    fieldName: 'Kd_Potongan',
    value: '',
    code: ''
}];

const FIELD_WHERE = {
    Ta_SPPRinci: ['Kd_Desa', 'No_SPP', 'Kd_Keg', 'Kd_Rincian'],
    Ta_SPPBukti: ['Kd_Desa', 'No_Bukti'],
    Ta_SPPPot: ['Kd_Desa', 'No_SPP', 'No_Bukti', 'Kd_Rincian']
}

const POTONGAN_DESCS = [{ code: '7.1.1.01.', value: 'PPN' }, { code: '7.1.1.02.', value: 'PPh Pasal 21' }, { code: '7.1.1.03.', value: 'PPh Pasal 22' }, { code: '7.1.1.04.', value: 'PPh Pasal 23' }]
enum Types { rincian = 1, pengeluaran = 2, potongan = 3 }

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
    savingMessage: string;
    hots: any = {};
    categorySelected: string;
    contentSelection: any = {};
    potonganDesc: string;
    evidenceNumber: string;
    kdDesa: string;
    year: string;
    isExist: boolean;
    message: string;
    refDatasets: any = {};
    kdKegiatan: string;
    noSPP: string;
    initialData: any;
    diffTracker: DiffTracker;

    constructor(private appRef: ApplicationRef, private zone: NgZone, private route: ActivatedRoute) {
        this.appRef = appRef;
        this.zone = zone;
        this.route = route;
        this.isExist = false;
        this.kdKegiatan = "";
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]);
        this.diffTracker = new DiffTracker();
        this.sub = this.route.queryParams.subscribe(params => {
            this.noSPP = params['no_spp'];
            this.kdDesa = params['kd_desa'];
            this.year = params['tahun'];
            this.getReferences();
        });
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
        result.addHook("beforeRemoveRow", (index, amount) => {
            console.log(index);
        });

        return result;
    }

    onResize(event) {
        setTimeout(function () {
            this.hot.render()
        }, 200);
    }

    ngOnInit() {
        titleBar.blue("SPP - " + dataApi.getActiveAuth()['desa_name']);
        $('#datePicker').datepicker({ dateFormat: 'dd-mm-yy' })
        let that = this;

        let sheetContainer = document.getElementById("sheet");
        this.hot = this.initSheet(sheetContainer);

        this.siskeudes.getDetailSPP(this.noSPP, data => {
            let results = [];
            data.forEach(content => {
                let temp = [];
                FIELDS.forEach((item, idx) => {
                    let res = [];
                    let current = CURRENTS.filter(c => c.category == item.category)[0];
                    let code = this.generateNewCode(current, idx, content);

                    if (content[current.fieldName] || content[current.fieldName] !== null) {
                        res.push(code.full_code);

                        for (let i = 0; i < item.fieldName.length; i++) {
                            let contentPush = (item.fieldName[i] == '') ? '' : content[item.fieldName[i]];

                            if (item.fieldName[i] == 'Nilai' && current.category == 'rincian') continue;

                            res.push(contentPush);
                        }

                        if (current.value != content[current.fieldName]) {
                            if (CURRENTS[idx + 1]) CURRENTS[idx + 1].code = '';
                            current.code = code.single_code;
                            temp.push(res);
                        };
                        current.value = content[current.fieldName];
                    }
                });
                temp.map(c => results.push(c))
            });
            this.initialData = results.map(c => c.slice())

            this.hot.loadData(results);
            this.hot.sumCounter.calculateAll();

            setTimeout(function () {
                this.hot.render();
            }, 200);
        });
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
        let extendCol = { Kd_Desa: this.kdDesa, No_SPP: this.noSPP, Tahun: this.year, Kd_Keg: this.kdKegiatan }
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
        let selected = this.hot.getSelected();
        let category = 'rincian';
        let sourceData = this.hot.getSourceData();

        if (selected) {
            let data = this.hot.getDataAtRow(selected[0]);
            let dotCount = data[0].split('.').length;

            (dotCount == 3) ? category = Types[3] : category = Types[dotCount + 1];
        }

        this.categorySelected = category;
        $("#modal-add").modal("show");
        $('input[name=category][value=' + category + ']').checked = true;

        (sourceData.length < 1 || category != 'rincian') ? this.categoryOnChange(category) : this.getCodeAndChangeSelection();
    }

    addRow() {
        let position = 0;
        let results = [];
        let data = {};
        let that = this;
        let currentCode, lastCode, kode_rekening;
        let sourceData = this.hot.getSourceData().map(a => schemas.arrayToObj(a, schemas.spp));
        let currentField = FIELDS.filter(c => c.category == this.categorySelected).map(c => c.fieldName)[0];

        $("#form-add").serializeArray().map(c => { data[c.name] = c.value });

        if (this.isExist)
            return;

        switch (this.categorySelected) {
            case 'rincian':
                let rincian = sourceData.filter(c => c.kode_rekening.split('.').length == Types.rincian);

                lastCode = rincian[rincian.length - 1].kode_rekening;
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
            that.hot.render()
        }, 300);
    }

    addOneRow(): void {
        this.addRow();
        $("#modal-add").modal("hide");
        $('#form-add')[0].reset();

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
                let sourceData = this.hot.getSourceData();
                let rincian = sourceData.filter(c => c[0].split('.').length == Types.rincian);

                this.contentSelection['availableRincian'] = rincian;
                this.evidenceNumber = '00000/KWT/' + this.kdDesa + this.year;
                break;
            }
        }
    }

    getCodeAndChangeSelection(): void {
        let sourceData = this.hot.getSourceData();
        let row = sourceData.filter(c => c[0].split('.').length == Types.rincian)[0];
        let code = row[1];

        this.siskeudes.getKegiatanByCodeRinci(code, data => {
            this.kdKegiatan = data[0].Kd_Keg;
            this.selectedOnChange(this.kdKegiatan);
        });
    }

    selectedOnChange(value): void {
        switch (this.categorySelected) {
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
                for (let i = 0; i < sourceData.length; i++) {
                    let dotCount = sourceData[i][0].split('.').length;

                    if (dotCount == Types.rincian)
                        currentCode = sourceData[i][1];

                    if (currentCode == value && dotCount != Types.rincian && dotCount != Types.potongan)
                        results.push(sourceData[i]);
                }
                this.contentSelection['availablePengeluaran'] = results;
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

        this.siskeudes.getAllKegiatan(this.kdDesa, data => {
            this.refDatasets["allKegiatan"] = data;
        })
    }

    generateNewCode(current, currentIndex, source) {
        let results = { single_code: '', full_code: '' }
        if (current.code == '') current.code = '0';

        results.single_code = (current.value == source[current.fieldName]) ? current.code : (parseInt(current.code) + 1).toString();

        for (let i = 0; i < currentIndex + 1; i++) {
            let code = (CURRENTS[i].value == source[CURRENTS[i].fieldName]) ? CURRENTS[i].code : (parseInt(CURRENTS[i].code) + 1).toString();
            results.full_code += ((currentIndex - i) == 0) ? code : code + '.';
        }
        return results;
    }

}
