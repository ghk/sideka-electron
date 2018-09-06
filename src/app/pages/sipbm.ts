import { Component, ApplicationRef, NgZone, HostListener, ViewContainerRef, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastrService } from 'ngx-toastr';
import { Progress } from 'angular-progress-http';
import { Subscription } from 'rxjs';
import { DiffTracker } from "../helpers/diffs";
import { PersistablePage } from '../pages/persistablePage';

import { DataApiService } from '../stores/dataApiService';
import { SharedService } from '../stores/sharedService';
import { SettingsService } from '../stores/settingsService';

import schemas from '../schemas';
import { TableHelper } from '../helpers/table';
import { titleBar } from '../helpers/titleBar';
import { PageSaver } from '../helpers/pageSaver';
import { SipbmStatisticComponent } from '../components/sipbmStatistic';

import 'rxjs/add/operator/finally';

import * as $ from 'jquery';
import * as bootstrap from 'bootstrap';
import * as moment from 'moment';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';
import * as path from 'path';

var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');
@Component({
    selector: 'sipbm',
    templateUrl: '../templates/sipbm.html',
    host: {
        '(window:resize)': 'onResize($event)'
    }
    
})

export class SipbmComponent implements OnInit, OnDestroy, PersistablePage {
    type = "sipbm";
    subType = null;
    bundleSchemas: any = { 'sipbm': schemas.sipbm }
    
    contentSelection: any = {};
    initialDataset: any;
    keluargaCollection: any[] = [];
    selectedKeluarga: any = {};
    selectedDetail: any;

    tableHelper: any;
    afterSaveAction: string;
    progress: Progress;
    progressMessage: string;
    desa: any;
    activeHot: any;
    activeSheet: string;
    sheets: any[] = [];
    hasPushed: boolean;
    hots: any = {};
    sourceDatas: any = {};
    initialDatasets: any = {};
    model: any = {};
    afterChangeHook: any;
    pageSaver: PageSaver;
    modalSaveId;
    dataPenduduks: any[] = [];
    activePageMenu: string;

    isExist: boolean;
   
    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,   
        private settingsService: SettingsService,
        private appRef: ApplicationRef,
        private zone: NgZone,
        public router: Router,
        private route: ActivatedRoute,
        public toastr: ToastrService,
    ) {
        this.pageSaver = new PageSaver(this);
    }

    ngOnInit(): void {
        titleBar.title("Data SIPBM - " + this.dataApiService.auth.desa_name);
        titleBar.blue();
        this.activeSheet = 'sipbm';
        this.sheets = ['sipbm'];
        this.modalSaveId = 'modal-save-diff';
        
        let me = this;
        let sheetContainer;

        sheetContainer = document.getElementById('sheet-sipbm');
        this.hots['sipbm'] = this.createSheet(sheetContainer, 'sipbm');

        let spanSelected = $("#span-selected")[0];
        let spanCount = $("#span-count")[0];
        let inputSearch = document.getElementById('input-search-sipbm');

        this.tableHelper = new TableHelper(this.hots['sipbm']);
        this.tableHelper.initializeTableSelected(this.hots['sipbm'], 2, spanSelected);
        this.tableHelper.initializeTableCount(this.hots['sipbm'], spanCount);
        this.tableHelper.initializeTableSearch(document, inputSearch, null);

        sheetContainer = document.getElementById('sheet-keluarga');
        this.hots['keluarga'] = this.createSheet(sheetContainer, 'penduduk');

        this.activeHot = this.hots['sipbm'];
        this.pageSaver.getContent(bundle => {
            
            this.getPenduduk(data => {
                this.dataPenduduks = data;

                //kembalikan type 
                this.type = 'sipbm';
                this.bundleSchemas = { 'sipbm': schemas.sipbm }
                
                if(bundle['data']['sipbm'] && bundle['data']['sipbm'].length ){

                    let keluarga = this.dataPenduduks.filter(c => c[13] == 'Kepala Keluarga');
                    let diff = DiffTracker.trackDiff(keluarga, bundle['data']['sipbm']);
                    
                    if(diff.added.length != 0){
                        diff.added.forEach(row => {
                            bundle['data']['sipbm'].push(row);
                        })
                    }
                    if(diff.deleted.length != 0){
                        diff.deleted.forEach(row => {
                            let index = bundle['data']['sipbm'].findIndex(c => c [0] == row[0])
                            bundle['data']['sipbm'].splice(0, index);
                        })
                    }

                    this.hots['sipbm'].loadData(bundle['data']['sipbm']);                   
                    this.pageSaver.bundleData['sipbm'] = bundle['data']['sipbm']; 
                    
                }
                else {   
                        let results = this.transformData(data);
                        
                        this.hots['sipbm'].loadData(results);
                        this.pageSaver.bundleData = bundle['data']['sipbm'];
        
                        setTimeout(() => {
                            me.hots['sipbm'].render()
                        }, 300)
                        
                    
                }
            })            
        });
        
        document.addEventListener('keyup', this.keyupListener, false);
    }

    getPenduduk(callback: any){
        let data = [];
        this.type = 'penduduk';
        this.bundleSchemas = { "penduduk": schemas.penduduk, "mutasi": schemas.mutasi, "log_surat": schemas.logSurat, "prodeskel": schemas.prodeskel };
        this.pageSaver.bundleData = { "penduduk": [], "mutasi": [], "log_surat": [], "prodeskel": [] };
        this.pageSaver.getContent(bundle => {
            callback(bundle['data']['penduduk'])
        })
    }

    transformData(data){
        let kkDetail = [];
        let results = [];

        data.forEach(row =>{
            let obj = schemas.arrayToObj(row, schemas.penduduk);            
            if(obj.hubungan_keluarga == 'Kepala Keluarga'){
                obj['nama_kepala_keluarga'] = obj.nama_penduduk;
                results.push(schemas.objToArray(obj, schemas.sipbm));
            }        
        })
        
        return results;
    }

    addKeluarga(): void {
        let hot = this.hots['sipbm'];

        if (!hot.getSelected()) {
            this.toastr.warning('Tidak ada yang dipilih');
            return
        }

        let penduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.sipbm);

        if (!penduduk.no_kk) {
            this.toastr.error('No KK tidak ditemukan');
            return;
        }

        let keluarga: any[] = this.dataPenduduks.filter(e => e['10'] === penduduk.no_kk);

        if (keluarga.length > 0) {
            this.keluargaCollection.push({
                "kk": penduduk.no_kk,
                "data": keluarga
            });
        }

        this.selectedKeluarga = this.keluargaCollection[this.keluargaCollection.length - 1];
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);

        this.appRef.tick();
        this.activeHot = this.hots['keluarga'];
        this.activeSheet = 'keluarga';
        let me = this;
        setTimeout(function() {
            me.hots['keluarga'].render();
        }, 300);        
    }

    setKeluarga(kk): boolean {
        if (!kk) {
            this.toastr.error('KK tidak ditemukan');
            return;
        }

        let hot = this.hots['sipbm']
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];

        if (!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        this.appRef.tick();
        this.activeSheet = 'keluarga';
        this.hots['keluarga'].render();
        this.hots['keluarga'].listen();
        return false;
    }

    removeKeluarga(keluarga): boolean {
        let index = this.keluargaCollection.indexOf(keluarga);

        if (index > -1)
            this.keluargaCollection.splice(index, 1);

        if (this.keluargaCollection.length === 0)
            this.selectTab('sipbm');
        else
            this.setKeluarga(keluarga);

        return false;
    }

    ngOnDestroy(): void {
        document.removeEventListener('keyup', this.keyupListener, false);
    
        if (this.afterChangeHook)    
            this.hots['sipbm'].removeHook('afterChange', this.afterChangeHook);

        this.progress.percentage = 100;        
        this.tableHelper.removeListenerAndHooks();

        this.hots['sipbm'].destroy();
        this.hots['keluarga'].destroy();
        titleBar.removeTitle();
    }

    forceQuit(): void {
        $('#modal-save-diff')['modal']('hide');
        this.router.navigateByUrl('/');
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

    afterSave(): void {
        if (this.afterSaveAction == "home")
            this.router.navigateByUrl('/');
        else if (this.afterSaveAction == "quit")
            this.sharedService.getApp().quit();
    }
    
    onResize(event) {
        let me = this;
        setTimeout(function () {
            me.activeHot.render();
        }, 200);
    }

    createSheet(sheetContainer, sheet): any {
        let me = this;
        let config = {
            data: [],
            topOverlay: 34,

            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas[sheet]),
            columns: schemas[sheet],
            hiddenColumns: {
                columns: schemas[sheet].map((c, i) => { return (c['hiddenColumn'] == true) ? i : '' }).filter(c => c !== ''),
                indicators: true
            },

            colWidths: schemas.getColWidths(schemas[sheet]),
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
        this.afterChangeHook = (changes, source) => {
            if (source === 'edit' || source === 'undo' || source === 'autofill') {
                var rerender = false;

                changes.forEach(function (item) {
                    var row = item[0],
                        col = item[1],
                        prevValue = item[2],
                        value = item[3];

                })
            }

        }
        result.addHook('afterChange', this.afterChangeHook);
        return result;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    getCurrentUnsavedData(): any {
        let sipbmData = this.hots['sipbm'].getSourceData();
        return { sipbm: sipbmData };
    }
    
    selectTab(sheet): boolean {
        let me = this;
        this.activeSheet = sheet;
        this.selectedKeluarga=null;
        setTimeout(function() {
            me.hots[me.activeSheet].render();
        }, 300);
        return false;       
    }
    
    saveContent(): void {
        $('#modal-save-diff').modal('hide');

        this.pageSaver.bundleData['sipbm'] = this.hots['sipbm'].getSourceData();
        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent(true, bundle => {
            this.hots['sipbm'].loadData(bundle['data']['sipbm']);
            this.pageSaver.bundleData['sipbm'] = bundle['data']['sipbm'];   
        }, err => {

        });
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