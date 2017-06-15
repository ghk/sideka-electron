import { remote, app as remoteApp, shell } from "electron";
import { Component, ApplicationRef, NgZone, HostListener } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import * as fs from "fs";
import * as uuid from 'uuid';

import { Siskeudes } from '../stores/siskeudes';
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';

import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import diffProps from '../helpers/diff';
import { Diff, DiffTracker } from "../helpers/diffTracker";

var $ = require('jquery');
var path = require("path");
var jetpack = require("fs-jetpack");
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
var base64 = require("uuid-base64");

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");

const ACCOUNT = [{ nama_akun: 'pendapatan', akun: '4.' }, { nama_akun: 'belanja', akun: '5.' }, { nama_akun: 'pembiayaan', akun: '6.' }];
const CATEGORIES = [
    {
        name: 'pendapatan',
        code: '4.',
        fields: [
            ['', 'Akun', '', 'Nama_Akun'], ['', 'Kelompok', '', 'Nama_Kelompok'], ['', 'Jenis', '', 'Nama_Jenis'], ['', 'Obyek', '', 'Nama_Obyek'],
            ['', 'Obyek_Rincian', '', 'Uraian', 'SumberDana', 'JmlSatuan', 'Satuan', 'HrgSatuan', 'Anggaran', 'JmlSatuanPAK', 'Satuan', 'HrgSatuan', 'AnggaranStlhPAK', 'Perubahan']
        ],
        currents: [{ fieldName: 'Akun', value: '' }, { fieldName: 'Kelompok', value: '' }, { fieldName: 'Jenis', value: '' }, { fieldName: 'Obyek', value: '' }]
    }, {
        name: "belanja",
        code: '5.',
        fields: [
            ['', 'Akun', '', 'Nama_Akun'], ['', '', 'Kd_Bid', 'Nama_Bidang'], ['', '', 'Kd_Keg', 'Nama_Kegiatan'], ['Kd_Keg', 'Jenis', '', 'Nama_Jenis'], ['Kd_Keg', 'Obyek', '', 'Nama_Obyek'],
            ['Kd_Keg', 'Kode_Rincian', '', 'Uraian', 'SumberDana', 'JmlSatuan', 'Satuan', 'HrgSatuan', 'Anggaran', 'JmlSatuanPAK', 'Satuan', 'HrgSatuan', 'AnggaranStlhPAK', 'Perubahan']
        ],
        currents: [{ fieldName: 'Akun', value: '' }, { fieldName: 'Kd_Bid', value: '' }, { fieldName: 'Kd_Keg', value: '' }, { fieldName: 'Jenis', value: '' }, { fieldName: 'Obyek', value: '' }]
    }, {
        name: 'pembiayaan',
        code: '6.',
        fields: [
            ['', 'Akun', '', 'Nama_Akun'], ['', 'Kelompok', '', 'Nama_Kelompok'], ['', 'Jenis', '', 'Nama_Jenis'], ['', 'Obyek', '', 'Nama_Obyek'],
            ['', 'Obyek_Rincian', '', 'Uraian', 'SumberDana', 'JmlSatuan', 'Satuan', 'HrgSatuan', 'Anggaran', 'JmlSatuanPAK', 'Satuan', 'HrgSatuan', 'AnggaranStlhPAK', 'Perubahan']
        ],
        currents: [{ fieldName: 'Akun', value: '' }, { fieldName: 'Kelompok', value: '' }, { fieldName: 'Jenis', value: '' }, { fieldName: 'Obyek', value: '' }]
    }];

const SHOW_COLUMNS = [
    ["Id", "Kd_Keg", "JmlSatuanPAK", "HrgSatuanPAK", "AnggaranStlhPAK"],
    ["Id", "Kd_Keg", "JmlSatuan", "HrgSatuan", "Anggaran"]
]

const SPLICE_ARRAY = function (fields, showColumns) {
    let result = [];
    for (let i = 0; i != fields.length; i++) {
        var index = showColumns.indexOf(fields[i]);
        if (index != -1) result.push(i);
    }
    return result;
};

const FIELD_WHERE = {
    Ta_RAB: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian'],
    Ta_RABSub: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci'],
    Ta_RABRinci: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci', 'No_Urut']
}

enum TypesBelanja { Kelompok = 2, Jenis = 3, Obyek = 4 }

var sheetContainer;

@Component({
    selector: 'apbdes',
    templateUrl: 'templates/rab.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})
export default class RabComponent {
    hot: any;
    siskeudes: any;
    activeType: any;
    sub: any;
    year: string;
    tableSearcher: any;
    kodeDesa: string;
    categorySelected: string;
    rapSelected: string;
    rabSelected: string;
    refDatasets: any = {};
    contentSelection: any = {};
    isExist: boolean;
    messageIsExist: string;
    kegiatanSelected: string;
    isObyekRABSub: boolean;
    taDesa: any = {};
    resultBefore: any;
    initialDatas: any;
    diffTracker: DiffTracker;
    status: string;

    constructor(private appRef: ApplicationRef, private zone: NgZone, private route: ActivatedRoute) {
        this.appRef = appRef;
        this.zone = zone;
        this.route = route;
        this.isExist = false;
        this.isObyekRABSub = false;
        this.kegiatanSelected = '';
        this.resultBefore = [];
        this.initialDatas = [];
        this.diffTracker = new DiffTracker();
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]);
    }

    onResize(event) {
        let that = this;
        setTimeout(function () {
            that.hot.render()
        }, 200);
    }

    createSheet(sheetContainer) {
        let me = this;
        let config = {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.rab),
            columns: schemas.rab,

            colWidths: schemas.getColWidths(schemas.rab),
            rowHeights: 23,

            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {
                columns: schemas.rab.map((c, i) => { return (c.hiddenColumn == true) ? i : '' }).filter(c => c !== ''),
                indicators: true
            },

            renderAllRows: false,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        }
        let result = new Handsontable(sheetContainer, config);

        result.sumCounter = new SumCounter(result, 'rab');

        result.addHook('afterChange', function (changes, source) {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;
                var indexAnggaran = [6, 8, 10, 12];

                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if (indexAnggaran.indexOf(col) !== -1) {
                        if (col == 6 && me.status == 'AWAL')
                            result.setDataAtCell(row, 10, value)

                        rerender = true;
                    }
                    if (col == 7 && me.status == 'AWAL') {
                        result.setDataAtCell(row, 11, value)
                    }
                    if (col == 11 && me.status == 'PAK') {
                        result.setDataAtCell(row, 7, value)
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

    ngOnInit() {
        let that = this;
        let elementId = "sheet";
        let sheetContainer = document.getElementById(elementId);
        let inputSearch = document.getElementById("input-search");

        this.hot = this.createSheet(sheetContainer);
        this.tableSearcher = initializeTableSearch(this.hot, document, inputSearch, null);

        this.sub = this.route.queryParams.subscribe(params => {
            this.year = params['year'];
            this.kodeDesa = params['kd_desa'];
            this.getReferences(this.kodeDesa);

            this.siskeudes.getTaDesa(this.kodeDesa, data => {
                this.taDesa = data[0];
                this.status = this.taDesa.Status;
                //this.statusOnChange(this.status);                          
            });

            this.siskeudes.getRAB(this.year, this.kodeDesa, data => {
                let results = this.transformData(data);
                this.hot.loadData(results);

                this.hot.sumCounter.calculateAll();

                setTimeout(function () {
                    that.initialDatas = that.getSourceDataWithSums();
                    that.hot.render();
                }, 500);
            });
        })
    }

    getSourceDataWithSums() {
        let data = this.hot.sumCounter.dataBundles.map(c => schemas.objToArray(c, schemas.rab));
        return data
    }

    transformData(data): any[] {
        let results = [];
        let oldKdKegiatan = '';
        let currentSubRinci = '';

        data.forEach(content => {
            let category = CATEGORIES.find(c => c.code == content.Akun);
            let fields = category.fields.slice();
            let currents = category.currents.slice();
            if (content.Kd_Keg == '07.01.01.01.' && content.Kd_Rincian == '5.1.1.03.')
                console.log(content);

            if (content.Jenis == '5.1.3.') {
                fields.splice(5, 0, ['Kd_Keg', 'Kode_SubRinci', '', 'Nama_SubRinci'])
                currents.splice(5, 0, { fieldName: 'Kode_SubRinci', value: '' })
            }

            fields.forEach((field, idx) => {
                let res = [];
                let current = currents[idx];

                res.push(base64.encode(uuid.v4()))

                for (let i = 0; i < field.length; i++) {
                    let data = (content[field[i]]) ? content[field[i]] : '';

                    if (field[i] == 'Anggaran' || field[i] == 'AnggaranStlhPAK')
                        data = null;

                    res.push(data)
                }

                if (!current) {
                    if (res[4] != '')
                        results.push(res);
                    return;
                }

                if (current.value !== content[current.fieldName]) {
                    let lengthCode = content[current.fieldName].slice(-1) == '.' ? content[current.fieldName].split('.').length - 1 : content[current.fieldName].split('.').length;

                    if (content[current.fieldName].startsWith('5.1.3') && lengthCode == 5) {
                        if (currentSubRinci !== content.Kode_SubRinci)
                            results.push(res);
                        currentSubRinci = content[current.fieldName];
                    }
                    else
                        results.push(res);
                }

                current.value = content[current.fieldName];

                if (current.fieldName == "Kd_Keg") {
                    if (oldKdKegiatan != '' && oldKdKegiatan !== current.value) {
                        currents.filter(c => c.fieldName == 'Jenis' || c.fieldName == 'Obyek').map(c => { c.value = '' });
                        currentSubRinci = '';
                    }

                    oldKdKegiatan = current.value;
                }
            })
        });

        return results;
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    saveContent() {
        let bundleSchemas = {};
        let bundleData = {};
        let me = this;
        this.hot.sumCounter.calculateAll();

        let sourceData = this.getSourceDataWithSums();
        let diffcontent = this.trackDiff(this.initialDatas, sourceData)
        let bundle = this.bundleData(diffcontent);

        dataApi.saveToSiskeudesDB(bundle, null, response => {
            console.log(response)
        });
    }

    bundleData(bundleDiff) {
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        };
        bundleDiff.added.forEach(row => {
            let content = schemas.arrayToObj(row, schemas.rab);

            if (!content.Kode_Rekening || content.Kode_Rekening == '')
                return;

            let dotCount = content.Kode_Rekening.slice(-1) == '.' ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;

            if (dotCount < 4)
                return;

            let data: any[] = this.parsingCode(content, dotCount, 'add');

            if (!data || data.length < 1)
                return;

            data.forEach(item => {
                bundleData.insert.push({ [item.table]: item.data })
            });

        });

        bundleDiff.modified.forEach(row => {
            let content = schemas.arrayToObj(row, schemas.rab);

            if (!content.Kode_Rekening || content.Kode_Rekening == '')
                return;

            let dotCount = content.Kode_Rekening.slice(-1) == '.' ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;

            if (dotCount < 4)
                return;

            let data: any[] = this.parsingCode(content, dotCount, 'modified');

            if (!data || data.length < 1)
                return;

            data.forEach(item => {
                let res = { whereClause: {}, data: {} }

                FIELD_WHERE[item.table].forEach(c => {
                    res.whereClause[c] = item.data[c];
                });
                res.data = this.sliceObject(item.data, FIELD_WHERE[item.table])

                bundleData.update.push({ [item.table]: res })

            });

        });

        bundleDiff.deleted.forEach(row => {
            let content = schemas.arrayToObj(row, schemas.rab);

            if (!content.Kode_Rekening || content.Kode_Rekening == '')
                return;

            let dotCount = content.Kode_Rekening.slice(-1) == '.' ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;

            if (dotCount < 4)
                return;

            let data: any[] = this.parsingCode(content, dotCount, 'delete');

            if (!data || data.length < 1)
                return;

            data.forEach(item => {
                let res = { whereClause: {}, data: {} }

                FIELD_WHERE[item.table].forEach(c => {
                    res.whereClause[c] = item.data[c];
                });
                res.data = this.sliceObject(item.data, FIELD_WHERE[item.table])
                bundleData.delete.push({ [item.table]: res });
            });

        });

        return bundleData;
    }

    parsingCode(content, dotCount, action): any {
        let extendValues = { Kd_Desa: this.kodeDesa, Tahun: this.year };
        let Kode_Rekening = (content.Kode_Rekening.slice(-1) == '.') ? content.Kode_Rekening.slice(0, 1) : content.Kode_Rekening;
        let fields = ['Anggaran', 'AnggaranStlhPAK', 'AnggaranPAK'];
        let isNotBelanja = (content.Kode_Rekening.startsWith('4') || content.Kode_Rekening.startsWith('6'))

        if (dotCount == 4) {
            let result = Object.assign({}, extendValues)
            let table = 'Ta_RAB';
            result['Kd_Rincian'] = content.Kode_Rekening;

            if (isNotBelanja)
                result['Kd_Keg'] = this.kodeDesa + '00.00.'
            else
                result['Kd_Keg'] = content.Kd_Keg;

            for (let i = 0; i < fields.length; i++) {
                result[fields[i]] = content[fields[i]]
            }

            return [{ table: table, data: result }];
        }

        if (dotCount == 5 && !content.Kode_Rekening.startsWith('5.1.3')) {
            let results = [];
            let result = Object.assign({}, extendValues, content);
            let table = 'Ta_RABRinci';

            result['Kd_Rincian'] = Kode_Rekening.split('.').slice(0, 4).join('.') + '.';
            result['No_Urut'] = Kode_Rekening.split('.')[4];
            result['Kd_SubRinci'] = '01';

            if (isNotBelanja)
                result['Kd_Keg'] = this.kodeDesa + '00.00.'
            else
                result['Kd_Keg'] = content.Kd_Keg;

            if (result['No_Urut'] == '01' && action == 'add' && !isNotBelanja || action == 'modified' && !isNotBelanja) {
                let table = 'Ta_RABSub';
                let newSubRinci = Object.assign({}, { Kd_SubRinci: '01', Kd_Rincian: result['Kd_Rincian'], Kd_Keg: content.Kd_Keg }, extendValues);

                let fields = { awal: 'Anggaran', PAK: 'AnggaranStlhPAK', perubahan: 'AnggaranPAK' }
                let property = (!content.Kd_Keg || content.Kd_Keg == '') ? result['Kd_Rincian'] : content.Kd_Keg + '_' + result['Kd_Rincian'];
                let anggaran = this.hot.sumCounter.sums;
                let category = ACCOUNT.find(c => result['Kd_Rincian'].startsWith(c.akun) == true).nama_akun;

                newSubRinci['Nama_SubRinci'] = this.refDatasets[category]['Obyek'].find(c => c[1] == result['Kd_Rincian'])[3];

                Object.keys(fields).forEach(item => {
                    newSubRinci[fields[item]] = anggaran[item][property];
                });

                results.push({ table: table, data: newSubRinci });
            }

            results.push({ table: table, data: result });
            return results;
        }

        if (content.Kode_Rekening.startsWith('5.1.3')) {
            let table = dotCount == 5 ? 'Ta_RABSub' : 'Ta_RABRinci';
            let result = Object.assign({}, extendValues, content)

            result['Kd_Rincian'] = Kode_Rekening.split('.').slice(0, 4).join('.') + '.';
            result['Kd_SubRinci'] = Kode_Rekening.split('.')[4];

            if (dotCount == 5)
                result['Nama_SubRinci'] = Kode_Rekening.Uraian;
            else
                result['No_Urut'] = Kode_Rekening.split('.')[5];

            return [{ table: table, data: result }]
        }

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

    trackDiff(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    checkAnggaranPendapatan() {

    }

    openAddRowDialog(): void {
        this.isExist = false;
        this.rapSelected = 'rap';
        
        let selected = this.hot.getSelected();
        let category = 'pendapatan';
        let sourceData = this.hot.getSourceData();

        if (selected) {
            let data = this.hot.getDataAtRow(selected[1]);
            let currentCategory = CATEGORIES.find(c => c.code.slice(0, 2) == data[1].slice(0, 2));
        }

        this.categorySelected = category;
        $('#modal-add').modal('show');
        $('input[name=category][value=' + category + ']').checked = true;

        this.categoryOnClick(category);

    }

    addRow(): void {
        let me = this;
        let position = 0;
        let data = {};
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let contents = [];
        $("#form-add").serializeArray().map(c => { data[c.name] = c.value });

        let currents = { Kelompok: '', Jenis: '', Obyek: '', Kd_Bid: '', Kd_Keg: '' }
        let positions = { Kelompok: 0, Jenis: 0, Obyek: 0, Kd_Keg: 0 }
        let types = ['Kelompok', 'Jenis', 'Obyek'];
        let currentKdKegiatan = '', oldKdKegiatan = '', isSmaller = false;
        let same = [];

        if (this.isExist)
            return;

        if (this.rapSelected == 'rapRinci' || this.rabSelected == 'rabRinci') {
            let lastCode = data['Obyek'].slice(-1) == '.' ? data['Obyek'] + '00' : data['Obyek'] + '.00';

            for (let i = 0; i < sourceData.length; i++) {
                let content = sourceData[i];
                let dotCount = (content.Kode_Rekening.slice(-1) == '.') ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;
                let dotCountBid = (content.Kd_Bid_Or_Keg.slice(-1) == '.') ? content.Kd_Bid_Or_Keg.split('.').length - 1 : content.Kd_Bid_Or_Keg.split('.').length;

                if (this.categorySelected == 'pendapatan' || this.categorySelected == 'pembiayaan') {
                    if (content.Kode_Rekening.startsWith(data['Obyek'])) {
                        position = i + 1;
                        lastCode = dotCount == 5 ? content.Kode_Rekening : data['Obyek'] + '00';
                    }
                }
                else {
                    if (dotCountBid == 4)
                        currentKdKegiatan = content.Kd_Bid_Or_Keg;

                    if (currentKdKegiatan !== data['Kd_Keg']) continue;
                    if (content.Kode_Rekening == '' || !content.Kode_Rekening.startsWith('5.')) continue;

                    if (content.Kode_Rekening.startsWith(data['Obyek'])) {
                        position = i + 1;
                        let dotCountCompare = data['Obyek'].startsWith('5.1.3') ? 6 : 5;

                        if (content.Kode_Rekening && dotCount == dotCountCompare)
                            lastCode = content.Kode_Rekening;
                    }
                }

            }

            let results = [];
            let fields = CATEGORIES.find(c => c.name == this.categorySelected).fields;
            let property = this.categorySelected == 'belanja' ? 'Kode_Rincian' : 'Obyek_Rincian';
            let splitLastCode = lastCode.slice(-1) == '.' ? lastCode.slice(0, -1).split('.') : lastCode.split('.');
            let digits = splitLastCode[splitLastCode.length - 1];

            data['JmlSatuanPAK'] = data['JmlSatuan'];
            data['HrgSatuanPAK'] = data['HrgSatuan'];

            if (me.status == 'PAK') {
                data['JmlSatuan'] = 0;
                data['HrgSatuan'] = 0;
            }

            data[property] = splitLastCode.slice(0, splitLastCode.length - 1).join('.') + '.' + ("0" + (parseInt(digits) + 1)).slice(-2);
            fields[fields.length - 1].forEach(c => {
                let value = (data[c]) ? data[c] : "";
                results.push(value)
            });

            contents.push(results);
        }

        else if (this.rabSelected == 'rabSub' && this.categorySelected == 'belanja') {
            let lastCode = data['Obyek'] + '00';

            for (let i = 0; i < sourceData.length; i++) {
                let content = sourceData[i];
                let dotCountBid = (content.Kd_Bid_Or_Keg.slice(-1) == '.') ? content.Kd_Bid_Or_Keg.split('.').length - 1 : content.Kd_Bid_Or_Keg.split('.').length;
                let dotCount = (content.Kode_Rekening.slice(-1) == '.') ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;

                if (content.Kd_Bid_Or_Keg && dotCountBid == 4)
                    currentKdKegiatan = content.Kd_Bid_Or_Keg;

                if (currentKdKegiatan !== data['Kd_Keg']) continue;
                if (content.Kode_Rekening == '' || !content.Kode_Rekening.startsWith('5.')) continue;

                let isObyek = (data['Obyek'] < content.Kode_Rekening);

                if (isObyek)
                    positions.Obyek = i;
                else
                    positions.Obyek = i + 1;

                if (content.Kode_Rekening.startsWith(data["Obyek"]) && dotCount == 5)
                    lastCode = content.Kode_Rekening;
            }

            let splitLastCode = lastCode.slice(-1) == '.' ? lastCode.slice(0, -1).split('.') : lastCode.split('.');
            let digits = splitLastCode[splitLastCode.length - 1];
            let newCode = splitLastCode.slice(0, splitLastCode.length - 1).join('.') + '.' + ("0" + (parseInt(digits) + 1)).slice(-2);

            position = positions.Obyek;
            contents.push([data['Kd_Keg'], newCode, '', data['Uraian']])
        }

        else {
            for (let i = 0; i < sourceData.length; i++) {
                let content = sourceData[i];
                let dotCount = (content.Kode_Rekening.slice(-1) == '.') ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;

                if (content.Kode_Rekening == '5.' && this.categorySelected == 'pendapatan')
                    break;

                position = i + 1;

                if (this.categorySelected == 'pendapatan' || this.categorySelected == 'pembiayaan') {
                    if (this.categorySelected == 'pembiayaan' && !content.Kode_Rekening.startsWith('6'))
                        continue;

                    if (data['Kelompok'] < content.Kode_Rekening && dotCount == 2)
                        positions.Kelompok = i;

                    let isJenis = (data['Jenis'] < content.Kode_Rekening);
                    let isParent = (content.Kode_Rekening.startsWith(data['Kelompok']));

                    if (isJenis && isParent && dotCount == 3)
                        positions.Jenis = i;

                    if (!isJenis && isParent) {
                        positions.Jenis = i + 1;
                    }

                    let isObyek = (data['Obyek'] > content.Kode_Rekening);
                    isParent = (content.Kode_Rekening.startsWith(data['Jenis']));

                    if (isObyek && isParent) {
                        positions.Obyek = i + 1;
                        isSmaller = true;
                    }

                    if (!isObyek && isParent && !isSmaller)
                        positions.Obyek = i + 1;

                    if (content.Kode_Rekening == data[TypesBelanja[dotCount]])
                        same.push(TypesBelanja[dotCount]);

                }
                else {
                    let dotCountBid = (content.Kd_Bid_Or_Keg.slice(-1) == '.') ? content.Kd_Bid_Or_Keg.split('.').length - 1 : content.Kd_Bid_Or_Keg.split('.').length;

                    if (content.Kd_Bid_Or_Keg && dotCountBid == 4)
                        currentKdKegiatan = content.Kd_Bid_Or_Keg;

                    if (currentKdKegiatan !== data['Kd_Keg']) continue;

                    positions.Kd_Keg = i + 1;

                    if (content.Kode_Rekening == data[TypesBelanja[dotCount]])
                        same.push(TypesBelanja[dotCount]);

                    if (content.Kode_Rekening == '' || !content.Kode_Rekening.startsWith('5.')) continue;

                    let isJenis = (data['Jenis'] < content.Kode_Rekening && dotCount == 3);

                    if (isJenis && dotCount == 3)
                        positions.Jenis = i;

                    if (!isJenis && data['Jenis'] > content.Kode_Rekening)
                        positions.Jenis = i + 1;

                    let isObyek = (data['Obyek'] > content.Kode_Rekening);
                    let isParent = (content.Kode_Rekening.startsWith(data['Jenis']))


                    if (isObyek && isParent) {
                        positions.Obyek = i + 1;
                        isSmaller = true;
                    }

                    if (!isObyek && isParent && !isSmaller)
                        positions.Obyek = i + 1;
                }
            }

            types = (this.categorySelected == 'belanja') ? types.slice(1) : types;
            types.forEach(value => {
                if (same.indexOf(value) !== -1) return;
                let content = this.refDatasets[value].find(c => c[1] == data[value]).slice();

                if (this.categorySelected == 'belanja' && content)
                    content[0] = data['Kd_Keg'];
                content ? contents.push(content) : '';
            });

            if (same.length == 0 && this.categorySelected == 'belanja')
                position = positions.Kd_Keg;

            position = (same.length == 0 && positions[types[0]] == 0) ? position : positions[types[same.length]];
        }

        let start = position, end = 0;
        contents.forEach((content, i) => {
            let newPosition = position + i;
            this.hot.alter("insert_row", newPosition);
            let newContent = content.slice();
            end = newPosition;

            newContent.splice(0, 0, base64.encode(uuid.v4()));
            this.hot.populateFromArray(newPosition, 0, [newContent], newPosition, newContent.length - 1, null, 'overwrite');
        })

        this.hot.selectCell(start, 0, end, 7, true, true);

        setTimeout(function () {
            me.hot.sumCounter.calculateAll();
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

    checkIsExist(value, message) {
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        this.messageIsExist = message;

        if (this.categorySelected == 'belanja' && this.rabSelected != 'rabRinci') {
            let currentKdKegiatan = '';

            for (let i = 0; i < sourceData.length; i++) {
                let codeKeg = sourceData[i].Kd_Bid_Or_Keg;
                let lengthCode = codeKeg.split('.').length - 1;

                if (lengthCode == 4)
                    currentKdKegiatan = codeKeg;

                if (currentKdKegiatan == this.kegiatanSelected) {
                    if (value == sourceData[i].Kode_Rekening) {
                        this.isExist = true;
                        break;
                    }
                }
                this.isExist = false;
            }
            return;
        }

        for (let i = 0; i < sourceData.length; i++) {
            if (sourceData[i].Kode_Rekening == value) {
                this.isExist = true;
                break;
            }
            this.isExist = false;
        }
    }

    categoryOnClick(value): void {
        this.isExist = false;
        this.kegiatanSelected = '';
        switch (value) {
            case "pendapatan":
                this.contentSelection['contentJenis'] = [];
                this.contentSelection['contentObyek'] = [];

                this.rabSelected = 'rab';
                this.rapSelected = 'rap';
                Object.assign(this.refDatasets, this.refDatasets['pendapatan']);
                break;

            case "belanja":
                this.rabSelected = 'rab';
                this.rapSelected = 'rap';
                Object.assign(this.refDatasets, this.refDatasets['belanja']);
                break;

            case "pembiayaan":
                this.contentSelection['contentJenis'] = [];
                this.contentSelection['contentObyek'] = [];

                this.rabSelected = 'rab';
                this.rapSelected = 'rap';
                Object.assign(this.refDatasets, this.refDatasets['pembiayaan']);
                let value = this.refDatasets['Kelompok'].filter(c => c[1] == '6.1.');
                this.refDatasets['Kelompok'] = value;
                break;
        }

    }

    typeOnClick(selector, value): void {
        this.isExist = false;
        this.isObyekRABSub = false;

        switch (selector) {
            case "rap":
                if (value == 'rap')
                    break;

                let code = (this.categorySelected == 'pendapatan') ? '4.' : '6.';
                let sourceData = this.hot.getSourceData();
                let data = sourceData.filter(c => {
                    let lengthCode = c[2].slice(-1) == '.' ? c[2].split('.').length - 1 : c[2].split('.').length;
                    return c[2].startsWith(code) && lengthCode == 4
                });
                this.contentSelection["availableObyek"] = data;
                break;
            case "rab":
                if (this.kegiatanSelected != '' && value == 'rabRinci' || value == 'rabSub') {
                    this.rabSelected = value;
                    this.selectedOnChange('kegiatan', this.kegiatanSelected);
                }
                break;
        }

    }

    selectedOnChange(selector, value) {
        let data = [];
        let results = [];

        switch (this.categorySelected) {
            case "pendapatan":
            case "pembiayaan":
                this.isExist = false;
                let type = (selector == 'Kelompok') ? 'Jenis' : 'Obyek';
                this.contentSelection['content' + type] = [];

                data = this.refDatasets[type];
                results = data.filter(c => c[1].startsWith(value));
                this.contentSelection['content' + type] = results;
                break;

            case "belanja":
                switch (selector) {
                    case "bidang":
                        this.kegiatanSelected = '';
                        this.contentSelection['contentKegiatan'] = [];
                        data = this.refDatasets['Kegiatan'].filter(c => c[2].startsWith(value));
                        this.contentSelection['contentKegiatan'] = data;
                        break;

                    case "kegiatan":
                        this.kegiatanSelected = value;

                        if (this.rabSelected == 'rab')
                            break;

                        this.contentSelection['obyekAvailable'] = [];
                        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                        let contentObyek = [];
                        let currentCodeKeg = '';

                        sourceData.forEach(content => {
                            let lengthCodeKeg = (content.Kd_Bid_Or_Keg.slice(-1) == '.') ? content.Kd_Bid_Or_Keg.split('.').length - 1 : content.Kd_Bid_Or_Keg.split('.').length;
                            let lengthCodeRek = (content.Kode_Rekening.slice(-1) == '.') ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;

                            if (lengthCodeKeg == 4) {
                                currentCodeKeg = content.Kd_Bid_Or_Keg;
                                return;
                            }

                            if (currentCodeKeg == value && lengthCodeRek == 4)
                                contentObyek.push(content);
                        });

                        this.contentSelection['obyekAvailable'] = contentObyek.map(c => schemas.objToArray(c, schemas.rab));
                        break;

                    case "jenis":
                        this.contentSelection['contentObyek'] = [];
                        data = this.refDatasets['belanja']['Obyek'].filter(c => c[1].startsWith(value));
                        this.contentSelection['contentObyek'] = data;
                        break;

                    case "obyek":
                        let codeBelanjaModal = '5.1.3.';
                        let currentKdKegiatan = '';

                        if (value.startsWith(codeBelanjaModal)) {
                            this.isObyekRABSub = true;

                            if (this.rabSelected == "rabSub")
                                break;

                            let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                            let results = [];

                            sourceData.forEach(content => {
                                let code = content.Kode_Rekening;
                                let lengthCodeRek = (code.slice(-1) == '.') ? code.split('.').length - 1 : code.split('.').length;
                                let lengthCodeKeg = (content.Kd_Bid_Or_Keg.slice(-1) == '.') ? content.Kd_Bid_Or_Keg.split('.').length - 1 : content.Kd_Bid_Or_Keg.split('.').length;

                                if (lengthCodeKeg == 4)
                                    currentKdKegiatan = content.Kd_Bid_Or_Keg;

                                if (currentKdKegiatan == this.kegiatanSelected) {
                                    if (code.startsWith(value) && lengthCodeRek == 5)
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

    statusOnChange(value) {
        this.status = value;        
        let that = this;
        let plugin = this.hot.getPlugin('hiddenColumns');
        let fields = schemas.rab.map(c => c.field);
        let index = value == 'AWAL' ? 0 : 1;
        let result = SPLICE_ARRAY(fields, SHOW_COLUMNS[index]);

        plugin.showColumns(this.resultBefore);        
        plugin.hideColumns(result);
        this.resultBefore = result;
        
        setTimeout(() => {
            that.hot.render();
        }, 300)
    }

    refTransformData(data, fields, currents, results) {
        let keys = Object.keys(results)
        currents.map(c => c.value = "");
        data.forEach(content => {
            fields.forEach((field, idx) => {
                let res = [];
                let current = currents[idx];

                for (let i = 0; i < field.length; i++) {
                    let data = (content[field[i]]) ? content[field[i]] : '';
                    res.push(data)
                }

                if (current.value !== content[current.fieldName]) results[keys[idx]].push(res);
                current.value = content[current.fieldName];
            })
        });
        return results;
    }

    getReferences(kdDesa): void {
        CATEGORIES.forEach(content => {
            this.siskeudes.getRefRekByCode(content.code, data => {
                let returnObject = (content.name != 'belanja') ? { Kelompok: [], Jenis: [], Obyek: [] } : { Jenis: [], Obyek: [] };
                let endSlice = (content.name != 'belanja') ? 4 : 5;
                let startSlice = (content.name != 'belanja') ? 1 : 3;
                let fields = content.fields.slice(startSlice, endSlice);
                let currents = content.currents.slice(startSlice, endSlice);
                let results = this.refTransformData(data, fields, currents, returnObject);

                this.refDatasets[content.name] = results;
            })
        });

        this.siskeudes.getRefBidangAndKegiatan(kdDesa, data => {
            let returnObject = { Bidang: [], Kegiatan: [] };
            let fields = CATEGORIES[1].fields.slice(1, 3);
            let currents = CATEGORIES[1].currents.slice(1, 3);
            let results = this.refTransformData(data, fields, currents, returnObject);
            Object.assign(this.refDatasets, results);
        });

        this.siskeudes.getRefSumberDana(data => {
            this.refDatasets["sumberDana"] = data;
        })
    }

    calculateAnggaranSumberdana() {
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
    }
}
