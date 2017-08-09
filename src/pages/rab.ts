import { remote, app as remoteApp, shell } from "electron";
import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';

import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import schemas from '../schemas';

import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounterRAB from "../helpers/sumCounterRAB";
import diffProps from '../helpers/diff';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import titleBar from '../helpers/titleBar';

var $ = require('jquery');
var path = require("path");
var jetpack = require("fs-jetpack");
var Docxtemplater = require('docxtemplater');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');


const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const PENGANGGARAN_DIR = path.join(CONTENT_DIR, 'penganggaran.json');

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
        name: 'belanja',
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

const WHERECLAUSE_FIELD = {
    Ta_RAB: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian'],
    Ta_RABSub: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci'],
    Ta_RABRinci: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci', 'No_Urut']
}
enum TypesBelanja { Kelompok = 2, Jenis = 3, Obyek = 4 }
enum JenisPosting { "Usulan APBDes" = 1, "APBDes Awal tahun" = 2, "APBDes Perubahan" = 3 }

@Component({
    selector: 'apbdes',
    templateUrl: 'templates/rab.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

export default class RabComponent {
    hot: any;
    initialDatas: any;
    diffContents: any = {};
    diffTracker: DiffTracker;
    tableSearcher: any;
    contentsPostingLog: any[] = [];
    statusPosting: any = {};

    year: string;
    kodeDesa: string;
    taDesa: any = {};

    refDatasets: any = {};
    contentSelection: any = {};

    isExist: boolean;
    messageIsExist: string;
    kegiatanSelected: string;
    isObyekRABSub: boolean;

    anggaran: any;
    anggaranSumberdana: any = {};
    isAnggaranNotEnough: boolean;

    statusAPBDes: string;
    afterSaveAction: string;
    stopLooping: boolean;
    model: any = {};
    sub: any;
    tabActive: string;
    progress: Progress;
    progressMessage: string;

    constructor(
        private dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        private route: ActivatedRoute,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef) {

        this.toastr.setRootViewContainerRef(vcr);
        this.diffTracker = new DiffTracker();
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
        document.location.href = "app.html";
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

        result.sumCounter = new SumCounterRAB(result);
        result.addHook('afterRemoveRow', function (index, amount) {
            result.sumCounter.calculateAll();
            result.render();
        });

        result.addHook('afterChange', function (changes, source) {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;
                var indexAnggaran = [5, 6, 8, 10, 12];

                if (me.stopLooping) {
                    me.stopLooping = false;
                    changes = [];
                }

                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if (indexAnggaran.indexOf(col) !== -1) {
                        if (col == 6 && me.statusAPBDes == 'AWAL')
                            result.setDataAtCell(row, 10, value)

                        let rowData = result.getDataAtRow(row);
                        let Kd_Keg = rowData[1];
                        let Kode_Rekening = rowData[2];
                        let sumberDana = rowData[5];
                        let isValidAnggaran = true;
                        let jmlSatuan = (me.statusAPBDes == 'AWAL') ? 6 : 10;
                        let hrgSatuan = (me.statusAPBDes == 'AWAL') ? 8 : 12;

                        if (Kode_Rekening && Kode_Rekening.startsWith('5.')) {
                            let anggaran = rowData[jmlSatuan] * rowData[hrgSatuan];
                            let prevAnggaran = result.sumCounter.sums.awal[Kd_Keg + '_' + Kode_Rekening];
                            let sisaAnggaran = me.anggaranSumberdana.anggaran[sumberDana] - (me.anggaranSumberdana.terpakai[sumberDana] - prevAnggaran);

                            if (col == 5) {
                                let prevAnggaran = me.anggaranSumberdana.anggaran[prevValue];
                                let anggaran = me.anggaranSumberdana.anggaran[sumberDana];

                                if (prevAnggaran > anggaran) {
                                    me.toastr.error('Pendapatan Untuk Sumberdana ' + sumberDana + ' Tidak Mencukupi !', '');
                                    isValidAnggaran = false;
                                }
                            }
                            else {
                                if (anggaran > sisaAnggaran) {
                                    me.toastr.error('Pendapatan Untuk Sumberdana ' + sumberDana + ' Tidak Mencukupi !', '');
                                    isValidAnggaran = false;
                                }
                            }
                        }
                        else {
                            let anggaran = rowData[jmlSatuan] * rowData[hrgSatuan];
                            let prevAnggaran = result.sumCounter.sums.awal[Kode_Rekening];
                            let perubahanAnggaran = anggaran - prevAnggaran;
                            let newAnggaran = me.anggaranSumberdana.anggaran[sumberDana] + perubahanAnggaran;

                            if (col == 5) {
                                let sisaAnggaran = me.anggaranSumberdana.anggaran[prevValue] - anggaran;
                                let anggaranTerpakai = me.anggaranSumberdana.terpakai[prevValue];

                                if (sisaAnggaran < anggaranTerpakai) {
                                    me.toastr.error('Pendapatan tidak bisa dikurangi', '');
                                    isValidAnggaran = false;
                                }

                            }
                            else {
                                if (newAnggaran < me.anggaranSumberdana.terpakai[sumberDana]) {
                                    me.toastr.error('Pendapatan tidak bisa dikurangi', '');
                                    isValidAnggaran = false;
                                }
                            }
                        }

                        if (isValidAnggaran) {
                            me.calculateAnggaranSumberdana();
                            rerender = true;
                            me.stopLooping = false;
                        }
                        else {
                            result.setDataAtCell(row, col, prevValue)
                            me.stopLooping = true;
                        }
                    }

                    if (col == 7 && me.statusAPBDes == 'AWAL') {
                        result.setDataAtCell(row, 11, value)
                    }
                    if (col == 11 && me.statusAPBDes == 'PAK') {
                        result.setDataAtCell(row, 7, value)
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

    onResize(event): void {
        let that = this;
        setTimeout(function () {
            that.hot.render()
        }, 200);
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    ngOnInit() {
        titleBar.title('Data Keuangan - ' + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        this.isExist = false;
        this.isObyekRABSub = false;
        this.kegiatanSelected = '';
        this.initialDatas = [];
        this.model.tabActive = null;
        this.tabActive = 'posting';
        this.contentsPostingLog = [];
        this.statusPosting = { '1': false, '2': false, '3': false }
        

        let that = this;
        let elementId = "sheet";
        let sheetContainer = document.getElementById(elementId);
        let inputSearch = document.getElementById("input-search");

        this.hot = this.createSheet(sheetContainer);
        this.tableSearcher = initializeTableSearch(this.hot, document, inputSearch, null);

        this.sub = this.route.queryParams.subscribe(params => {
            this.year = params['year'];
            this.kodeDesa = params['kd_desa'];

            this.siskeudesService.getTaDesa(this.kodeDesa, data => {
                this.taDesa = data[0];
                this.statusAPBDes = this.taDesa.Status;
                this.setEditor();
                this.getContents(this.year, this.kodeDesa);
            });
        })
    }

    setEditor(): void {
        let setEditor = { AWAL: [6, 7, 8], PAK: [10, 11, 12] }
        let newSetting = schemas.rab;
        let valAWAL, valPAK;

        if (this.statusAPBDes == 'PAK') {
            valAWAL = false;
            valPAK = 'text';
        }
        else {
            valAWAL = 'text';
            valPAK = false;
        }

        newSetting.map((c, i) => {
            if (setEditor.AWAL.indexOf(i) !== -1)
                c.editor = valAWAL;
            if (setEditor.PAK.indexOf(i) !== -1)
                c.editor = valPAK;
        })

        this.hot.updateSettings({ columns: newSetting })
        this.hot.render();
    }

    getSourceDataWithSums(): any[] {
        let data = this.hot.sumCounter.dataBundles.map(c => schemas.objToArray(c, schemas.rab));
        return data
    }

    getContents(year, kodeDesa): void {
        let that = this;

        this.siskeudesService.getRAB(year, kodeDesa, data => {
            let results = this.transformData(data);
            this.hot.loadData(results);
            this.hot.sumCounter.calculateAll();
            this.getContentFromServer();

            setTimeout(function () {
                that.initialDatas = that.getSourceDataWithSums().map(c => c.slice());

                that.siskeudesService.getRefSumberDana(data => {
                    let newSetting = schemas.rab.map(c => Object.assign({}, c));
                    let sumberDana = newSetting.find(c => c.field == "SumberDana");
                    sumberDana.source = data.map(c => c.Kode);

                    that.hot.updateSettings({ columns: newSetting })
                    that.hot.render();

                    that.refDatasets["sumberDana"] = data;
                    that.calculateAnggaranSumberdana();
                    that.getReferences(kodeDesa);
                })
                that.hot.render();
            }, 300);
        });
    }

    saveContentToServer(){
        let bundleSchema = {"rab": schemas.rab};
        let localBundle = this.dataApiService.getLocalContent('penganggaran', bundleSchema);
        let sourceData = this.getSourceDataWithSums().map(c => c.slice());

        let diff =  this.diffTracker.trackDiff(localBundle['data']['rab'], sourceData);

        if (diff.total > 0)
            localBundle['diffs']['rab'] = localBundle['diffs']['rab'].concat(diff);

        this.dataApiService.saveContent('penganggaran', null, localBundle, bundleSchema, this.progressListener.bind(this))
            .finally(() => {
                this.dataApiService.writeFile(localBundle, PENGANGGARAN_DIR, this.toastr)
            })
            .subscribe(
            result => {
                let mergedResult = this.mergeContent(result, localBundle);
                
                mergedResult = this.mergeContent(localBundle, mergedResult);
                
                localBundle.diffs['rab'] = [];
                localBundle.data['rab'] = mergedResult['data']['rab'];

                this.toastr.success('Data berhasil disimpan ke server');
            },
            error => {
                this.toastr.error('Data gagal disimpan ke server');
            });

    }

    getContentFromServer(): void {
        let me = this;
        let bundleSchema = {"rab": schemas.rab};
        let localBundle = this.dataApiService.getLocalContent('penganggaran', bundleSchema);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.progressMessage = 'Memuat data';

        this.dataApiService.getContent('penganggaran', null, changeId, this.progressListener.bind(this))
            .subscribe(
            result => {
                if(result['change_id'] === localBundle.changeId){
                    mergedResult = this.mergeContent(localBundle, localBundle);
                    return;
                }

                mergedResult = this.mergeContent(result, localBundle);

                this.dataApiService.writeFile(mergedResult,PENGANGGARAN_DIR , null);
            },
            error => {
                mergedResult = this.mergeContent(localBundle, localBundle);
                this.dataApiService.writeFile(mergedResult, PENGANGGARAN_DIR, null);
            });
    }

    mergeContent(newBundle, oldBundle): any {
        if (newBundle['diffs']) {
            let newDiffs = newBundle["diffs"]['rab'] ? newBundle["diffs"]['rab'] : [];
            oldBundle["data"]['rab'] = this.dataApiService.mergeDiffs(newDiffs, oldBundle["data"]['rab']);
        }
        else 
            oldBundle["data"]['rab'] = newBundle["data"]['rab'] ? newBundle["data"]['rab'] : [];
        

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    getContentPostingLog() {
        this.siskeudesService.getPostingLog(this.kodeDesa, data => {
            this.contentsPostingLog = data;
            this.setStatusPosting();
        });
    }

    getJenisPosting(value) {
        let num = parseInt(value);
        return JenisPosting[num];
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


                for (let i = 0; i < field.length; i++) {
                    let data = (content[field[i]]) ? content[field[i]] : '';

                    if (field[i] == 'Anggaran' || field[i] == 'AnggaranStlhPAK')
                        data = null;

                    res.push(data)
                }

                if (!current) {
                    if (res[4] != ''){
                        let row = this.generateId(res)
                        results.push(row);
                    }
                    return;
                }

                if (current.value !== content[current.fieldName]) {
                    let lengthCode = content[current.fieldName].slice(-1) == '.' ? content[current.fieldName].split('.').length - 1 : content[current.fieldName].split('.').length;

                    if (content[current.fieldName].startsWith('5.1.3') && lengthCode == 5) {
                        if (currentSubRinci !== content.Kode_SubRinci){
                            let row = this.generateId(res)
                            results.push(row);
                        }
                        currentSubRinci = content[current.fieldName];
                    }
                    else{
                        let row = this.generateId(res)
                        results.push(row);
                    }
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

    saveContent() {
        $('#modal-save-diff').modal('hide');

        let sourceData = this.getSourceDataWithSums();
        let diffcontent = this.trackDiff(this.initialDatas, sourceData);
        let bundle = this.bundle(diffcontent);

        this.saveContentToServer();
        this.siskeudesService.saveToSiskeudesDB(bundle, null, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Berhasil!', '');

                CATEGORIES.forEach(category => {
                    category.currents.map(c => c.value = '');
                })

                this.getContents(this.year, this.kodeDesa);
                this.afterSave();
            }
            else
                this.toastr.error('Penyimpanan Gagal!', '');
        });
    }

    postingAPBDes() {
        let isFilled = this.validateForm();
        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)')
            return;
        }
        this.model['Tahun'] = this.year;
        this.model.TglPosting = moment(this.model.TglPosting, "YYYY-MM-DD").format("DD-MMM-YYYY");

        this.siskeudesService.postingAPBDes(this.kodeDesa, this.model, this.statusAPBDes, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Berhasil!', '');
                this.getContentPostingLog();
            }
            else
                this.toastr.error('Penyimpanan Gagal!', '');
        })
    }

    setStatusPosting() {
        Object.keys(this.statusPosting).forEach(val => {
            if (this.contentsPostingLog.find(c => c.KdPosting == val))
                this.statusPosting[val] = true;
            else
                this.statusPosting[val] = false;
        })
    }

    setLockPosting(setLock) {
        let table = 'Ta_AnggaranLog';
        let contents = [];
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };

        if (!this.contentsPostingLog || this.contentsPostingLog.length < 1)
            return;

        this.contentsPostingLog.forEach(content => {
            if (!content || content.Kunci == setLock)
                return;

            if (!this.model[content.KdPosting])
                return;

            contents.push(content);
        });

        if (contents.length == 0)
            return;

        contents.forEach(content => {
            let whereClause = { KdPosting: content.KdPosting };
            let data = { Kunci: setLock }

            bundle.update.push({ [table]: { whereClause: whereClause, data: data } })
        });

        this.siskeudesService.saveToSiskeudesDB(bundle, null, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Berhasil!', '');

                this.getContentPostingLog();
            }
            else
                this.toastr.error('Penyimpanan Gagal!', '');
        });
    }

    deletePosting() {
        let contents = [];
        let isLocked = false;
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };

        if (!this.contentsPostingLog || this.contentsPostingLog.length == 0)
            return;

        this.contentsPostingLog.forEach(content => {
            if (!this.model[content.KdPosting])
                return;

            if (content.Kunci) {
                isLocked = true;
                return;
            }

            contents.push(content);
        });

        if (isLocked) {
            this.toastr.error('Penghapusan Gagal Karena Status Masih Terkunci!', '');
            return;
        }


        if (contents.length == 0)
            return;

        contents.forEach(content => {
            let whereClause = { KdPosting: content.KdPosting, Kd_Desa: this.kodeDesa };

            bundle.delete.push({ 'Ta_AnggaranRinci': { whereClause: whereClause, data: {} } })
            bundle.delete.push({ 'Ta_AnggaranLog': { whereClause: whereClause, data: {} } })
            bundle.delete.push({ 'Ta_Anggaran': { whereClause: whereClause, data: {} } })
        });

        this.siskeudesService.saveToSiskeudesDB(bundle, null, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Berhasil!', '');

                this.getContentPostingLog();
            }
            else
                this.toastr.error('Penyimpanan Gagal!', '');
        })

    }

    bundle(bundleDiff) {
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

                WHERECLAUSE_FIELD[item.table].forEach(c => {
                    res.whereClause[c] = item.data[c];
                });
                res.data = this.sliceObject(item.data, WHERECLAUSE_FIELD[item.table])

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

                WHERECLAUSE_FIELD[item.table].forEach(c => {
                    res.whereClause[c] = item.data[c];
                });
                res.data = this.sliceObject(item.data, WHERECLAUSE_FIELD[item.table])
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
                let category = CATEGORIES.find(c => result['Kd_Rincian'].startsWith(c.code) == true).name;

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
        if (this.model.category !== 'belanja')
            return;

        if (type == 'anggaran')
            this.anggaran = (!value) ? 0 : value;

        if (this.model.SumberDana && this.model.SumberDana !== "null") {
            let anggaran = this.anggaranSumberdana.anggaran[this.model.SumberDana];
            let sisaAnggaran = anggaran - this.anggaranSumberdana.terpakai[this.model.SumberDana];

            if (this.anggaran == 0 && sisaAnggaran == 0) {
                this.isAnggaranNotEnough = false;
                return;
            }

            if (this.anggaran < sisaAnggaran)
                this.isAnggaranNotEnough = false;
            else
                this.isAnggaranNotEnough = true;
        }

    }

    openSaveDialog() {
        let that = this;
        this.hot.sumCounter.calculateAll();
        let sourceData = this.getSourceDataWithSums().map(c => c.slice());
        this.diffContents = this.trackDiff(this.initialDatas, sourceData)

        if (this.diffContents.total > 0) {
            $("#modal-save-diff").modal("show");
            setTimeout(() => {
                that.hot.unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
        else {
            this.toastr.warning('Tidak ada data yang berubah', 'Warning!');
        }
    }

    openAddRowDialog(): void {
        this.model = {};
        this.contentSelection = {};
        let selected = this.hot.getSelected();
        let category = 'pendapatan';
        let sourceData = this.hot.getSourceData();

        if (selected) {
            let data = this.hot.getDataAtRow(selected[1]);
            let currentCategory = CATEGORIES.find(c => c.code.slice(0, 2) == data[1].slice(0, 2));
        }

        this.model.category = category;
        $('#modal-add').modal('show');

        this.setDefaultValue();
        this.categoryOnChange(category);
    }

    openPostingDialog() {
        this.contentsPostingLog = [];
        this.model = {};
        this.zone.run(() => {
            this.model.tabActive = 'posting-apbdes';
        });

        $('#modal-posting-apbdes').modal('show');
        this.getContentPostingLog();
    }


    setDefaultValue(): void {
        this.isExist = false;
        this.isAnggaranNotEnough = false;
        let model = [];

        if (!this.model.rap)
            this.model.rap = 'rap';

        if (this.model.category == 'belanja') {
            if (this.model.rab == 'rab')
                model = ['Kd_Bid', 'Kd_Keg', 'Jenis', 'Obyek'];
            else
                model = ['Kd_Bid', 'Kd_Keg', 'Obyek', 'SumberDana'];
        }
        else if (this.model.category !== 'belanja' && this.model.category) {
            if (this.model.rap == 'rap')
                model = ['Kelompok', 'Jenis', 'Obyek'];
            else
                model = ['Obyek', 'SumberDana'];
        }

        if (this.model.rab == 'rabRinci' || this.model.rap == 'rapRinci') {
            this.model.JmlSatuan = 0;
            this.model.Biaya = 0;
            this.model.Uraian = '';
            this.model.HrgSatuan = 0;
        }

        model.forEach(c => {
            this.model[c] = null;
        });
    }

    addRow(): void {
        let me = this;
        let position = 0;
        let data = this.model;
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let contents = [];

        let currents = { Kelompok: '', Jenis: '', Obyek: '', Kd_Bid: '', Kd_Keg: '' }
        let positions = { Kelompok: 0, Jenis: 0, Obyek: 0, Kd_Keg: 0 }
        let types = ['Kelompok', 'Jenis', 'Obyek'];
        let currentKdKegiatan = '', oldKdKegiatan = '', isSmaller = false;
        let same = [];

        if (this.isExist || this.isAnggaranNotEnough)
            return;

        if (this.model.rap == 'rapRinci' || this.model.rab == 'rabRinci') {
            let lastCode = data['Obyek'].slice(-1) == '.' ? data['Obyek'] + '00' : data['Obyek'] + '.00';

            for (let i = 0; i < sourceData.length; i++) {
                let content = sourceData[i];
                let dotCount = (content.Kode_Rekening.slice(-1) == '.') ? content.Kode_Rekening.split('.').length - 1 : content.Kode_Rekening.split('.').length;
                let dotCountBid = (content.Kd_Bid_Or_Keg.slice(-1) == '.') ? content.Kd_Bid_Or_Keg.split('.').length - 1 : content.Kd_Bid_Or_Keg.split('.').length;

                if (this.model.category == 'pendapatan' || this.model.category == 'pembiayaan') {
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
            let fields = CATEGORIES.find(c => c.name == this.model.category).fields;
            let property = this.model.category == 'belanja' ? 'Kode_Rincian' : 'Obyek_Rincian';
            let splitLastCode = lastCode.slice(-1) == '.' ? lastCode.slice(0, -1).split('.') : lastCode.split('.');
            let digits = splitLastCode[splitLastCode.length - 1];

            if (data['JmlSatuan'] == 0)
                data['JmlSatuan'] = '0';
            if (data['HrgSatuan'] == 0)
                data['HrgSatuan'] = '0';

            data['JmlSatuanPAK'] = data['JmlSatuan'];
            data['HrgSatuanPAK'] = data['HrgSatuan'];

            if (me.statusAPBDes == 'PAK') {
                data['JmlSatuan'] = '0';
                data['HrgSatuan'] = '0';
            }

            data[property] = splitLastCode.slice(0, splitLastCode.length - 1).join('.') + '.' + ("0" + (parseInt(digits) + 1)).slice(-2);
            fields[fields.length - 1].forEach(c => {
                let value = (data[c]) ? data[c] : "";
                results.push(value)
            });

            contents.push(results);
        }

        else if (this.model.rab == 'rabSub' && this.model.category == 'belanja') {
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

                if (isObyek && isParent) {
                    positions.Obyek = i + 1;
                    isSmaller = true;
                }
                else if (!isObyek && isParent && !isSmaller)
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

                if (content.Kode_Rekening == '5.' && this.model.category == 'pendapatan')
                    break;

                position = i + 1;

                if (this.model.category == 'pendapatan' || this.model.category == 'pembiayaan') {
                    if (this.model.category == 'pembiayaan' && !content.Kode_Rekening.startsWith('6'))
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

                    if (data.Obyek.startsWith('5.1.3')) {
                        data.Obyek = data.ObyekRabSub;
                    }

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

            types = (this.model.category == 'belanja') ? types.slice(1) : types;
            types.forEach(value => {
                if (same.indexOf(value) !== -1) return;
                let content = this.refDatasets[value].find(c => c[1] == data[value]).slice();

                if (this.model.category == 'belanja' && content)
                    content[0] = data['Kd_Keg'];
                content ? contents.push(content) : '';
            });

            if (same.length == 0 && this.model.category == 'belanja')
                position = positions.Kd_Keg;

            position = (same.length == 0 && positions[types[0]] == 0) ? position : positions[types[same.length]];
        }

        let start = position, end = 0;
        contents.forEach((content, i) => {
            let newPosition = position + i;
            this.hot.alter("insert_row", newPosition);
            let newContent = content.slice();
            end = newPosition;

            let row = this.generateId(newContent)
            this.hot.populateFromArray(newPosition, 0, [row], newPosition, row.length - 1, null, 'overwrite');
        })

        this.hot.selectCell(start, 0, end, 7, true, true);

        setTimeout(function () {
            me.hot.sumCounter.calculateAll();
            me.hot.render();
        }, 300);
    }

    addOneRow(): void {
        let isFilled = this.validateForm();
        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)')
        }
        else {
            this.addRow();
            $("#modal-add").modal("hide");
        }
    }

    addOneRowAndAnother(): void {
        let isFilled = this.validateForm();

        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)')
        }
        else {
            this.addRow();
        }
    }

    validateIsExist(value, message) {
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        this.messageIsExist = message;

        if (this.model.category == 'belanja' && this.model.rab != 'rabRinci') {
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

    categoryOnChange(value): void {
        this.isExist = false;
        this.isAnggaranNotEnough = false;
        this.anggaran = 0;
        this.kegiatanSelected = '';
        this.model.category = value;
        this.contentSelection = {};
        this.setDefaultValue();

        switch (value) {
            case "pendapatan":
                this.model.rap = 'rap';
                this.model.rab = 'rab';

                Object.assign(this.refDatasets, this.refDatasets['pendapatan']);
                break;

            case "belanja":
                this.model.rab = 'rab';
                this.model.rap = 'rap';

                Object.assign(this.refDatasets, this.refDatasets['belanja']);
                break;

            case "pembiayaan":
                this.model.rap = 'rap';
                this.model.rab = 'rab';

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
        this.contentSelection = {};


        if (value == 'rabRinci' || value == 'rapRinci') {
            this.isExist = false;
            this.isAnggaranNotEnough = false;
            this.model.SumberDana = null;
        }

        switch (selector) {
            case "rap":
                this.model.rap = value;
                this.setDefaultValue();

                if (value == 'rap')
                    break;

                let code = (this.model.category == 'pendapatan') ? '4.' : '6.';
                let sourceData = this.hot.getSourceData();
                let data = sourceData.filter(c => {
                    let lengthCode = c[2].slice(-1) == '.' ? c[2].split('.').length - 1 : c[2].split('.').length;
                    return c[2].startsWith(code) && lengthCode == 4
                });
                this.contentSelection["availableObyek"] = data;
                break;
            case "rab":
                this.model.rab = value;
                this.setDefaultValue();

                if (value == 'rabSub') {
                    this.refDatasets['rabSub'] = this.getReffRABSub();
                    break;
                }

                if (this.kegiatanSelected != '' && value == 'rabRinci') {
                    this.model.rab = value;
                    this.selectedOnChange('kegiatan', this.kegiatanSelected);
                }
                break;
        }
    }

    selectedOnChange(selector, value) {
        let data = [];
        let results = [];

        switch (this.model.category) {
            case "pendapatan":
            case "pembiayaan":
                this.isExist = false;
                let type = (selector == 'Kelompok') ? 'Jenis' : 'Obyek';

                if (selector == 'Kelompok') {
                    this.setDefaultValue();
                    if (value !== null || value != 'null')
                        this.model.Kelompok = value;
                }

                data = this.refDatasets[type];
                results = data.filter(c => c[1].startsWith(value));
                this.contentSelection['content' + type] = results;
                break;

            case "belanja":
                switch (selector) {
                    case "bidang":
                        this.isObyekRABSub = false;
                        this.contentSelection = {};
                        this.setDefaultValue();
                        this.kegiatanSelected = '';

                        if (value !== null || value != 'null')
                            this.model.Kd_Bid = value;

                        this.contentSelection['contentKegiatan'] = [];
                        data = this.refDatasets['Kegiatan'].filter(c => c[2].startsWith(value));
                        this.contentSelection['contentKegiatan'] = data;
                        break;

                    case "kegiatan":
                        this.kegiatanSelected = value;

                        if (this.model.rab == 'rab')
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

                            if (this.model.rab == "rabSub")
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
                                        results.push(content);
                                }
                            });

                            this.model.ObyekRabSub = null;
                            this.contentSelection['rabSubAvailable'] = results.map(c => schemas.objToArray(c, schemas.rab));
                            break;
                        }

                        this.isObyekRABSub = false;
                        break;

                    case 'rabSubBidang':
                        this.setDefaultValue();

                        if (value !== null || value != 'null')
                            this.model.Kd_Bid = value;

                        this.contentSelection['rabSubKegiatan'] = this.refDatasets.rabSub.rabSubKegiatan.filter(c => c.Kd_Keg.startsWith(value));
                        break;

                    case 'rabSubKegiatan':
                        this.contentSelection['rabSubObyek'] = this.refDatasets.rabSub.rabSubObyek.filter(c => c.Kd_Keg == value);
                        break;
                }
                break;
        }

    }

    reffTransformData(data, fields, currents, results) {
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
        this.refDatasets['rabSub'] = { rabSubBidang: [], rabSubKegiatan: [], rabSubObyek: [] };
        this.siskeudesService.getRefBidangAndKegiatan(kdDesa, data => {

            let returnObject = { Bidang: [], Kegiatan: [] };
            let fields = CATEGORIES[1].fields.slice(1, 3);
            let currents = CATEGORIES[1].currents.slice(1, 3);
            let results = this.reffTransformData(data, fields, currents, returnObject);
            Object.assign(this.refDatasets, results);

            let category = CATEGORIES.find(c => c.code == '4.')
            this.getReferencesByCode(category, pendapatan => {                
                this.refDatasets['pendapatan'] = pendapatan;
                let category = CATEGORIES.find(c => c.code == '5.')

                this.getReferencesByCode(category, pendapatan => {  
                    this.refDatasets['belanja'] = pendapatan;                    
                    let category = CATEGORIES.find(c => c.code == '6.')

                    this.getReferencesByCode(category, pendapatan => { 
                        this.refDatasets['pembiayaan'] = pendapatan; 
                    })
                })
            })
        });
    }

    getReferencesByCode(category,callback){
         this.siskeudesService.getRefRekByCode(category.code, data => {
            let returnObject = (category.name != 'belanja') ? { Kelompok: [], Jenis: [], Obyek: [] } : { Jenis: [], Obyek: [] };
            let endSlice = (category.name != 'belanja') ? 4 : 5;
            let startSlice = (category.name != 'belanja') ? 1 : 3;
            let fields = category.fields.slice(startSlice, endSlice);
            let currents = category.currents.slice(startSlice, endSlice);
            let results = this.reffTransformData(data, fields, currents, returnObject);
            callback(results)
        })
    }

    calculateAnggaranSumberdana() {
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let results = { anggaran: {}, terpakai: {} }

        this.refDatasets["sumberDana"].forEach(item => {
            results.anggaran[item.Kode] = 0;
            results.terpakai[item.Kode] = 0;
        });

        sourceData.forEach(row => {
            if (!row.Kode_Rekening)
                return;

            let dotCount = row.Kode_Rekening.slice(-1) == '.' ? row.Kode_Rekening.split('.').length - 1 : row.Kode_Rekening.split('.').length;

            if (dotCount == 6 && row.Kode_Rekening.startsWith('5.1.3')) {
                let anggaran = row.JmlSatuan * row.HrgSatuan;
                results.terpakai[row.SumberDana] += anggaran;
            }

            if (dotCount !== 5)
                return;

            if (row.Kode_Rekening.startsWith('6.') || row.Kode_Rekening.startsWith('4.')) {
                let anggaran = row.JmlSatuan * row.HrgSatuan;
                results.anggaran[row.SumberDana] += anggaran;
            }
            else if (!row.Kode_Rekening.startsWith('5.1.3')) {
                let anggaran = row.JmlSatuan * row.HrgSatuan;
                results.terpakai[row.SumberDana] += anggaran;
            }
        });
        this.anggaranSumberdana = results;
    }

    getReffRABSub(): any {
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let results = { rabSubBidang: [], rabSubKegiatan: [], rabSubObyek: [] };
        let current = { Bidang: { Kd_Bid: '', Uraian: '' }, Kegiatan: { Kd_Keg: '', Uraian: '' }, Obyek: { Obyek: '', Uraian: '' } }

        sourceData.forEach(row => {
            let dotCount = row.Kode_Rekening.slice(-1) == '.' ? row.Kode_Rekening.split('.').length - 1 : row.Kode_Rekening.split('.').length;
            let dotCountBidOrKeg = row.Kd_Bid_Or_Keg.slice(-1) == '.' ? row.Kd_Bid_Or_Keg.split('.').length - 1 : row.Kd_Bid_Or_Keg.split('.').length;

            if (dotCountBidOrKeg == 3) {
                current.Bidang.Kd_Bid = row.Kd_Bid_Or_Keg;
                current.Bidang.Uraian = row.Uraian;
            }
            if (dotCountBidOrKeg == 4) {
                current.Kegiatan.Kd_Keg = row.Kd_Bid_Or_Keg;
                current.Kegiatan.Uraian = row.Uraian;
            }

            if (row.Kode_Rekening.startsWith('5.1.3') && dotCount == 4) {
                if (!results.rabSubBidang.find(c => c.Kd_Bid == current.Bidang.Kd_Bid))
                    results.rabSubBidang.push(Object.assign({}, current.Bidang));

                if (!results.rabSubKegiatan.find(c => c.Kd_Keg == current.Kegiatan.Kd_Keg))
                    results.rabSubKegiatan.push(Object.assign({}, current.Kegiatan))

                results.rabSubObyek.push({ Kd_Keg: current.Kegiatan.Kd_Keg, Obyek: row.Kode_Rekening, Uraian: row.Uraian });
            }
        });
        return results;
    }

    validateForm(): boolean {
        let result = false;
        if (this.model.category == 'pendapatan' || this.model.category == 'pembiayaan') {
            let requiredForm = { rap: ['Kelompok', 'Jenis', 'Obyek'], rapRinci: ['Obyek', 'Uraian'] }
            for (let i = 0; i < requiredForm[this.model.rap].length; i++) {
                let col = requiredForm[this.model.rap][i];

                if (this.model[col] == '' || !this.model[col]) {
                    result = true;
                    break;
                }
            }
            if (this.model.rap == 'rapRinci') {
                if (!this.model.SumberDana || !this.model['SumberDana'])
                    result = true;
            }
            return result;
        }

        if (this.model.category == 'belanja') {
            let requiredForm = { rab: ['Kd_Bid', 'Kd_Keg', 'Jenis', 'Obyek'], rabSub: ['Kd_Bid', 'Kd_Keg', 'Obyek', 'Uraian'], rabRinci: ['Kd_Bid', 'Kd_Keg', 'Obyek', 'SumberDana', 'Uraian'] }

            for (let i = 0; i < requiredForm[this.model.rab].length; i++) {
                let col = requiredForm[this.model.rab][i];

                if (this.model[col] == '' || !this.model[col]) {
                    result = true;
                    break;
                }
            }
            if (this.model.rab == 'rabRinci') {
                if (!this.model.SumberDana)
                    result = true;
            }
            return result;
        }

        if (this.model.tabActive == 'posting-apbdes') {
            let requiredForm = ['KdPosting', 'No_Perdes', 'TglPosting'];

            for (let i = 0; i < requiredForm.length; i++) {
                let col = requiredForm[i];

                if (this.model[col] == '' || !this.model[col]) {
                    result = true;
                    break;
                }
            }
            return result;
        }
    }

    generateId(row){
        let arr = [];
        (!row[0] || row[0] == "") ? "" : arr.push(row[0]);
        (!row[1] || row[1] == "") ? "" : arr.push(row[1]);
        (!row[2] || row[2] == "") ? "" : arr.push(row[2]);

        row.splice(0, 0, arr.join('_'));
        return row
    }

}