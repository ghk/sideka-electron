import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { Diff, DiffTracker } from "../helpers/diffTracker"
import { PersistablePage } from '../pages/persistablePage';

import DataApiService from '../stores/dataApiService';
import { FIELD_ALIASES, fromSiskeudes, valueToPropName} from '../stores/siskeudesFieldTransformer';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';
import SiskeudesService from '../stores/siskeudesService';
import {CATEGORIES, PenganggaranContentManager} from '../stores/siskeudesContentManager';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

import schemas from '../schemas';
import TableHelper from '../helpers/table';
import SumCounterRAB from "../helpers/sumCounterRAB";
import titleBar from '../helpers/titleBar';
import PageSaver from '../helpers/pageSaver';
import ContentMerger from '../helpers/contentMerger';

import * as $ from 'jquery';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import * as path from 'path';

var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

enum TypesBelanja { kelompok = 2, jenis = 3, obyek = 4 }
enum JenisPosting { "Usulan APBDes" = 1, "APBDes Awal tahun" = 2, "APBDes Perubahan" = 3 }

@Component({
    selector: 'penganggaran',
    templateUrl: 'templates/penganggaran.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

export default class PenganggaranComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    hots: any = {};
    activeHot: any = {};
    sheets: any[];
    activeSheet: string;
    tableHelpers: any = {};

    initialDatasets: any = {};
    diffContents: any[];
    diffTracker: DiffTracker;
    contentsPostingLog: any[] = [];
    statusPosting: any = {};
    
    year: string;
    kodeDesa: string;

    dataReferences: SiskeudesReferenceHolder;
    contentSelection: any = {};
    desa: any = {};

    contentManager: PenganggaranContentManager;

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
    tabActive: string;
    progress: Progress;
    progressMessage: string;

    afterChangeHook: any;
    afterRemoveRowHook: any;
    penganggaranSubscription: Subscription;
    routeSubscription: Subscription;
    pageSaver: PageSaver;
    modalSaveId;   

    constructor(
        public dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private sharedService: SharedService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        private router: Router,
        private route: ActivatedRoute,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
    ) {
        super(dataApiService);
        this.diffTracker = new DiffTracker();
        this.toastr.setRootViewContainerRef(vcr);        
        this.pageSaver = new PageSaver(this, sharedService, null, router, toastr);
        this.dataReferences = new SiskeudesReferenceHolder(siskeudesService);
    }

    ngOnInit() {
        titleBar.title('Data Penganggaran - ' + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

        this.isExist = false;
        this.isObyekRABSub = false;
        this.kegiatanSelected = '';
        this.initialDatasets = { rab: [], kegiatan: [] };
        this.model.tabActive = null;
        this.tabActive = 'posting';
        this.contentsPostingLog = [];
        this.statusPosting = { '1': false, '2': false, '3': false }
        this.sheets = ['kegiatan', 'rab'];
        this.activeSheet = 'kegiatan';
        this.modalSaveId = 'modal-save-diff';
        this.tableHelpers = { kegiatan: {}, rab: {} }
        this.pageSaver.bundleSchemas = { kegiatan: schemas.kegiatan, rab: schemas.rab }
        this.pageSaver.bundleData = { kegiatan: [], rab: [] }
        let me = this;

        document.addEventListener('keyup', this.keyupListener, false);
        this.sheets.forEach(sheet => {
            let sheetContainer = document.getElementById('sheet-'+sheet);
            let inputSearch = document.getElementById('input-search-'+sheet);
            this.hots[sheet] = this.createSheet(sheetContainer, sheet);
            let tableHelper: TableHelper = new TableHelper(this.hots[sheet], inputSearch);
            tableHelper.initializeTableSearch(document, null);
            this.tableHelpers[sheet] = tableHelper;
        });        

        this.routeSubscription = this.route.queryParams.subscribe(async (params) => {
            this.year = params['year'];
            this.kodeDesa = params['kd_desa'];

            var data = await this.siskeudesService.getTaDesa(this.kodeDesa);
            this.desa = data[0];
            this.contentManager = new PenganggaranContentManager(
                this.siskeudesService, this.desa, this.dataReferences, this.hots["rab"]["sumCounter"]);
            this.statusAPBDes = this.desa.Status;
            this.setEditor();
            
            data = await this.contentManager.getContents();
            this.activeHot = this.hots['kegiatan'];

            this.sheets.forEach(sheet => {                        
                this.hots[sheet].loadData(data[sheet])
                
                if(sheet == 'rab'){
                    this.hots[sheet].sumCounter.calculateAll();
                    this.initialDatasets[sheet] = this.getSourceDataWithSums().map(c => c.slice());
                }
                else
                    this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
            })

            data = await this.dataReferences.get("refSumberDana");
            let sumberDana = data.map(c => c.Kode);
            let rabSetting = schemas.rab.map(c => Object.assign({}, c));

            rabSetting.forEach(c => {
                if(c.field == "sumber_dana")
                    c.source = sumberDana;
            });                            

            this.hots['rab'].updateSettings({ columns: rabSetting })
            this.calculateAnggaranSumberdana();
            this.getReferences(me.kodeDesa);

            this.pageSaver.getContent('penganggaran', this.desa.Tahun, this.progressListener.bind(this), 
                (err, notifications, isSyncDiffs, data) => {
                    this.dataApiService.writeFile(data, this.sharedService.getPenganggaranFile(), null);
            });

            setTimeout(function () {                       
                me.hots['kegiatan'].render();
            }, 300);
        });
    }
    
    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
        this.sheets.forEach(sheet => {            
            this.tableHelpers[sheet].removeListenerAndHooks();
            if(sheet == 'rab'){
                if (this.afterRemoveRowHook)
                    this.hots['rab'].removeHook('afterRemoveRow', this.afterRemoveRowHook);            
                if (this.afterChangeHook)    
                    this.hots['rab'].removeHook('afterChange', this.afterChangeHook);
            }
            this.hots[sheet].destroy();  
        })

        this.routeSubscription.unsubscribe();
        titleBar.removeTitle();

        if(this.penganggaranSubscription)
            this.penganggaranSubscription.unsubscribe()
        
    } 

    forceQuit(): void {
        $('#modal-save-diff').modal('hide');
        this.router.navigateByUrl('/');
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            this.router.navigateByUrl('/');
        else if (this.afterSaveAction == "quit")
            this.sharedService.getApp().quit();
    }

    createSheet(sheetContainer, sheet): any {
        let me = this;
        let config = {
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

            renderAllRows: false,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        }

        let result = new Handsontable(sheetContainer, config);

        if(sheet == 'kegiatan')
            return result;
        
        result['sumCounter'] = new SumCounterRAB(result);

        this.afterRemoveRowHook = (index, amount) => {
            result.sumCounter.calculateAll();
            result.render();
        }
        result.addHook('afterRemoveRow', this.afterRemoveRowHook);

        this.afterChangeHook = (changes, source) => {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;
                var indexAnggaran = [4, 5, 7, 9, 11];

                if (me.stopLooping) {
                    me.stopLooping = false;
                    changes = [];
                }

                changes.forEach(function (item) {
                    if(me.activeSheet !== 'rab')
                        return;
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                    if (indexAnggaran.indexOf(col) !== -1) {
                        if (col == 5 && me.statusAPBDes == 'AWAL')
                            result.setDataAtCell(row, 9, value)

                        let rowData = result.getDataAtRow(row);
                        let id = rowData[0];
                        let kodeRekening = rowData[1];
                        let sumberDana = rowData[4];
                        let isValidAnggaran = true;
                        let jumlahSatuan = (me.statusAPBDes == 'AWAL') ? 5 : 9;
                        let hargaSatuan = (me.statusAPBDes == 'AWAL') ? 7 : 11;

                        if (kodeRekening && kodeRekening.startsWith('5.')) {
                            let anggaran = rowData[jumlahSatuan] * rowData[hargaSatuan];
                            let prevAnggaran = result.sumCounter.sums.awal[id];
                            let sisaAnggaran = me.anggaranSumberdana.anggaran[sumberDana] - (me.anggaranSumberdana.terpakai[sumberDana] - prevAnggaran);

                            if (col == 4) {
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
                            let anggaran = rowData[jumlahSatuan] * rowData[hargaSatuan];
                            let prevAnggaran = result.sumCounter.sums.awal[kodeRekening];
                            let perubahanAnggaran = anggaran - prevAnggaran;
                            let newAnggaran = me.anggaranSumberdana.anggaran[sumberDana] + perubahanAnggaran;

                            if (col == 4) {
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

                    if (col == 6 && me.statusAPBDes == 'AWAL') {
                        result.setDataAtCell(row, 10, value)
                    }
                    if (col == 7 && me.statusAPBDes == 'AWAL') {
                        result.setDataAtCell(row, 11, value)
                    }
                    if (col == 10 && me.statusAPBDes == 'PAK') {
                        result.setDataAtCell(row, 6, value)
                    }
                });

                if (rerender) {
                    result.sumCounter.calculateAll();
                    result.render();
                }
            }
        }
        result.addHook('afterChange', this.afterChangeHook);
        return result;
    }

    onResize(event): void {
        let that = this;
        setTimeout(function () {
            that.activeHot.render()
        }, 200);
    }  

    setEditor(): void {
        let setEditor = { awal: [6, 7, 8], pak: [10, 11, 12] }
        let newSetting = schemas.rab;
        let valueAwal, valuePak;

        if (this.statusAPBDes == 'PAK') {
            valueAwal = false;
            valuePak = 'text';
        }
        else {
            valueAwal = 'text';
            valuePak = false;
        }

        newSetting.map((c, i) => {
            if (setEditor.awal.indexOf(i) !== -1)
                c.editor = valueAwal;
            if (setEditor.pak.indexOf(i) !== -1)
                c.editor = valuePak;
        })

        this.hots['rab'].updateSettings({ columns: newSetting })
        this.hots['rab'].render();
    }

    getSourceDataWithSums(): any[] {
        let data = this.hots['rab'].sumCounter.dataBundles.map(c => schemas.objToArray(c, schemas.rab));
        return data
    }

    getCurrentDiffs(): any {
        let res = {};
        let keys = Object.keys(this.initialDatasets);

        keys.forEach(key => {
            let sourceData = this.hots[key].getSourceData();
            if(key == 'rab')
                sourceData = this.getSourceDataWithSums();
            let initialData = this.initialDatasets[key];
            let diffs = this.diffTracker.trackDiff(initialData, sourceData);
            res[key] = diffs;
        });

        return res;   
    }


    saveContentToServer() {
        this.sheets.forEach(sheet => {
            this.pageSaver.bundleData[sheet] = this.hots[sheet].getSourceData();
        });

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent('penganggaran', this.desa.tahun, false, this.progressListener.bind(this), 
        (err, data) => {
            if(err)
                this.toastr.error(err);
            else
                this.toastr.success('Data berhasil disimpan ke server');

            this.dataApiService.writeFile(data, this.sharedService.getPenganggaranFile(), null);
        });
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

    saveContent() {
        $('#modal-save-diff').modal('hide');
        let me = this;
        let diffs = {};

        this.sheets.forEach(sheet => {
            let sourceData = [], initialData = [];
            initialData = this.initialDatasets[sheet];
            if(sheet == 'rab')                
                sourceData = this.getSourceDataWithSums();
            else 
                sourceData = this.hots[sheet].getSourceData();
            
            this.pageSaver.bundleData[sheet] = sourceData;

            diffs[sheet] = this.trackDiffs(initialData, sourceData);
        });

        this.contentManager.saveDiffs(diffs, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Berhasil!', '');
                this.saveContentToServer();
                
                this.siskeudesService.updateSumberdanaTaKegiatan(this.desa.Kd_Desa, response => {
                    CATEGORIES.forEach(category => {
                        category.currents.map(c => c.value = '');
                    })
    
                    this.contentManager.getContents().then(data => {    
                        this.sheets.forEach(sheet => {                        
                            this.hots[sheet].loadData(data[sheet])
                            
                            if(sheet == 'rab'){
                                this.hots['rab'].sumCounter.calculateAll();
                                this.initialDatasets[sheet] = this.getSourceDataWithSums().map(c => c.slice());
                            }
                            else
                                this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
    
                            if(sheet == this.activeSheet){
                                setTimeout(function() {
                                    me.hots[me.activeSheet].render();
                                }, 300);
                            }
                        })
                        this.afterSave();
                    });                
                })

                
            }
            else
                this.toastr.error('Penyimpanan Gagal!', '');
        });
    }

    postingAPBDes(model) {
        let isFilled = this.validateForm(model);
        if (isFilled) {
            this.toastr.error('Wajib Mengisi Semua Kolom Yang Bertanda (*)')
            return;
        }

        model['Tahun'] = this.year;

        this.siskeudesService.postingAPBDes(this.kodeDesa, model, this.statusAPBDes, response => {
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

    mergeContent(newBundle, oldBundle): any {
        let contentMerger = new ContentMerger(this.dataApiService);
        return contentMerger.mergeSiskeudesContent(newBundle, oldBundle, Object.keys(this.pageSaver.bundleSchemas));
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

    selectTab(sheet): void {
        let that = this;
        this.isExist = false;
        this.activeSheet = sheet;
        this.activeHot = this.hots[sheet];

        if(sheet == 'rab'){
            let bidang = [], kegiatan = [];
            let sourceData =  this.hots['kegiatan'].getSourceData().map(c =>schemas.arrayToObj(c, schemas.kegiatan));
            sourceData.forEach(row => {
                let findBidang = bidang.find(c => c.kode_bidang == row.kode_bidang);
                if(!findBidang)
                    bidang.push({ kode_bidang: row.kode_bidang, nama_bidang: row.nama_bidang });
                kegiatan.push({ kode_bidang: row.kode_bidang, kode_kegiatan: row.kode_kegiatan, nama_kegiatan: row.nama_kegiatan })
            });
            this.dataReferences['bidang'] = bidang.map(c => Object.assign({}, c));
            this.dataReferences['kegiatan'] = kegiatan.map(c => Object.assign({}, c));
        }

        setTimeout(function () {
            that.activeHot.render();
        }, 500);
    }

    trackDiffs(before, after): Diff {
        return this.diffTracker.trackDiff(before, after);
    }

    checkAnggaran(type, value) {
        if (this.model.category !== 'belanja')
            return;

        if (type == 'anggaran')
            this.anggaran = (!value) ? 0 : value;

        if (this.model.sumber_dana && this.model.sumber_dana !== "null") {
            let anggaran = this.anggaranSumberdana.anggaran[this.model.sumber_dana];
            let sisaAnggaran = anggaran - this.anggaranSumberdana.terpakai[this.model.sumber_dana];

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

    openAddRowDialog(): void {
        this.model = {};
        this.contentSelection = {};
        if(this.activeSheet == 'rab'){
            let selected = this.activeHot.getSelected();
            let category = 'pendapatan';
            let sourceData = this.hots['rab'].getSourceData();

            if (selected) {
                let data = this.hots['rab'].getDataAtRow(selected[1]);
                let currentCategory = CATEGORIES.find(c => c.code.slice(0, 2) == data[1].slice(0, 2));
            }

            this.model.category = category;
            this.setDefaultValue();
            this.categoryOnChange(category);
        }
        else {
            this.setDefaultValue();
        }
        $('#modal-add-' + this.activeSheet).modal('show');
        
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

        if(this.activeSheet == 'kegiatan'){
            this.model.kode_bidang = '';
            this.model.kode_kegiatan = '';
        }

        if (!this.model.rap)
            this.model.rap = 'rap';

        if (this.model.category == 'belanja') {
            if (this.model.rab == 'rab')
                model = ['kode_bidang', 'kode_kegiatan', 'jenis', 'obyek'];
            else
                model = ['kode_bidang', 'kode_kegiatan', 'obyek', 'sumber_dana'];
        }
        else if (this.model.category !== 'belanja' && this.model.category) {
            if (this.model.rap == 'rap')
                model = ['kelompok', 'jenis', 'obyek'];
            else
                model = ['obyek', 'sumber_dana'];
        }

        if (this.model.rab == 'rab_rinci' || this.model.rap == 'rap_rinci') {
            this.model.jumlah_satuan = 0;
            this.model.biaya = 0;
            this.model.uraian = '';
            this.model.harga_satuan = 0;
        }

        model.forEach(c => {
            this.model[c] = null;
        });
    }

    addRow(data): void {
        let me = this;
        let position = 0;
        let sourceData = this.activeHot.getSourceData().map(c => schemas.arrayToObj(c, schemas[this.activeSheet]));
        let contents = [];

        let positions = { kelompok: 0, jenis: 0, obyek: 0, kode_kegiatan: 0, kode_bidang:0, akun: 0,  }
        let types = ['kelompok', 'jenis', 'obyek'];
        let currentKodeKegiatan = '', oldKodeKegiatan = '', isSmaller = false;
        let same = [];
        let isAkunAdded = false, isBidangAdded= false, isKegiatanAdded = false;
        let category = CATEGORIES.find(c => c.name == data.category);

        //add row for kegiatan
        if(this.activeSheet == 'kegiatan'){
            let result = [];

            sourceData.forEach((content, i) => {
                if (data['kode_kegiatan'] > content.kode_kegiatan)
                    position = i + 1;
            });

            data['id'] = `${data.kode_bidang}_${data.kode_kegiatan}`;            
            data['nama_bidang'] = this.dataReferences['refBidang'].find(c => c.Kd_Bid == data.kode_bidang).Nama_Bidang;
            data['nama_kegiatan'] = this.dataReferences['refKegiatan'].find(c => c.Kd_Keg == data.kode_kegiatan).Nama_Kegiatan;            
            result = schemas.objToArray(data, schemas.kegiatan);

            this.activeHot.alter("insert_row", position);
            this.activeHot.populateFromArray(position, 0, [result], position, result.length-1, null, 'overwrite');            
            this.activeHot.selectCell(position, 0, position, 5, true, true);

            setTimeout(function() {
                me.activeHot.render();
            }, 300);

            return;
        }

        //add row for rab
        if (this.isExist || this.isAnggaranNotEnough)
            return;

        if (data.rap == 'rap_rinci' || data.rab == 'rab_rinci') {
            let lastCode = data['obyek'].slice(-1) == '.' ? data['obyek'] + '00' : data['obyek'] + '.00';

            if(data['obyek'].startsWith('5.1.3'))
                lastCode = data['obyek_rab_sub']+'.00';

            for (let i = 0; i < sourceData.length; i++) {
                let content = sourceData[i];
                let dotCount = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length - 1 : content.kode_rekening.split('.').length;
                let dotCountBid = (content.kode_kegiatan.slice(-1) == '.') ? content.kode_kegiatan.split('.').length - 1 : content.kode_kegiatan.split('.').length;

                if (data.category == 'pendapatan' || data.category == 'pembiayaan') {
                    if (content.kode_rekening.startsWith(data['obyek'])) {
                        position = i + 1;
                        lastCode = (dotCount == 5) ? content.kode_rekening : data['obyek'] + '00';
                    }
                }
                else {
                    if (dotCountBid == 4)
                        currentKodeKegiatan = content.kode_kegiatan;

                    if (currentKodeKegiatan !== data['kode_kegiatan']) continue;
                    if (content.kode_rekening == '' || !content.kode_rekening.startsWith('5.')) continue;

                    if (content.kode_rekening.startsWith(data['obyek'])) {
                        position = i + 1;
                        let dotCountCompare = data['obyek'].startsWith('5.1.3') ? 6 : 5;

                        if (content.kode_rekening && dotCount == dotCountCompare)
                            lastCode = content.kode_rekening;
                    }
                }

            }

            let results = [];
            let fields = CATEGORIES.find(c => c.name == data.category).fields;
            let splitLastCode = lastCode.slice(-1) == '.' ? lastCode.slice(0, -1).split('.') : lastCode.split('.');
            let digits = splitLastCode[splitLastCode.length - 1];
            let fieldAliases = valueToPropName(FIELD_ALIASES.rab);

            if (data['jumlah_satuan'] == 0)
                data['jumlah_satuan'] = '0';
            if (data['harga_satuan'] == 0)
                data['harga_satuan'] = '0';

            data['jumlah_satuan_pak'] = data['jumlah_satuan'];
            data['harga_satuan_pak'] = data['harga_satuan'];

            if (me.statusAPBDes == 'PAK') {
                data['jumlah_satuan'] = '0';
                data['harga_satuan'] = '0';
            }

            data['kode_rekening'] = splitLastCode.slice(0, splitLastCode.length - 1).join('.') + '.' + ("0" + (parseInt(digits) + 1)).slice(-2);
            fields[fields.length - 1].forEach(c => {
                let key = fieldAliases[c];
                let value = (data[key]) ? data[key] : "";

                if(c == 'Obyek_Rincian' || c == 'Kode_Rincian')
                    value = data.kode_rekening;
                
                results.push(value)
            });

            contents.push(results);
        }

        else if (data.rab == 'rab_sub' && data.category == 'belanja') {
            let lastCode = data['obyek'] + '00';

            for (let i = 0; i < sourceData.length; i++) {
                let content = sourceData[i];
                let dotCountBid = (content.kode_kegiatan.slice(-1) == '.') ? content.kode_kegiatan.split('.').length - 1 : content.kode_kegiatan.split('.').length;
                let dotCount = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length - 1 : content.kode_rekening.split('.').length;

                if (content.kode_kegiatan && dotCountBid == 4)
                    currentKodeKegiatan = content.kode_kegiatan;

                if (currentKodeKegiatan !== data['kode_kegiatan']) continue;
                if (content.kode_rekening == '' || !content.kode_rekening.startsWith('5.')) continue;

                let isObyek = (data['obyek'] > content.kode_rekening);
                let isParent = (content.kode_rekening.startsWith(data['obyek']));

                if (isObyek && isParent) {
                    positions.obyek = i + 1;
                    isSmaller = true;
                }
                else if (!isObyek && isParent && !isSmaller)
                    positions.obyek = i + 1;

                if (content.kode_rekening.startsWith(data["obyek"]) && dotCount == 5)
                    lastCode = content.kode_rekening;
            }

            let splitLastCode = lastCode.slice(-1) == '.' ? lastCode.slice(0, -1).split('.') : lastCode.split('.');
            let digits = splitLastCode[splitLastCode.length - 1];
            let newCode = splitLastCode.slice(0, splitLastCode.length - 1).join('.') + '.' + ("0" + (parseInt(digits) + 1)).slice(-2);

            position = positions.obyek;
            contents.push([newCode, data['kode_kegiatan'], data['uraian']])
        }
        else {
            for (let i = 0; i < sourceData.length; i++) {
                let content = sourceData[i];
                let dotCount = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length - 1 : content.kode_rekening.split('.').length;

                //Berhenti mengulang saat menambahkan pendaptan, jika kode rekening dimulai dengan 5
                if (content.kode_rekening == '5.' && data.category == 'pendapatan')
                    break;
                
                //Cek apakah kode rekening 4. /5. /6. sudah ada
                let code = (category.name == 'belanja') ? data['jenis'] : data['kelompok'];
                if(code.startsWith(content.kode_rekening) && dotCount == 1){
                    if(content.kode_rekening == category.code){
                        isAkunAdded = true;
                    }
                }
                
                position = i + 1;
                if (data.category == 'pendapatan' || data.category == 'pembiayaan') {
                    if(category.code > content.kode_rekening)
                        positions.akun = i+1;

                    if (data.category == 'pembiayaan' && !content.kode_rekening.startsWith('6.'))
                        continue;

                    if (data['kelompok'] < content.kode_rekening && dotCount == 2){
                        positions.kelompok = i;
                    }

                    let isJenis = (data['jenis'] < content.kode_rekening);
                    let isParent = (content.kode_rekening.startsWith(data['kelompok']));

                    if (isJenis && isParent && dotCount == 3)
                        positions.jenis = i;

                    if (!isJenis && isParent) {
                        positions.jenis = i + 1;
                    }

                    let isObyek = (data['obyek'] > content.kode_rekening);
                    isParent = (content.kode_rekening.startsWith(data['jenis']));

                    if (isObyek && isParent) {
                        positions.obyek = i + 1;
                        isSmaller = true;
                    }

                    if (!isObyek && isParent && !isSmaller)
                        positions.obyek = i + 1;

                    if (content.kode_rekening == data[TypesBelanja[dotCount]])
                        same.push(TypesBelanja[dotCount]);

                }
                else {
                    //jika row selanjutnya adalah pembiayaan berhenti mengulang
                    if(content.kode_rekening.startsWith('6.'))
                        break;

                    let dotCountBidOrKeg = (content.kode_kegiatan.slice(-1) == '.') ? content.kode_kegiatan.split('.').length - 1 : content.kode_kegiatan.split('.').length;
                    if(!content.kode_kegiatan || content.kode_kegiatan != ""){
                        if(data.kode_bidang == content.kode_kegiatan)
                            isBidangAdded = true;
                        else if(data.kode_kegiatan == content.kode_kegiatan)
                            isKegiatanAdded = true;
                    }
                    
                    if(category.code > content.kode_rekening)
                        positions.akun = i+1;

                    if(data.kode_bidang > content.Id)
                        positions.kode_bidang = i+1;

                    if(data.kode_kegiatan > content.Id)
                        positions.kode_kegiatan = i+1;

                    if(content.kode_kegiatan)
                    if(category.code > content.kode_rekening)
                        positions.akun = i+1;

                    if (data.obyek.startsWith('5.1.3') && data['rab']== 'rab_sub') {
                        data.obyek = data.obyek_rab_sub;
                    }
                    
                    if (content.kode_kegiatan && dotCountBidOrKeg == 4)
                        currentKodeKegiatan = content.kode_kegiatan;

                    if (currentKodeKegiatan !== data['kode_kegiatan']) 
                        continue;

                    if (content.kode_rekening == data[TypesBelanja[dotCount]])
                        same.push(TypesBelanja[dotCount]);

                    if (content.kode_rekening == '' || !content.kode_rekening.startsWith('5.')) continue;

                    let isJenis = (data['jenis'] < content.kode_rekening && dotCount == 3);

                    if (isJenis && dotCount == 3)
                        positions.jenis = i;

                    if (!isJenis && data['jenis'] > content.kode_rekening)
                        positions.jenis = i + 1;

                    let isObyek = (data['obyek'] > content.kode_rekening);
                    let isParent = (content.kode_rekening.startsWith(data['jenis']))


                    if (isObyek && isParent) {
                        positions.obyek = i + 1;
                        isSmaller = true;
                    }

                    if (!isObyek && isParent && !isSmaller)
                        positions.obyek = i + 1;
                }
            }
            
            
            let isRincian = (category.name == 'belanja' && data.rab == 'rab' ) ?  
                true : (data.rap == 'rap' && category.name !== 'belanja'? true : false);

            //tambahkan detail akun (4. pendapatan /5. belanja/ 6. pembiayaan)
            if(isRincian){
                if(!isAkunAdded)
                    contents.push([category.code,'',category.name.toUpperCase()])

                //jika bidang belum ditambahkan push bidang
                if(!isBidangAdded && category.name == 'belanja'){
                    let bidang = this.dataReferences['Bidang'].find(c => c.Kd_Bid == data.kode_bidang);
                    contents.push(['',bidang.Kd_Bid, bidang.Nama_Bidang])
                }
    
                //jika kegiatan belum ditambahkan push kegiatan
                if(!isKegiatanAdded && category.name == 'belanja'){
                    let kegiatan = this.dataReferences['kegiatan'].find(c => c.Kd_Keg == data.kode_kegiatan)
                    contents.push(['',kegiatan.Kd_Keg, kegiatan.Nama_Kegiatan])
                }
            }

            //jika category == belanja, hapus Jenis pada types
            types = (data.category == 'belanja') ? types.slice(1) : types;

            types.forEach(value => {
                //jika rincian sudah ditambahkan pada 1 kode rekening, skip
                if (same.indexOf(value) !== -1) return;
                let content = this.dataReferences[value].find(c => c[0] == data[value]).slice();
                
                if(content && data['kode_kegiatan'])
                    content[1] = data['kode_kegiatan'];

                content ? contents.push(content) : '';
            });

            if(!isAkunAdded && isRincian)
                position = positions.akun;
            else if(category.name == 'belanja' && isRincian && same.length == 0){
                if(isAkunAdded && !isBidangAdded)
                    position = positions.kode_bidang;
                else if(isBidangAdded && !isKegiatanAdded)
                    position = positions.kode_kegiatan; 
                else if(isKegiatanAdded)
                    position = positions.jenis;
            }
            else 
                position = (same.length == 0 && positions[types[0]] == 0) ? position  : positions[types[same.length]];            
        }

        let start = position, end = 0;
        contents.forEach((content, i) => {
            let newPosition = position + i;
            this.activeHot.alter("insert_row", newPosition);
            let newContent = content.slice();
            end = newPosition;

            let row = this.contentManager.generateRabId(newContent, data.kode_kegiatan);
            this.activeHot.populateFromArray(newPosition, 0, [row], newPosition, row.length - 1, null, 'overwrite');
        })

        this.activeHot.selectCell(start, 0, end, 7, true, true);
        setTimeout(function () {
            if(me.hots['rab'].sumCounter){
                me.hots['rab'].sumCounter.calculateAll();
                me.calculateAnggaranSumberdana();
            }
            me.activeHot.render();
        }, 300);
    }
    

    addOneRow(model): void {
        let isValid = this.validateForm(model);

        if(!isValid){
            this.addRow(model);
            $("#modal-add-"+this.activeSheet).modal("hide");
        }
    }

    addOneRowAndAnother(model): void {
        let isValid = this.validateForm(model);

        if(!isValid)
            this.addRow(model);        
    }

    validateIsExist(value, message) {
        let sourceData = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas[this.activeSheet]));
        this.messageIsExist = message;

        if(this.activeSheet == 'kegiatan'){
            if (sourceData.length < 1)
                this.isExist = false;
    
            for (let i = 0; i < sourceData.length; i++) {
                if (sourceData[i].kode_kegiatan == value) {
                    this.zone.run(() => {
                        this.isExist = true;
                    })
                    break;
                }
                this.isExist = false;
            }
        }
        else {
            if (this.model.category == 'belanja' && this.model.rab != 'rab_rinci') {
                let currentKdKegiatan = '';
    
                for (let i = 0; i < sourceData.length; i++) {
                    let codeKeg = sourceData[i].kode_kegiatan;
                    let lengthCode = codeKeg.split('.').length - 1;
    
                    if (lengthCode == 4)
                        currentKdKegiatan = codeKeg;
    
                    if (currentKdKegiatan == this.kegiatanSelected) {
                        if (value == sourceData[i].kode_rekening) {
                            this.isExist = true;
                            break;
                        }
                    }
                    this.isExist = false;
                }
                return;
            }
    
            for (let i = 0; i < sourceData.length; i++) {
                if (sourceData[i].kode_rekening == value) {
                    this.isExist = true;
                    break;
                }
                this.isExist = false;
            }
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

                Object.assign(this.dataReferences, this.dataReferences['pendapatan']);
                break;

            case "belanja":
                this.model.rab = 'rab';
                this.model.rap = 'rap';

                Object.assign(this.dataReferences, this.dataReferences['belanja']);
                break;

            case "pembiayaan":
                this.model.rap = 'rap';
                this.model.rab = 'rab';

                Object.assign(this.dataReferences, this.dataReferences['pembiayaan']);
                let value = this.dataReferences['kelompok'].filter(c => c[0] == '6.1.');
                this.dataReferences['kelompok'] = value;
                break;
        }

    }

    typeOnClick(selector, value): void {
        this.isExist = false;
        this.isObyekRABSub = false;
        this.isAnggaranNotEnough = false;
        this.anggaran = 0;
        this.contentSelection = {};

        if (value == 'rab_rinci' || value == 'rap_rinci') {
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
                let sourceData = this.hots['rab'].getSourceData();

                //harus di perbaiki
                let data = sourceData.filter(o => {
                    let lengthCode = o[1].slice(-1) == '.' ? o[1].split('.').length - 1 : o[1].split('.').length;
                    return o[1].startsWith(code) && lengthCode == 4
                });
                this.contentSelection["availableObyek"] = data;
                break;
            case "rab":
                this.model.rab = value;
                this.setDefaultValue();

                if (value == 'rab_sub') {
                    this.dataReferences['rabSub'] = this.getReffRABSub();
                    break;
                }

                if (this.kegiatanSelected != '' && value == 'rab_rinci') {
                    this.model.rab = value;
                    this.selectedOnChange('kegiatan', this.kegiatanSelected);
                }
                break;
        }
    }

    selectedOnChange(selector, value) {
        let data = [];
        let results = [];

        if(this.activeSheet == 'kegiatan'){
            this.contentSelection['refKegiatan'] = this.dataReferences['refKegiatan'].filter(c => c.Kd_Keg.startsWith(value))
        }
        else {
            if(this.model.category !== 'belanja'){
                this.isExist = false;
                let type = (selector == 'kelompok') ? 'jenis' : 'obyek';

                if (selector == 'kelompok') {
                    this.setDefaultValue();
                    if (value !== null || value != 'null')
                        this.model.kelompok = value;
                }

                data = this.dataReferences[type];
                results = data.filter(c => c[0].startsWith(value));
                let ucFirst = type.charAt(0).toUpperCase() + type.slice(1)
                this.contentSelection['content' + ucFirst] = results;
            }
            else {
                switch (selector) {
                    case "bidang":
                        this.isObyekRABSub = false;
                        this.contentSelection = {};
                        this.setDefaultValue();
                        this.kegiatanSelected = '';

                        if (value !== null || value != 'null')
                            this.model.kode_bidang = value;

                        this.contentSelection['contentKegiatan'] = [];
                        data = this.dataReferences['kegiatan'].filter(c => c.kode_bidang == value);
                        this.contentSelection['contentKegiatan'] = data;
                        break;

                    case "kegiatan":
                        this.kegiatanSelected = value;

                        if (this.model.rab == 'rab')
                            break;

                        this.contentSelection['obyekAvailable'] = [];
                        let sourceData = this.hots['rab'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                        let contentObyek = [];
                        let currentCodeKeg = '';

                        sourceData.forEach(content => {
                            if(content.kode_rekening && content.kode_rekening != "" )
                                if(content.kode_rekening.startsWith('4.') || content.kode_rekening.startsWith('6.'))
                                    return;                                

                            let lengthCodeKeg = (content.kode_kegiatan.slice(-1) == '.') ? content.kode_kegiatan.split('.').length - 1 : content.kode_kegiatan.split('.').length;
                            let lengthCodeRek = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length - 1 : content.kode_rekening.split('.').length;

                            if (lengthCodeKeg == 4) {
                                currentCodeKeg = content.kode_kegiatan;
                                return;
                            }

                            if (currentCodeKeg == value && lengthCodeRek == 4)
                                contentObyek.push(content);
                        });

                        this.contentSelection['obyekAvailable'] = contentObyek.map(c => schemas.objToArray(c, schemas.rab));
                        break;

                    case "jenis":
                        this.contentSelection['contentObyek'] = [];
                        data = this.dataReferences['belanja']['obyek'].filter(c => c[0].startsWith(value));
                        this.contentSelection['contentObyek'] = data;
                        break;

                    case "obyek":
                        let codeBelanjaModal = '5.1.3.';
                        let currentKdKegiatan = '';

                        if (value.startsWith(codeBelanjaModal)) {
                            this.isObyekRABSub = true;

                            if (this.model.rab == "rab_sub")
                                break;

                            let sourceData = this.hots['rab'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                            let results = [];

                            sourceData.forEach(content => {
                                let code = content.kode_rekening;
                                let lengthCodeRek = (code.slice(-1) == '.') ? code.split('.').length - 1 : code.split('.').length;
                                let lengthCodeKeg = (content.kode_kegiatan.slice(-1) == '.') ? content.kode_kegiatan.split('.').length - 1 : content.kode_kegiatan.split('.').length;

                                if (lengthCodeKeg == 4)
                                    currentKdKegiatan = content.kode_kegiatan;

                                if (currentKdKegiatan == this.kegiatanSelected) {
                                    if (code.startsWith(value) && lengthCodeRek == 5)
                                        results.push(content);
                                }
                            });

                            this.model.obyek_rab_sub = null;
                            this.contentSelection['rabSubAvailable'] = results.map(c => schemas.objToArray(c, schemas.rab));
                            break;
                        }

                        this.isObyekRABSub = false;
                        break;

                    case 'rabSubBidang':
                        this.setDefaultValue();

                        if (value !== null || value != 'null')
                            this.model.kode_bidang = value;

                        this.contentSelection['rabSubKegiatan'] = this.dataReferences.rabSub.rabSubKegiatan.filter(c => c.kode_kegiatan.startsWith(value));
                        break;

                    case 'rabSubKegiatan':
                        this.contentSelection['rabSubObyek'] = this.dataReferences.rabSub.rabSubObyek.filter(c => c.kode_kegiatan == value);
                        break;
                }
            }
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
        this.dataReferences['rabSub'] = { rabSubBidang: [], rabSubKegiatan: [], rabSubObyek: [] };
        let category = CATEGORIES.find(c => c.code == '4.')
        this.getReferencesByCode(category, pendapatan => {                
            this.dataReferences['pendapatan'] = pendapatan;
            let category = CATEGORIES.find(c => c.code == '5.')

            this.getReferencesByCode(category, pendapatan => {  
                this.dataReferences['belanja'] = pendapatan;                    
                let category = CATEGORIES.find(c => c.code == '6.')

                this.getReferencesByCode(category, pendapatan => { 
                    this.dataReferences['pembiayaan'] = pendapatan; 
                    
                    this.dataReferences.get("refBidang").then(data =>{
                        this.dataReferences['refBidang'] = data.map(c => { c['Kd_Bid'] = kdDesa + c.Kd_Bid; return c });

                        this.dataReferences.get("refKegiatan").then(data => {
                            this.dataReferences['refKegiatan'] =  data.map(c => { c['Kd_Keg'] = kdDesa + c.ID_Keg; return c });

                            this.siskeudesService.getTaBidangAvailable(kdDesa, data => {
                                this.dataReferences['bidangAvailable'] = data;
                            })
                        }) 
                    })
                })
            })
        })
    }

    async getReferencesByCode(category,callback){
         this.siskeudesService.getRefRekByCode(category.code, data => {
            let returnObject = (category.name != 'belanja') ? { kelompok: [], jenis: [], obyek: [] } : { jenis: [], obyek: [] };
            let endSlice = (category.name != 'belanja') ? 4 : 5;
            let startSlice = (category.name != 'belanja') ? 1 : 3;
            let fields = category.fields.slice(startSlice, endSlice);
            let currents = category.currents.slice(startSlice, endSlice);
            let results = this.reffTransformData(data, fields, currents, returnObject);
            callback(results)
        })
    }

    calculateAnggaranSumberdana() {
        let sourceData = this.hots['rab'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let results = { anggaran: {}, terpakai: {} }

        this.dataReferences["refSumberDana"].forEach(item => {
            results.anggaran[item.Kode] = 0;
            results.terpakai[item.Kode] = 0;
        });

        sourceData.forEach(row => {
            if (!row.kode_rekening)
                return;

            let dotCount = row.kode_rekening.slice(-1) == '.' ? row.kode_rekening.split('.').length - 1 : row.kode_rekening.split('.').length;

            if (dotCount == 6 && row.kode_rekening.startsWith('5.1.3')) {
                let anggaran = row.jumlah_satuan * row.harga_satuan;
                results.terpakai[row.sumber_dana] += anggaran;
            }

            if (dotCount !== 5)
                return;

            if (row.kode_rekening.startsWith('6.') || row.kode_rekening.startsWith('4.')) {
                let anggaran = row.jumlah_satuan * row.harga_satuan;
                results.anggaran[row.sumber_dana] += anggaran;
            }
            else if (!row.kode_rekening.startsWith('5.1.3')) {
                let anggaran = row.jumlah_satuan * row.harga_satuan;
                results.terpakai[row.sumber_dana] += anggaran;
            }
        });
        this.anggaranSumberdana = results;
    }

    getReffRABSub(): any {
        let sourceData = this.hots['rab'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let results = { rabSubBidang: [], rabSubKegiatan: [], rabSubObyek: [] };
        let current = { bidang: { kode_bidang: '', uraian: '' }, kegiatan: { kode_kegiatan: '', uraian: '' }, obyek: { obyek: '', uraian: '' } }
    
        sourceData.forEach(row => {
            let dotCount = row.kode_rekening.slice(-1) == '.' ? row.kode_rekening.split('.').length - 1 : row.kode_rekening.split('.').length;
            let dotCountBidOrKeg = row.kode_kegiatan.slice(-1) == '.' ? row.kode_kegiatan.split('.').length - 1 : row.kode_kegiatan.split('.').length;
    
            if (dotCountBidOrKeg == 3) {
                current.bidang.kode_bidang = row.kode_kegiatan;
                current.bidang.uraian = row.uraian;
            }
            if (dotCountBidOrKeg == 4) {
                current.kegiatan.kode_kegiatan = row.kode_kegiatan;
                current.kegiatan.uraian = row.uraian;
            }
    
            if (row.kode_rekening.startsWith('5.1.3') && dotCount == 4) {
                if (!results.rabSubBidang.find(c => c.kode_bidang == current.bidang.kode_bidang))
                    results.rabSubBidang.push(Object.assign({}, current.bidang));
    
                if (!results.rabSubKegiatan.find(c => c.kode_kegiatan == current.kegiatan.kode_kegiatan))
                    results.rabSubKegiatan.push(Object.assign({}, current.kegiatan))
    
                results.rabSubObyek.push({ kode_kegiatan: current.kegiatan.kode_kegiatan, obyek: row.kode_rekening, uraian: row.uraian });
            }
        });
        return results;
    }

    validateForm(model): boolean {
        let result = false;

        if(this.activeSheet == 'kegiatan'){
            let requiredForm = ['kode_bidang', 'kode_kegiatan'];
            let aliases = {kode_bidang: 'Bidang', kode_kegiatan:'Kegiatan'}

            requiredForm.forEach(col => {
                if(model[col] == '' || !model[col]){
                    result = true;
                    if(aliases[col])
                        col = aliases[col];
                    this.toastr.error(`Kolom ${col} Tidak Boleh Kosong`);
                    
                }
            })
            return result;
        }

        if (model.category == 'pendapatan' || model.category == 'pembiayaan') {
            let requiredForm = { rap: ['kelompok', 'jenis', 'obyek'], rap_rinci: ['obyek', 'uraian'] }

            for (let i = 0; i < requiredForm[model.rap].length; i++) {
                let col = requiredForm[model.rap][i];

                if (model[col] == '' || !model[col]) {
                    result = true;
                    this.toastr.error(`Kolom ${col} Tidak Boleh Kosong!`,'')
                }
            }
            if (model.rap == 'rap_rinci') {
                if (!model.sumber_dana){
                    result = true;
                    this.toastr.error(`Kolom Sumberdana Tidak Boleh Kosong`,'')
                }
            }
            return result;
        }

        if (model.category == 'belanja') {
            let requiredForm = { 
                rab: ['kode_bidang', 'kode_kegiatan', 'jenis', 'obyek'], 
                rab_sub: ['kode_bidang', 'kode_kegiatan', 'obyek', 'uraian'], 
                rab_rinci: ['kode_bidang', 'kode_kegiatan', 'obyek', 'sumber_dana', 'uraian'] 
            }
            let aliases = { kode_bidang: 'Bidang', kode_kegiatan: 'Kegiatan!' };

            for (let i = 0; i < requiredForm[model.rab].length; i++) {
                let col = requiredForm[model.rab][i];

                if (model[col] == '' || !model[col]) {
                    result = true;
                    if(aliases[col])
                        col = aliases[col];
                    this.toastr.error(`Kolom ${col} Tidak Boleh Kosong!`,'');
                }
            }
            if (model.rab == 'rab_rinci') {
                if (!model.sumber_dana)
                    result = true;
            }
            return result;
        }

        if (model.tabActive == 'posting-apbdes') {
            let requiredForm = ['KdPosting', 'No_Perdes', 'TglPosting'];
            let aliases = {KdPosting: 'Jenis Posting', TglPosting: 'Tanggal Posting'}

            for (let i = 0; i < requiredForm.length; i++) {
                let col = requiredForm[i];

                if (model[col] == '' || !model[col]) {
                    result = true;

                    if(aliases[col])
                        col = aliases[col];
                    this.toastr.error(`Kolom ${col} Tidak Boleh Kosong!`,'');
                }
            }
            return result;
        }
    }

    keyupListener = (e) => {
        // ctrl+s
        if (e.ctrlKey && e.keyCode === 83) {
            this.pageSaver.onBeforeSave();
            e.preventDefault();
            e.stopPropagation();
        }
        // ctrl+p
        else if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

}