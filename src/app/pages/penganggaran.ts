import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastsManager } from 'ng2-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { KeuanganUtils } from '../helpers/keuanganUtils';
import { Importer } from '../helpers/importer';
import { PersistablePage } from '../pages/persistablePage';
import { FIELD_ALIASES, fromSiskeudes, toSiskeudes } from '../stores/siskeudesFieldTransformer';
import { CATEGORIES, PenganggaranContentManager } from '../stores/siskeudesContentManager';

import DataApiService from '../stores/dataApiService';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';
import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

import schemas from '../schemas';
import TableHelper from '../helpers/table';
import titleBar from '../helpers/titleBar';
import PageSaver from '../helpers/pageSaver';

import * as $ from 'jquery';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import * as path from 'path';
import { DiffTracker } from "../helpers/diffs";

var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');

const SHOW_COLUMNS = [
    schemas.rab.filter(e => e.field !== 'id').map(e => e.field),
    ["kode_rekening", "kode_kegiatan", "uraian", "sumber_dana", "jumlah_satuan", "satuan", "harga_satuan", "anggaran"],
    ["kode_rekening", "kode_kegiatan", "uraian", "sumber_dana", "jumlah_satuan_pak", "satuan", "harga_satuan_pak", "anggaran_pak", "perubahan"],
];

enum TypesBelanja { kelompok = 2, jenis = 3, obyek = 4 }
enum JenisPosting { "Usulan APBDes" = 1, "APBDes Awal tahun" = 2, "APBDes Perubahan" = 3 }

@Component({
    selector: 'penganggaran',
    templateUrl: '../templates/penganggaran.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
})

export default class PenganggaranComponent extends KeuanganUtils implements OnInit, OnDestroy, PersistablePage {
    type = "penganggaran";
    subType = null;

    bundleSchemas = schemas.penganggaranBundle;

    hots: any = {};
    activeHot: any = {};
    sheets: any[];
    activeSheet: string;
    tableHelpers: any = {};

    initialDatasets: any = {};
    contentsPostingLog: any[] = [];
    statusPosting: any = {};
    
    year: string;
    activePageMenu: string;

    dataReferences: SiskeudesReferenceHolder;
    contentSelection: any = {};
    desa: any = {};

    contentManager: PenganggaranContentManager;
    isExist: boolean;
    isObyekRABSub: boolean;

    anggaran: any;
    anggaranSumberdana: any = {};
    isAnggaranNotEnough: boolean;

    statusAPBDes: string;
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
    resultBefore: any[];
    isEmptyRabSub: boolean;
    isReset: boolean;
    temp: any;

    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,
        private siskeudesService: SiskeudesService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        public router: Router,
        public toastr: ToastsManager,
        private route: ActivatedRoute,
        private vcr: ViewContainerRef,
    ) {
        super(dataApiService);
        this.toastr.setRootViewContainerRef(vcr);        
        this.pageSaver = new PageSaver(this);
        this.dataReferences = new SiskeudesReferenceHolder(siskeudesService);
    }

    ngOnInit() {
        let me = this;

        titleBar.title('Data Penganggaran - ' + this.dataApiService.auth.desa_name);
        titleBar.blue();

        this.resultBefore = [];
        this.isExist = false;
        this.isObyekRABSub = false;
        this.initialDatasets = { rab: [], kegiatan: [] };
        this.model.tabActive = null;
        this.tabActive = 'posting';
        this.contentsPostingLog = [];
        this.statusPosting = { '1': false, '2': false, '3': false }
        this.sheets = ['kegiatan', 'rab'];
        this.activeSheet = 'kegiatan';
        this.modalSaveId = 'modal-save-diff';
        this.tableHelpers = { kegiatan: {}, rab: {} }
        this.pageSaver.bundleData = { kegiatan: [], rab: [] };        

        document.addEventListener('keyup', this.keyupListener, false);
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);

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
            titleBar.title('Data Penganggaran '+ this.year+' - ' + this.dataApiService.auth.desa_name);
            this.subType = this.year;

            var data = await this.siskeudesService.getTaDesa();
            this.desa = data[0];
            
            this.contentManager = new PenganggaranContentManager(
                this.siskeudesService, this.desa, this.dataReferences)
            this.statusAPBDes = this.desa.status;
            this.setEditor();
            
            let filterValue = this.statusAPBDes == 'AWAL' ? '1' : '2';
            $(`input[name=btn-filter][value='${filterValue}']`).prop('checked', true);
            
            
            data = await this.contentManager.getContents();
            this.pageSaver.writeSiskeudesData(data);
            this.activeHot = this.hots['kegiatan'];

            this.sheets.forEach(sheet => {                        
                this.hots[sheet].loadData(data[sheet])
                this.initialDatasets[sheet] = data[sheet].map(c => c.slice());                    
                this.pageSaver.bundleData[sheet] = data[sheet].map(c => c.slice());  
            })

            data = await this.dataReferences.get("refSumberDana");
            let sumberDana = data.map(c => c.Kode);
            let rabSetting = schemas.rab.map(c => Object.assign({}, c));

            rabSetting.forEach(c => {
                if(c.field == "sumber_dana")
                    c['source'] = sumberDana;
            });                            

            this.hots['rab'].updateSettings({ columns: rabSetting })
            this.calculateAnggaranSumberdana();
            this.getReferences(this.desa.kode_desa);

            

            setTimeout(function () {                       
                me.hots['kegiatan'].render();
                me.filterContent();
            }, 300);
        });
    }
    
    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
        window.removeEventListener('beforeunload', this.pageSaver.beforeUnloadListener, false);
        this.sheets.forEach(sheet => {           
            if(sheet == 'rab'){
                if (this.afterRemoveRowHook)
                    this.hots['rab'].removeHook('afterRemoveRow', this.afterRemoveRowHook);            
                if (this.afterChangeHook)    
                    this.hots['rab'].removeHook('afterChange', this.afterChangeHook);
            }
            this.hots[sheet].destroy(); 
            this.tableHelpers[sheet].removeListenerAndHooks(); 
        })

        this.routeSubscription.unsubscribe();
        titleBar.removeTitle();

        if(this.penganggaranSubscription)
            this.penganggaranSubscription.unsubscribe()
        
    } 

    ngAfterViewChecked(){
        let me = this;
        if(this.isReset){
            if(this.activeSheet == 'kegiatan'){                
                this.selectedOnChange('', this.temp.kode_bidang);
                me.isReset = false;
                setTimeout(function() {                    
                    me.model.kode_bidang = me.temp.kode_bidang;
                    me.temp = null;
                }, 100);
                
            }
            else {
                this.categoryOnChange(this.temp.category);
                if(this.temp.category == 'belanja'){ 
                    this.selectedOnChange('kode_bidang', this.temp.kode_bidang);
                }
                else {
                    this.selectedOnChange('kelompok', this.temp.kelompok);
                }

                let entityName = (this.temp.category == 'belanja') ? 'kode_bidang' : 'kelompok';
                me.model.category = this.temp.category;
                me.model[entityName] = this.temp[entityName];
                me.isReset = false;
                setTimeout(function() {
                    me.calculateAnggaranSumberdana();                    
                }, 100);
            }            
        }
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
        
        this.afterRemoveRowHook = (index, amount) => {
            result.render();
        }
        result.addHook('afterRemoveRow', this.afterRemoveRowHook);

        this.afterChangeHook = (changes, source) => {
            if ((source === 'edit' || source === 'undo' || source === 'autofill') && source !== 'afterSetDataAtCell' && source !== 'none') {
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
                        let data = schemas.arrayToObj(result.getDataAtRow(row), schemas.rab);                        
                        let isSumberdana = col == 4 ? true : null;
                        let multiplier = 0, multiplierPak = 0;
                        let dataAnggaran = { 
                            prevAnggaran: data.anggaran, prevAnggaranPak: data.anggaran_pak, currentAnggaran: data.anggaran , currentAnggaranPak: data.anggaran_pak 
                        };                        

                        if(col !== 4){
                            multiplier = (col == 5) ? data.harga_satuan : data.jumlah_satuan;
                            multiplierPak = (col == 5) ? data.harga_satuan_pak : data.jumlah_satuan_pak;
                            dataAnggaran.prevAnggaran = prevValue * multiplier;
                            dataAnggaran.prevAnggaranPak = prevValue * multiplierPak
                            dataAnggaran.currentAnggaran = value * multiplier;
                            dataAnggaran.currentAnggaranPak = value * multiplierPak;
                        }
                        
                        if(me.statusAPBDes == "AWAL" && (col == 5 || col == 7)){       
                            dataAnggaran.prevAnggaranPak =   data.harga_satuan_pak * data.jumlah_satuan_pak;
                            data.anggaran = dataAnggaran.currentAnggaran ;
                            data.anggaran_pak = dataAnggaran.currentAnggaranPak;
                            data.perubahan = dataAnggaran.currentAnggaranPak - dataAnggaran.currentAnggaran;
                            
                            let entityTarget = col == 5 ? 'jumlah_satuan_pak' : 'harga_satuan_pak';
                            let entitySource = col == 5 ? 'jumlah_satuan' : 'harga_satuan';
                            data[entityTarget] = data[entitySource];
                        }

                        let isValid = me.validateAnggaranSumberdana(data, dataAnggaran, isSumberdana, prevValue);
                        
                        if(isValid){
                            me.setData(data, dataAnggaran, result, col);
                            rerender = true;
                            me.stopLooping = true;
                        }
                        else{
                            if(data.kode_rekening.startsWith('4.'))
                                me.toastr.error('Pengeluaran Untuk Sumberdana ' + data.sumber_dana + ' Lebih Besar Dari Pendapatan !', '');
                            else
                                me.toastr.error('Pendapatan Untuk Sumberdana ' + data.sumber_dana + ' Tidak Mencukupi !', '');
                            result.setDataAtCell(row, col, prevValue)
                            me.stopLooping = true;
                            return;
                        }
                    }

                    
                    if (col == 6 && me.statusAPBDes == 'AWAL') 
                        result.setDataAtCell(row, 10, value, 'none')
                    
                    if (col == 10 && me.statusAPBDes == 'PAK') 
                        result.setDataAtCell(row, 6, value, 'none')
                    
                });

                if (rerender) {
                    me.calculateAnggaranSumberdana();
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
        let setEditor = { awal: [5, 6, 7], pak: [9, 10, 11] }
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
                c['editor'] = valueAwal;
            if (setEditor.pak.indexOf(i) !== -1)
                c['editor'] = valuePak;
        })

        this.hots['rab'].updateSettings({ columns: newSetting })
        this.hots['rab'].render();
    }

    getCurrentUnsavedData(): any {
        return {
            kegiatan: this.hots['kegiatan'].getSourceData(),
            rab: this.hots['rab'].getSourceData()
        }
    }

    saveContentToServer(data) {
        this.progressMessage = 'Menyimpan Data';
        this.pageSaver.saveSiskeudesData(data);
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    async getContentPostingLog() {
        let data = await this.siskeudesService.getPostingLog();        
        this.contentsPostingLog = data;
        this.setStatusPosting();
    }

    getJenisPosting(value) {
        let num = parseInt(value);
        return JenisPosting[num];
    }

    saveContent() {
        $('#modal-save-diff').modal('hide');           
        
        let sourceDatas = {
            kegiatan: this.hots['kegiatan'].getSourceData(),
            rab: this.hots['rab'].getSourceData(),
        };

        let me = this; 
        let diffs = DiffTracker.trackDiffs(this.bundleSchemas, this.initialDatasets, sourceDatas);

        this.contentManager.saveDiffs(diffs, response => {
            if (response.length == 0) {
                this.toastr.success('Penyimpanan Berhasil!', '');
                
                this.siskeudesService.updateSumberdanaTaKegiatan(response => {
                    CATEGORIES.forEach(category => {
                        category.currents.map(c => c.value = '');
                    })
    
                    this.contentManager.getContents().then(data => {    
                        
                        this.pageSaver.writeSiskeudesData(data);
                        this.saveContentToServer(data);

                        this.sheets.forEach(sheet => {                        
                            this.hots[sheet].loadData(data[sheet])
                            this.initialDatasets[sheet] = data[sheet].map(c => c.slice());
    
                            if(sheet == this.activeSheet){
                                setTimeout(function() {
                                    me.hots[me.activeSheet].render();
                                }, 300);
                            }
                        });
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

        model['tahun'] = this.year;
        model['tanggal_posting'] = model.tanggal_posting.toString();

        this.siskeudesService.postingAPBDes(model, this.statusAPBDes, response => {
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
            if (this.contentsPostingLog.find(c => c.kode_posting == val))
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
            if (!content || content.kunci == setLock)
                return;

            if (!this.model[content.kode_posting])
                return;

            contents.push(content);
        });

        if (contents.length == 0)
            return;

        contents.forEach(content => {
            let whereClause = { kode_posting: content.kode_posting };
            let data = { kunci: setLock }

            bundle.update.push({ [table]: { whereClause: whereClause, data: toSiskeudes(data, 'posting_log') } })
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
            if (!this.model[content.kode_posting])
                return;

            if (content.kunci) {
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
            let whereClause = { KdPosting: content.kode_posting, Kd_Desa: this.desa.kode_desa };

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
        let me = this;
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
            me.activeHot.render();
            $('#form-add-'+me.activeSheet)[0]['reset']();
        }, 500);
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

            this.isAnggaranNotEnough = (this.anggaran <= sisaAnggaran) ? false : true;
        }
    }

    openAddRowDialog(): void {
        this.contentSelection['rabSubObyek'] = [];
        this.isObyekRABSub=false;
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
            this.model.kode_bidang = null;
            this.model.kode_kegiatan = null;
        }

        if (this.model.category == 'belanja') {
            model = ['kode_bidang', 'kode_kegiatan', 'jenis', 'obyek','sumber_dana'];
        }
        else {
            model = ['kelompok', 'jenis', 'obyek' , 'sumber_dana'];
        }

        this.model.jumlah_satuan = 0;
        this.model.biaya = 0;
        this.model.uraian = '';
        this.model.harga_satuan = 0;
        this.model.satuan = 'Ls';

        model.forEach(c => {
            this.model[c] = null;
        });
    }

    addRow(model, callback) {
        let me = this;
        let position = 0;
        let sourceData = this.activeHot.getSourceData().map(c => schemas.arrayToObj(c, schemas[this.activeSheet]));
        let contents = [], lastCode, lastCodeRabSub;
        let data = Object.assign({}, model);
        let positions = { kelompok: 0, jenis: 0, obyek: 0, kode_kegiatan: 0, kode_bidang:0, akun: 0, rab_sub: 0 }
        let types = ['kelompok', 'jenis', 'obyek'];
        let currentKodeKegiatan = '', oldKodeKegiatan = '', isSmaller = false;
        let same = [];
        let isAkunAdded = false, isBidangAdded= false, isKegiatanAdded = false;
        let category = CATEGORIES.find(c => c.name == data.category);

        if (this.isAnggaranNotEnough)
            return;

        //add row for kegiatan
        if(this.activeSheet == 'kegiatan'){
            let result = [];

            sourceData.forEach((content, i) => {
                if (data['kode_kegiatan'] > content.kode_kegiatan)
                    position = i + 1;
            });

            data['id'] = `${data.kode_bidang}_${data.kode_kegiatan}`;            
            data['nama_bidang'] = this.dataReferences['refBidang'].find(c => c.kode_bidang == data.kode_bidang).nama_bidang;
            data['nama_kegiatan'] = this.dataReferences['refKegiatan'].find(c => c.kode_kegiatan == data.kode_kegiatan).nama_kegiatan;            
            result = schemas.objToArray(data, schemas.kegiatan);

            this.activeHot.alter("insert_row", position);
            this.activeHot.populateFromArray(position, 0, [result], position, result.length-1, null, 'overwrite');            
            this.activeHot.selectCell(position, 0, position, 5, true, true); 
        }
        else {
            lastCode = data.obyek + '00';
            lastCodeRabSub = data.obyek+'00';

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
                
                if (data.category == 'pendapatan' || data.category == 'pembiayaan') {
                    if(category.code > content.kode_rekening)
                    positions.akun = i+1;

                    if (data.category == 'pembiayaan' && !content.kode_rekening.startsWith('6.'))
                        continue;

                    if (data['kelompok'] >= content.kode_rekening){
                        positions.kelompok = i + 1;
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
                    
                    if(content.kode_rekening.startsWith(data.obyek)){
                        position = i+1;

                        if(dotCount == 5)
                            lastCode = content.kode_rekening;                    
                    }

                }
                else {
                    //jika row selanjutnya adalah pembiayaan berhenti mengulang
                    if(content.kode_rekening.startsWith('6.'))
                        break;

                    if(content.kode_rekening.startsWith('4.'))
                        position = i + 1;
                    
                    let dotCountBidOrKeg = (content.kode_kegiatan.slice(-1) == '.') ? content.kode_kegiatan.split('.').length - 1 : content.kode_kegiatan.split('.').length;
                    if(!content.kode_kegiatan || content.kode_kegiatan != ""){
                        if(data.kode_bidang == content.kode_kegiatan)
                            isBidangAdded = true;
                        else if(data.kode_kegiatan == content.kode_kegiatan)
                            isKegiatanAdded = true;
                    }
                    if(content.kode_rekening == '5.')
                        positions.akun = i+1;

                    if(data.kode_bidang > content.id)
                        positions.kode_bidang = i+1;

                    if(data.kode_kegiatan > content.id)
                        positions.kode_kegiatan = i+1;

                    if(category.code > content.kode_rekening)
                        positions.akun = i+1;
                                   
                    if (data.kode_kegiatan !== content.kode_kegiatan) 
                        continue;

                    if (content.kode_rekening == data[TypesBelanja[dotCount]])
                        same.push(TypesBelanja[dotCount]);

                    if (content.kode_rekening == '' || !content.kode_rekening.startsWith('5.')) 
                        continue;

                    let isJenis = (data['jenis'] <= content.kode_rekening && dotCount == 3);

                    if (isJenis && dotCount == 3)
                        positions.jenis = i;

                    if (!isJenis && data['jenis'] >= content.kode_rekening)
                        positions.jenis = i + 1;

                    let isObyek = (data['obyek'] >= content.kode_rekening);
                    let isParent = (content.kode_rekening.startsWith(data['jenis']));


                    if (isObyek && isParent) {
                        positions.obyek = i + 1;
                        isSmaller = true;
                    }

                    if (!isObyek && isParent && !isSmaller)
                        positions.obyek = i + 1;

                    if (dotCount >= 5 && data.kode_kegiatan == content.kode_kegiatan && content.kode_rekening.startsWith(data.obyek) ){
                        if(dotCount == 5){
                            if(content.kode_rekening.startsWith('5.1.3'))
                                lastCodeRabSub = content.kode_rekening;
                            else
                                lastCode = content.kode_rekening;
                        }
                        if(dotCount == 6){
                            lastCode = content.kode_rekening;
                        }
                    }

                    if(content.kode_rekening.startsWith(data.obyek) && data.kode_kegiatan == content.kode_kegiatan)
                        positions.obyek = i+1;
                }
            }
            
            if(!isAkunAdded)
                contents.push([category.code,'',category.name.toUpperCase()])

            //jika bidang belum ditambahkan push bidang
            if(!isBidangAdded && category.name == 'belanja'){
                let bidang = this.dataReferences['bidang'].find(c => c.kode_bidang == data.kode_bidang);
                contents.push(['',bidang.kode_bidang, bidang.nama_bidang])
            }

            //jika kegiatan belum ditambahkan push kegiatan
            if(!isKegiatanAdded && category.name == 'belanja'){
                let kegiatan = this.dataReferences['kegiatan'].find(c => c.kode_kegiatan == data.kode_kegiatan)
                contents.push(['',kegiatan.kode_kegiatan, kegiatan.nama_kegiatan])
            }

            //jika category == belanja, hapus kelompok pada types
            types = (data.category == 'belanja') ? types.slice(1) : types;

            types.forEach(value => {
                //jika rincian sudah ditambahkan pada 1 kode rekening, skip
                if (same.indexOf(value) !== -1) return;
                let content = this.dataReferences[value].find(c => c[0] == data[value]).slice();
                
                if(content && data['kode_kegiatan'])
                    content[1] = data['kode_kegiatan'];
                //push kelompok/ jenis/ obyek
                content ? contents.push(content) : '';
            });

            if(!isAkunAdded){
                position = positions.akun;
            }
            else if(category.name == 'belanja' && same.length == 0){
                if(isAkunAdded && !isBidangAdded)
                    position = positions.kode_bidang;
                else if(isBidangAdded && !isKegiatanAdded)
                    position = positions.kode_kegiatan; 
                else if(isKegiatanAdded && positions.jenis == 0)
                    position = positions.kode_kegiatan;
                else if(isKegiatanAdded && positions.jenis != 0)
                    position = positions.jenis;
            } 
            else if(same.length !== 3){
                position = (same.length == 0 && positions[types[0]] == 0) ? position  : 
                (data.category == 'belanja' && same.length == 2) ? positions[types[same.length-1]] : positions[types[same.length]];  
            }          

            let results = [];
            let fields = CATEGORIES.find(c => c.name == data.category).fields;
            let fieldsSiskeudes = FIELD_ALIASES.rab;
            let reverseAliases = {};

            Object.keys(fieldsSiskeudes).forEach(key => {
                reverseAliases[fieldsSiskeudes[key]] = key;
            });

            data.jumlah_satuan = !data.jumlah_satuan || data.jumlah_satuan == "" ? 0 : data.jumlah_satuan;
            data.harga_satuan = !data.harga_satuan || data.harga_satuan == "" ? 0 : data.harga_satuan;
            
            data['jumlah_satuan_pak'] = data.jumlah_satuan;
            data['harga_satuan_pak'] = data.harga_satuan;
            data['kode_rekening'] = this.getNewCode(lastCode);
            data['anggaran'] = data.jumlah_satuan * data.harga_satuan;
            data['anggaran_pak'] = data['anggaran'];

            if (me.statusAPBDes == 'PAK') {
                data['anggaran_pak'] =  data.jumlah_satuan * data.harga_satuan;
                data['jumlah_satuan'] = '0';
                data['harga_satuan'] = '0';
                
            }
            if(data.obyek.startsWith('5.1.3')){
                if(data.is_add_rabsub){
                    let rabSubCode = this.getNewCode(lastCodeRabSub);
                    data['kode_rekening'] = this.getNewCode(rabSubCode+'.00');
                    
                    contents.push([rabSubCode, data.kode_kegiatan, data.uraian_rab_sub])
                }
            }
            
            fields[fields.length - 1].forEach(c => {
                let key = reverseAliases[c];
                let value = (data[key]) ? data[key] : "";

                if(c == 'Obyek_Rincian' || c == 'Kode_Rincian')
                    value = data.kode_rekening;
                
                results.push(value)
            });
            //push rincian
            contents.push(results);

            let start = position, end = 0;
            contents.forEach((content, i) => {
                let newPosition = position + i;
                this.activeHot.alter("insert_row", newPosition);
                end = newPosition;

                let row = this.contentManager.generateRabId(content, data.kode_kegiatan);
                this.hots['rab'].populateFromArray(newPosition, 0, [row], newPosition, row.length - 1, null, 'overwrite');
            });        
            
            this.activeHot.selectCell(start, 0, end, 7, true, true);
            
            let dataAnggaran = { 
                prevAnggaran: 0, prevAnggaranPak: 0, currentAnggaran: data.anggaran , currentAnggaranPak: data.anggaran_pak 
            };

            this.setData(data, dataAnggaran, this.hots.rab, null);
            this.calculateAnggaranSumberdana();
        }
        callback(Object.assign({},model));
    }

    getNewCode(lastCode){
        let splitLastCode = lastCode.slice(-1) == '.' ? lastCode.slice(0, -1).split('.') : lastCode.split('.');
        let digits = splitLastCode[splitLastCode.length - 1];
        let newCode = splitLastCode.slice(0, splitLastCode.length - 1).join('.') + '.' + ("0" + (parseInt(digits) + 1)).slice(-2);
        return newCode
    }

    addOneRow(model): void {
        let me = this;
        this.addRow(model, results => {
            $("#modal-add-"+this.activeSheet).modal("hide");
            $('#form-add-'+this.activeSheet)[0]['reset']();           

            if(this.activeSheet == 'rab'){
                setTimeout(function() {
                    me.calculateAnggaranSumberdana();
                }, 200);
            }
        });
    }

    addOneRowAndAnother(model): void {
        let me = this;
        this.addRow(model, results => {
            $('#form-add-'+this.activeSheet)[0]['reset']();
            this.temp = results;
            this.isReset = true;
        })
    }


    validateIsExist(value, message) {
        let sourceData = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas[this.activeSheet]));

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
    }

    categoryOnChange(value): void {
        this.isExist = false;
        this.isAnggaranNotEnough = false;
        this.anggaran = 0;
        this.model.category = value;
        this.setDefaultValue();

        switch (value) {
            case "pendapatan": 
                Object.assign(this.dataReferences, this.dataReferences['pendapatan']);
                break;

            case "belanja":
                Object.assign(this.dataReferences, this.dataReferences['belanja']);
                break;

            case "pembiayaan":                        
                Object.assign(this.dataReferences, this.dataReferences['pembiayaan']);
                let value = this.dataReferences['kelompok'].filter(c => c[0] == '6.1.');
                this.dataReferences['kelompok'] = value;
                break;
        }
    }

    selectedOnChange(selector, value) {
        let data = [];
        let results = [];

        if(this.activeSheet == 'kegiatan'){
            this.contentSelection['refKegiatan'] = this.dataReferences['refKegiatan'].filter(c => c.kode_kegiatan.startsWith(value));
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

                        if (value !== null || value != 'null')
                            this.model.kode_bidang = value;

                        this.contentSelection['contentKegiatan'] = [];
                        data = this.dataReferences['kegiatan'].filter(c => c.kode_bidang == value);
                        this.contentSelection['contentKegiatan'] = data;
                        break;

                    case "kegiatan":

                        this.contentSelection['obyekAvailable'] = [];
                        let sourceData = this.hots['rab'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                        let contentObyek = [];
                        let currentCodeKeg = '';

                        sourceData.forEach(content => {
                            if(content.kode_kegiatan !== "" && content.kode_kegiatan.startsWith(value)){
                                let lengthCodeRek = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length - 1 : content.kode_rekening.split('.').length;
                                if (lengthCodeRek == 4)
                                    contentObyek.push(content);
                            }
                        });

                        this.contentSelection['obyekAvailable'] = contentObyek.map(c => schemas.objToArray(c, schemas.rab));
                        break;

                    case "jenis":
                        this.contentSelection['contentObyek'] = [];
                        data = this.dataReferences['belanja']['obyek'].filter(c => c[0].startsWith(value));
                        this.contentSelection['contentObyek'] = data;
                        this.zone.run(() => {
                           if(!value.startsWith('5.1.3')) 
                            this.isObyekRABSub = false;                            
                        });
                        break;

                    case "obyek":
                        let currentKdKegiatan = '';
                        this.contentSelection['rabSubAvailable'] = [];

                        if (value.startsWith('5.1.3.')) {
                            this.zone.run(()=> {
                                this.isObyekRABSub = true;
                            })
                              
                            let sourceData = this.hots['rab'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
                            let results = [];

                            sourceData.forEach(content => {
                                if(content.kode_rekening !== "" && content.kode_rekening.startsWith(value)){
                                    let lengthCodeRek = (content.kode_rekening.slice(-1) == '.') ? content.kode_rekening.split('.').length - 1 : content.kode_rekening.split('.').length;
                                    if (lengthCodeRek == 5)
                                        results.push(content);
                                }
                            });
                            this.contentSelection['rabSubAvailable'] = results.map(c => schemas.objToArray(c, schemas.rab));
                            break;
                        }
                        this.isObyekRABSub = false;
                        break;
                }
            }
        }
    }

    rabSubValidate(value){
        let content = [];
        this.isObyekRABSub = false;
        this.contentSelection['rabSubObyek'] = [];
        this.model.is_add_rabsub = false;
        this.isEmptyRabSub = true;

        if(value.startsWith('5.1.3')){
            let sourceData = this.hots['rab'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));

            sourceData.forEach(row => {
                if(row.kode_kegiatan == this.model.kode_kegiatan){
                    let dotCount = row.kode_rekening.slice(-1) == '.' ? row.kode_rekening.split('.').length - 1 : row.kode_rekening.split('.').length;
                    
                    if(dotCount == 5 && row.kode_rekening.startsWith(value)){
                        content.push(row);
                    }
                }
            });

            this.contentSelection['rabSubObyek'] = content;
            this.isObyekRABSub = true;
            this.isEmptyRabSub = false;
            if(content.length == 0){
                this.model.is_add_rabsub = true;
                this.isEmptyRabSub = true;
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

    getReferences(kodeDesa): void {
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
                        this.dataReferences['refBidang'] = data.map(c => { c['kode_bidang'] = kodeDesa + c.kode_bidang; return c });

                        this.dataReferences.get("refKegiatan").then(data => {
                            this.dataReferences['refKegiatan'] =  data.map(c => { c['kode_kegiatan'] = kodeDesa + c.id_kegiatan; return c });

                            this.siskeudesService.getTaBidangAvailable(data => {
                                this.dataReferences['bidangAvailable'] = data;
                            })
                        }) 
                    })
                })
            })
        })
    }

    getReferencesByCode(category,callback){
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
        let results = { anggaran: {}, terpakai: {}, anggaran_pak: {}, terpakai_pak: {} }

        this.dataReferences["refSumberDana"].forEach(item => {
            results.anggaran[item.Kode] = 0;
            results.terpakai[item.Kode] = 0;
            results.anggaran_pak[item.Kode] = 0;
            results.terpakai_pak[item.Kode] = 0;
        });

        sourceData.forEach(row => {
            if (!row.kode_rekening)
                return;

            let dotCount = row.kode_rekening.slice(-1) == '.' ? row.kode_rekening.split('.').length - 1 : row.kode_rekening.split('.').length;

            if (dotCount == 6 && row.kode_rekening.startsWith('5.1.3')) {
                let anggaran = row.jumlah_satuan * row.harga_satuan;
                let anggaran_pak = row.jumlah_satuan_pak * row.harga_satuan_pak;

                results.terpakai[row.sumber_dana] += anggaran;
                results.terpakai_pak[row.sumber_dana] += anggaran_pak;
            }

            if (dotCount !== 5)
                return;

            if (row.kode_rekening.startsWith('6.') || row.kode_rekening.startsWith('4.')) {
                let anggaran = row.jumlah_satuan * row.harga_satuan;
                let anggaran_pak = row.jumlah_satuan_pak * row.harga_satuan_pak;

                results.anggaran[row.sumber_dana] += anggaran;
                results.anggaran_pak[row.sumber_dana] += anggaran_pak;
            }
            else if (!row.kode_rekening.startsWith('5.1.3')) {
                let anggaran = row.jumlah_satuan * row.harga_satuan;
                let anggaran_pak = row.jumlah_satuan_pak * row.harga_satuan_pak;

                results.terpakai[row.sumber_dana] += anggaran;
                results.terpakai_pak[row.sumber_dana] += anggaran_pak;
            }
        });
        this.anggaranSumberdana = results;
        console.log(results);
    }

    validateForm(model): boolean {
        let result = false;

        if (model.tabActive == 'posting-apbdes') {
            let requiredForm = ['kode_posting', 'no_perdes', 'tanggal_posting'];
            let aliases = {kode_posting: 'Jenis Posting', tanggal_posting: 'Tanggal Posting'}

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

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
            this.hots[this.activeSheet].unlisten();
        } else {
            titleBar.blue();
            this.hots[this.activeSheet].listen();
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

    filterContent(){
        let hot = this.hots['rab'];
        let plugin = hot.getPlugin('hiddenColumns');
        let value = parseInt(String($('input[name=btn-filter]:checked').val()));
        let fields = schemas.rab.map(c => c.field);
        let result = PageSaver.spliceArray(fields, SHOW_COLUMNS[value]);

        (result.length == 5) ? result.push(10) 
            : ((result.length == 1) ? '' 
            : result.push(6));

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);

        hot.render();
        this.resultBefore = result;
    }

    setData(data, dataAnggaran, hot, col){
        let sourceData = hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.rab));
        let anggaran = 0, anggaran_pak = 0, perubahan = 0;
        let arrayToSet = [];

        for(let i = 0; i < sourceData.length; i++){
            let row = sourceData[i];

            if(data.kode_rekening.startsWith('5.') && row.kode_rekening !== '5.'){
                if(!row.kode_kegiatan || row.kode_kegiatan == "")
                    continue;
                if(!data.kode_kegiatan.startsWith(row.kode_kegiatan))
                    continue;
            }

            if(row.kode_rekening == data.kode_rekening){    
                arrayToSet.push(
                    [i,8, dataAnggaran.currentAnggaran], 
                    [i, 12, dataAnggaran.currentAnggaranPak], 
                    [i, 13, dataAnggaran.currentAnggaranPak - dataAnggaran.currentAnggaran]);  

                if(this.statusAPBDes == "AWAL"){
                    let value = (col == 5) ? data.jumlah_satuan : data.harga_satuan;
                    let targetCol = (col == 5) ? 9 : 11;

                    arrayToSet.push([i, targetCol, value]);  
                }                            
                break;                
            }
                
            if(data.kode_rekening.startsWith(row.kode_rekening)&& row.kode_rekening !== ""){
                if(this.statusAPBDes == "AWAL"){
                    anggaran = (row.anggaran - dataAnggaran.prevAnggaran) + dataAnggaran.currentAnggaran;
                    anggaran_pak = (row.anggaran_pak - dataAnggaran.prevAnggaranPak) + dataAnggaran.currentAnggaranPak;
                }
                else {
                    anggaran = row.anggaran;
                    anggaran_pak = (row.anggaran_pak - dataAnggaran.prevAnggaranPak) + dataAnggaran.currentAnggaranPak;
                }

                perubahan = anggaran_pak - anggaran;
                arrayToSet.push([i,8, anggaran], [i, 12, anggaran_pak], [i, 13, perubahan]);                    
            }
        }
        if(arrayToSet.length >= 1)
            hot.setDataAtCell(arrayToSet);
        
    }

    validateAnggaranSumberdana(data, dataAnggaran, isSumberdana=null, prevValue): boolean{
        let result = false;
        let currentBudget =0, budgetUsed = 0, remainingBudget = 0;
        let entityBudget = '', entityPrev = '', entityCurrent = '', entityRemaining ='';

        entityBudget = this.statusAPBDes == 'AWAL' ? 'anggaran' : 'anggaran_pak';
        entityPrev = this.statusAPBDes == 'AWAL' ? 'prevAnggaran' : 'prevAnggaranPak'
        entityCurrent = this.statusAPBDes == 'AWAL' ? 'currentAnggaran' : 'currentAnggaranPak';
        entityRemaining = this.statusAPBDes == 'AWAL' ? 'terpakai' : 'terpakai_pak';

         if(data.kode_rekening.startsWith('4.')){
            currentBudget = (this.anggaranSumberdana[entityBudget][data.sumber_dana]- dataAnggaran[entityPrev]) + dataAnggaran[entityCurrent];
            budgetUsed = this.anggaranSumberdana[entityRemaining][data.sumber_dana];

            if(isSumberdana){
                currentBudget = this.anggaranSumberdana[entityBudget][prevValue] - data[entityBudget];
                budgetUsed = this.anggaranSumberdana[entityRemaining][prevValue];
            }
            result = (currentBudget < budgetUsed) ? false : true;
        }
        else {
            remainingBudget = (this.anggaranSumberdana[entityRemaining][data.sumber_dana] - dataAnggaran[entityPrev]) + dataAnggaran[entityCurrent]
            result = (this.anggaranSumberdana[entityBudget][data.sumber_dana] < remainingBudget) ? false : true;          
            
            if(isSumberdana){
                remainingBudget = this.anggaranSumberdana[entityRemaining][data.sumber_dana] + data[entityBudget];
                result = (this.anggaranSumberdana[entityBudget][data.sumber_dana]  < remainingBudget) ? false : true;
            }   
        }        
        return result;
    }
}
