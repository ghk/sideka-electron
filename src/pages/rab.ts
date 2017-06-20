import { remote, app as remoteApp, shell } from "electron";
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';

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
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var path = require("path");
var jetpack = require("fs-jetpack");
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
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
    initialDatas: any;
    diffTracker: DiffTracker;
    status: string;
    afterSaveAction: string;
    diffContents: any = {};
    anggaran: any;
    sumberdana: any;
    anggaranSumberdana: any = {};
    isAnggaranNotEnough: boolean;
    stopLooping: boolean;
    jumlah: number;
    hrgSatuan:number;

    

    constructor(private appRef: ApplicationRef, private zone: NgZone, private route: ActivatedRoute, public toastr: ToastsManager, vcr: ViewContainerRef) {
        this.appRef = appRef;
        this.zone = zone;
        this.route = route;
        this.isExist = false;
        this.isObyekRABSub = false;
        this.kegiatanSelected = '';
        this.initialDatas = [];
        this.toastr.setRootViewContainerRef(vcr);
        this.diffTracker = new DiffTracker();
        this.siskeudes = new Siskeudes(settings.data["siskeudes.path"]);
    }

    onResize(event): void {
        let that = this;
        setTimeout(function () {
            that.hot.render()
        }, 200);
    }

    redirectMain(): void {
        this.hot.sumCounter.calculateAll();
        let sourceData = this.getSourceDataWithSums().map(c => c.slice());
        let diff = this.trackDiff(this.initialDatas, sourceData)
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

    createSheet(sheetContainer): any {
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
            contextMenu: ['undo', 'redo', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        }
        let result = new Handsontable(sheetContainer, config);

        result.sumCounter = new SumCounter(result, 'rab');

        result.addHook('afterChange', function (changes, source) {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;
                var indexAnggaran = [6, 8, 10, 12];
                
                if(me.stopLooping){
                    me.stopLooping = false;
                    return
                }

                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if (indexAnggaran.indexOf(col) !== -1) {
                        if (col == 6 && me.status == 'AWAL')
                            result.setDataAtCell(row, 10, value)

                        if (col ==6 || col == 8 && me.status == 'AWAL'){
                            let rowData = result.getDataAtRow(row);
                            let Kd_Keg = rowData[1];
                            let Kode_Rekening = rowData[2];
                            let sumberDana = rowData[5];

                            if(Kode_Rekening.startsWith('5.')){
                                let anggaran = rowData[6] * rowData[8];
                                let prevAnggaran = result.sumCounter.sums.awal[Kd_Keg+'_'+Kode_Rekening];
                                let sisaAnggaran =  me.anggaranSumberdana.anggaran[sumberDana] - (me.anggaranSumberdana.terpakai[sumberDana]-prevAnggaran);

                                if(anggaran > sisaAnggaran){
                                    me.toastr.error('Pendapatan Untuk Sumberdana '+sumberDana+' Tidak Mencukupi !','');
                                    result.setDataAtCell(row, col, prevValue)
                                    me.stopLooping = true;
                                }
                                else{             
                                    me.calculateAnggaranSumberdana();         
                                    rerender = true;  
                                    me.stopLooping = false;
                                }                                                              
                            }
                        }
                        else{
                            me.calculateAnggaranSumberdana();
                            rerender = true;
                        }                        
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
        titleBar.title("Data Keuangan - " +dataApi.getActiveAuth()['desa_name']);
        titleBar.blue();

        let that = this;
        let elementId = "sheet";
        let sheetContainer = document.getElementById(elementId);
        let inputSearch = document.getElementById("input-search");
        

        window['hot'] = this.hot = this.createSheet(sheetContainer);
        this.tableSearcher = initializeTableSearch(this.hot, document, inputSearch, null);

        this.sub = this.route.queryParams.subscribe(params => {
            this.year = params['year'];
            this.kodeDesa = params['kd_desa'];

            setTimeout(function() {
                  that.getReferences(that.kodeDesa);
            }, 500);

            this.siskeudes.getTaDesa(this.kodeDesa, data => {
                this.taDesa = data[0];
                this.status = this.taDesa.Status;   
                this.setEditor();                                      
            });

            this.getContents(this.year,this.kodeDesa)
        })
    }

    setEditor(): void{
        let setEditor = {AWAL: [6,7,8], PAK: [10,11,12]}    
        let newSetting = schemas.rab.map(c => Object.assign({}, c));
        let valAWAL, valPAK;

        if(this.status == 'PAK'){
            valAWAL = false;
            valPAK = 'text';
        }
        else{
            valAWAL = 'text';
            valPAK = false;
        }
        
        newSetting.map((c, i) => {
            if(setEditor.AWAL.indexOf(i) !== -1)
                c.editor = valAWAL;
            if(setEditor.PAK.indexOf(i) !== -1)
                c.editor = valPAK;
        })

        this.hot.updateSettings({columns: newSetting})
        this.hot.render();
    }

    getSourceDataWithSums(): any[] {
        let data = this.hot.sumCounter.dataBundles.map(c => schemas.objToArray(c, schemas.rab));
        return data
    }

    getContents(year, kodeDesa): void {
        let that = this;

        this.siskeudes.getRAB(year, kodeDesa, data => {
            let results = this.transformData(data);
            this.hot.loadData(results);

            this.hot.sumCounter.calculateAll();
            setTimeout(function () {
                that.initialDatas = that.getSourceDataWithSums().map(c => c.slice());

                that.siskeudes.getRefSumberDana(data => {
                    that.refDatasets["sumberDana"] = data;
                    that.calculateAnggaranSumberdana();
                })
                that.hot.render();
            }, 500);
        });
    }

    transformData(data): any[] {
        let results = [];
        let oldKdKegiatan = '';
        let currentSubRinci = '';

        data.forEach(content => {
            let category = CATEGORIES.find(c => c.code == content.Akun);
            let fields = category.fields.slice();
            let currents = category.currents.slice();

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

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    saveContent() {
        let bundleSchemas = {};
        let bundleData = {};
        this.hot.sumCounter.calculateAll();
        $('#modal-save-diff').modal('hide'); 

        let sourceData = this.getSourceDataWithSums();
        let diffcontent = this.trackDiff(this.initialDatas, sourceData)
        let bundle = this.bundleData(diffcontent);

        dataApi.saveToSiskeudesDB(bundle, null, response => {
            if (response.length == 0){
                this.toastr.success('Penyimpanan Berhasil!', '');

                CATEGORIES.forEach(category =>{
                    category.currents.map(c => c.value = '');
                })

                this.getContents(this.year, this.kodeDesa);
                this.afterSave();
            }
            else
                this.toastr.error('Penyimpanan  Gagal!', '');
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

    checkAnggaran(type, value) {        
        if(this.categorySelected !== 'belanja')
            return;

        if(type == 'anggaran')            
            this.anggaran = (!value) ? 0: value;
        
        if(this.sumberdana){
            let anggaran = this.anggaranSumberdana.anggaran[this.sumberdana];
            let sisaAnggaran = anggaran - this.anggaranSumberdana.terpakai[this.sumberdana];

            if(this.anggaran < sisaAnggaran)
                this.isAnggaranNotEnough = false;
            else    
                this.isAnggaranNotEnough = true;            
        }
        
    }

    openSaveDialog(){
        let that = this;
        this.hot.sumCounter.calculateAll();        
        let sourceData = this.getSourceDataWithSums().map(c => c.slice());
        this.diffContents = this.trackDiff(this.initialDatas, sourceData)
        
        if(this.diffContents.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff").modal("show");
            setTimeout(() => {
                that.hot.unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
        else{
            this.toastr.warning('Tidak ada data yang berubah', 'Warning!');
        }  
    }

    openAddRowDialog(): void {
        $('#form-add')[0].reset();

        this.isExist = false;        
        this.isAnggaranNotEnough = false;
        this.anggaran = 0;
        this.rapSelected = 'rap';
        this.jumlah= 0;
        this.hrgSatuan = 0;
        

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

        if (this.isExist || this.isAnggaranNotEnough)
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

                let isObyek = (data['Obyek'] > content.Kode_Rekening);
                let isParent = (content.Kode_Rekening.startsWith(data['Obyek']));

                if (isObyek && isParent){
                    positions.Obyek = i + 1;
                    isSmaller = true;
                }
                else if(!isObyek && isParent && !isSmaller)
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
            me.hot.render();
        }, 300);
    }

    addOneRow(): void {
        let data = {};
        $("#form-add").serializeArray().map(c => { data[c.name] = c.value });

        let isFilled = this.validateForm(data);
        if(isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)')
        }
        else {
            this.addRow();
            $("#modal-add").modal("hide");
            $('#form-add')[0].reset();
        }
    }

    addOneRowAndAnother(): void {
        let data = {};
        $("#form-add").serializeArray().map(c => { data[c.name] = c.value });

        let isFilled = this.validateForm(data);
        if(isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)')
        }
        else {
            this.addRow();
        }
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
        this.isAnggaranNotEnough = false;
        this.anggaran = 0;
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
        this.isAnggaranNotEnough = false;
        this.anggaran = 0;

        if(value == 'rabRinci' || value == 'rapRinci'){
            this.isExist = false;
            this.isAnggaranNotEnough = false;
            this.sumberdana = null;
        }

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
                if(value == 'rabSub'){
                    this.refDatasets['rabSub'] = this.getReffRABSub();
                    break;
                }
                
                if (this.kegiatanSelected != '' && value == 'rabRinci') {
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

                    case 'rabSubBidang':
                        this.contentSelection['rabSubKegiatan'] = this.refDatasets.rabSub.rabSubKegiatan.filter(c => c.Kd_Keg.startsWith(value));
                        break;

                    case 'rabSubKegiatan':
                        this.contentSelection['rabSubObyek'] = this.refDatasets.rabSub.rabSubObyek.filter(c => c.Kd_Keg == value);
                        break;
                }
                break;
        }

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
        this.refDatasets['rabSub'] = {rabSubBidang:[],rabSubKegiatan:[],rabSubObyek:[]};
        this.siskeudes.getRefBidangAndKegiatan(kdDesa, data => {

            let returnObject = { Bidang: [], Kegiatan: [] };
            let fields = CATEGORIES[1].fields.slice(1, 3);
            let currents = CATEGORIES[1].currents.slice(1, 3);
            let results = this.refTransformData(data, fields, currents, returnObject);
            Object.assign(this.refDatasets, results);

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
        });
    }

    calculateAnggaranSumberdana() {
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let results = {anggaran:{}, terpakai:{}}

        this.refDatasets["sumberDana"].forEach(item => {
            results.anggaran[item.Kode] = 0;
            results.terpakai[item.Kode] = 0 ;        
        });

        sourceData.forEach(row => {
            let dotCount = row.Kode_Rekening.slice(-1) == '.' ? row.Kode_Rekening.split('.').length - 1 : row.Kode_Rekening.split('.').length;

            if(dotCount == 6 && row.Kode_Rekening.startsWith('5.1.3')){
                let anggaran = row.JmlSatuan * row.HrgSatuan;
                results.terpakai[row.SumberDana] += anggaran;
            }

            if (dotCount !== 5)
                return;

            if (row.Kode_Rekening.startsWith('6.') || row.Kode_Rekening.startsWith('4.')){
                let anggaran = row.JmlSatuan * row.HrgSatuan;
                results.anggaran[row.SumberDana] += anggaran;
            }
            else if(!row.Kode_Rekening.startsWith('5.1.3')){
                let anggaran = row.JmlSatuan * row.HrgSatuan;
                results.terpakai[row.SumberDana] += anggaran;
            }
        });
        this.anggaranSumberdana = results;
    }

    getReffRABSub():any{
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let results = {rabSubBidang:[],rabSubKegiatan:[],rabSubObyek:[]};
        let current = {Bidang:{Kd_Bid:'',Uraian:''},Kegiatan:{Kd_Keg:'',Uraian:''},Obyek:{Obyek:'',Uraian:''}}
        
        sourceData.forEach(row => {
            let dotCount = row.Kode_Rekening.slice(-1) == '.' ? row.Kode_Rekening.split('.').length - 1 : row.Kode_Rekening.split('.').length;
            let dotCountBidOrKeg = row.Kd_Bid_Or_Keg.slice(-1) == '.' ? row.Kd_Bid_Or_Keg.split('.').length - 1 : row.Kd_Bid_Or_Keg.split('.').length;


            if(dotCountBidOrKeg == 3){
                current.Bidang.Kd_Bid = row.Kd_Bid_Or_Keg;
                current.Bidang.Uraian = row.Uraian;
            }
            if(dotCountBidOrKeg == 4){
                current.Kegiatan.Kd_Keg = row.Kd_Bid_Or_Keg;
                current.Kegiatan.Uraian = row.Uraian;
            }
            
            if(row.Kode_Rekening.startsWith('5.1.3') && dotCount == 4){
                if(!results.rabSubBidang.find(c => c.Kd_Bid == current.Bidang.Kd_Bid))
                    results.rabSubBidang.push(Object.assign({},current.Bidang));
                    
                if(!results.rabSubKegiatan.find(c => c.Kd_Keg == current.Kegiatan.Kd_Keg))
                    results.rabSubKegiatan.push(Object.assign({},current.Kegiatan))

                results.rabSubObyek.push({Kd_Keg:current.Kegiatan.Kd_Keg, Obyek:row.Kode_Rekening,Uraian:row.Uraian});
            }
        });
        return results;
    }

    validateForm(data):boolean {
        let result = false;
        if(this.categorySelected == 'pendapatan' || this.categorySelected == 'pembiayaan' ){
            let requiredForm = {rap:['Kelompok','Jenis','Obyek'], rapRinci:['Obyek', 'Uraian']}
            console.log(this.rapSelected)
            for(let i = 0; i <  requiredForm[this.rapSelected].length; i++){
                let col = requiredForm[this.rapSelected][i];

                if(data[col] == '' || !data[col]){
                    result = true;
                    break;
                }                
            }
            if(this.rapSelected == 'rapRinci'){
                if(!this.sumberdana || !data['SumberDana'])
                    result = true;                    
            }
            return result;            
        }
        if(this.categorySelected == 'belanja'){
            let requiredForm = {rab:['Kd_Bid', 'Kd_Keg', 'Jenis', 'Obyek'],rabSub:['Kd_Bid', 'Kd_Keg', 'Obyek','Uraian'],rabRinci:['Kd_Bid', 'Kd_Keg', 'Obyek', 'SumberDana','Uraian']}

            for(let i = 0; i <  requiredForm[this.rabSelected].length; i++){
                let col = requiredForm[this.rabSelected][i];

                if(data[col]=='' || !data[col]){
                    result = true;
                    break;
                }
            }
            if(this.rapSelected == 'rabRinci'){
                if(!this.sumberdana || !data['SumberDana'])
                    result = true;                    
            }
            return result; 
            
        }
    }
}
