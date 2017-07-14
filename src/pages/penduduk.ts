import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";
import { remote, shell } from "electron";
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { ToastsManager } from 'ng2-toastr';

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';

import DataApiService from '../stores/dataApiService';
import settings from '../stores/settings';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';
import ProdeskelWebDriver from '../helpers/prodeskelWebDriver';

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var app = remote.app;

const APP_DIR = jetpack.cwd(app.getAppPath());
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const SHOW_COLUMNS = [      
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","pekerjaan","kewarganegaraan","rt","rw","nama_dusun","agama","alamat_jalan"],
    ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"]
];

enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
export default class PendudukComponent{
     sheets: any[];
     trimmedRows: any[];
     keluargaCollection: any[];
     details: any[];
     resultBefore: any[];
     activeSheet: any;
     hots: any;
     bundleData: any;
     bundleSchemas: any;
     importer: any;
     tableSearcher: any;
     progress: number;
     isProgressing: boolean;
     isFiltered: boolean;
     isStatisticShown: boolean;
     isSuratShown: boolean;
     isPendudukEmpty: boolean;
     selectedPenduduk: any;
     selectedDetail: any;
     selectedKeluarga: any;
     diffTracker: DiffTracker;
     selectedMutasi: Mutasi;
     currentDiff: Diff;
     afterSaveAction: string;

     @ViewChild(PaginationComponent)
     paginationComponent: PaginationComponent;

     constructor(private toastr: ToastsManager, 
                private vcr: ViewContainerRef,
                private appRef: ApplicationRef, 
                private ngZone: NgZone,
                private dataApiService: DataApiService){

        this.toastr.setRootViewContainerRef(vcr);
     }

     ngOnInit(): void {
        titleBar.title("Data Penduduk - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
        this.keluargaCollection = [];
        this.details = [];
        this.isProgressing = false;
        this.bundleData =  { "penduduk": [], "mutasi": [], "logSurat": [] };
        this.bundleSchemas = { "penduduk": schemas.penduduk, "mutasi": schemas.mutasi, "logSurat": schemas.logSurat };
        this.sheets = ['penduduk', 'mutasi', 'logSurat'];
        this.hots = { "penduduk": null, "mutasi": null, "logSurat": null };
        this.paginationComponent.itemPerPage = parseInt(settings.data['maxPaging']);
        this.selectedPenduduk = schemas.arrayToObj([], schemas.penduduk);
        this.selectedDetail = schemas.arrayToObj([], schemas.penduduk);
        this.diffTracker = new DiffTracker();
        this.importer = new Importer(pendudukImporterConfig);

        this.sheets.forEach(sheet => {
            let element = $('.' + sheet + '-sheet')[0];
            let schema = schemas[sheet];

            if(!element || !schema)
                return;
            
            this.hots[sheet] = new Handsontable(element, {
                data: [],
                topOverlay: 34,
                rowHeaders: true,
                colHeaders: schemas.getHeader(schema),
                columns: schemas.getColumns(schema),
                colWidths: schemas.getColWidths(schema),
                rowHeights: 23, 
                columnSorting: true,
                sortIndicator: true,
                hiddenColumns: {columns: [0], indicators: true}, 
                renderAllRows: false,
                outsideClickDeselects: false,
                autoColumnSize: false,
                search: true,
                schemaFilters: true,
                contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
                dropdownMenu: ['filter_by_condition', 'filter_action_bar']
            });
        });

        this.hots['keluarga'] = new Handsontable($('.keluarga-sheet')[0], {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.penduduk),
            columns: schemas.getColumns(schemas.penduduk),
            colWidths: schemas.getColWidths(schemas.penduduk),
            rowHeights: 23, 
            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {columns: [0], indicators: true}, 
            renderAllRows: false,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        });

        this.hots['penduduk'].addHook('afterFilter', (formulas) => {
            let plugin = this.hots['penduduk'].getPlugin('trimRows');
            
            if(this.paginationComponent.itemPerPage){
                if(plugin.trimmedRows.length === 0){
                    this.trimmedRows = [];
                    this.isFiltered = false;
                }
                 
                else{
                     this.trimmedRows = plugin.trimmedRows.slice();
                     this.isFiltered = true;
                }

                if(formulas.length === 0)
                    this.paginationComponent.totalItems = this.hots['penduduk'].getSourceData().length;
                else
                    this.paginationComponent.totalItems = this.trimmedRows.length;
                
                this.paginationComponent.pageBegin = 1;
                this.paginationComponent.calculatePages();
                this.pagingData();
            }
            else{
                if(plugin.trimmedRows.length === 0){
                    this.trimmedRows = [];
                    this.isFiltered = false;
                }
                else{
                     this.trimmedRows = plugin.trimmedRows.slice();
                     this.isFiltered = true;
                }
            }
        });

        this.hots['penduduk'].addHook('afterRemoveRow', (index, amount) => {
            this.checkPendudukHot();
        });

        let spanSelected = $("#span-selected")[0];
        let spanCount = $("#span-count")[0];
        let inputSearch = document.getElementById("input-search");
        
        initializeTableSelected(this.hots['penduduk'], 1, spanSelected);
        initializeTableCount(this.hots['penduduk'], spanCount); 
        this.tableSearcher = initializeTableSearch(this.hots['penduduk'], document, inputSearch, null);

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

        this.activeSheet = 'penduduk';
        this.getContent(this.activeSheet);
        this.setActiveSheet(this.activeSheet);
     }

     getContent(type): void {
        this.isProgressing = true;

        let me = this;

        this.dataApiService.getContent(type, null, this.bundleData, this.bundleSchemas).subscribe(result => {
            let file = this.dataApiService.getFile(type);
            let localBundle = this.dataApiService.getLocalContent(file, this.bundleSchemas);
            let mergedResult = this.dataApiService.mergeContent(result, localBundle, type);
            
            this.hots[type].loadData(mergedResult.data[type]);

            if(type === 'penduduk'){
                this.checkPendudukHot();
                this.pageData(result);
            }
            
            setTimeout(function() {
                me.hots[type].render();
                me.isProgressing = false;
            }, 200);
           
        });

        this.runProgress();
     }

     saveContent(type): void {
         this.isProgressing = true;
         this.bundleData[type] = this.hots[type].getSourceData();
         
         this.dataApiService.saveContent(type, null, this.bundleData, this.bundleSchemas).subscribe(result => {
            let response = result.response;
            let localBundle = result.localBundle;
            let diffs = response.diffs ? response.diffs : [];
            let file = this.dataApiService.getFile(type);

            localBundle.changeId = response.change_id;

            for (let i = 0; i < localBundle.diffs[type].length; i++)
                diffs.push(localBundle.diffs[type][i]);
            
            localBundle.data[type] = this.dataApiService.mergeDiffs(diffs, localBundle.data[type]);
            localBundle.diffs[type] = [];
            
            this.hots[type] = localBundle.data[type];
            this.hots[type].render();

            jetpack.write(path.join(CONTENT_DIR, file), JSON.stringify(localBundle));

            this.isProgressing = false;

            error => {
                localBundle.data[type] = this.dataApiService.mergeDiffs(localBundle.diffs[type], this.bundleData[type]);
                this.hots[type] = localBundle.data[type];
                this.hots[type].render();
                jetpack.write(path.join(CONTENT_DIR, file), JSON.stringify(localBundle));
                this.isProgressing = false;
            }
         });

         this.runProgress();
     }

     runProgress(): void {
        this.dataApiService.progress$.subscribe(data => {
            this.progress = data;
        });
     }

     pageData(data): void {
        if(this.paginationComponent.itemPerPage && data.length > this.paginationComponent.itemPerPage){
            this.paginationComponent.pageBegin = 1;
            this.paginationComponent.totalItems = data.length;
            this.paginationComponent.calculatePages();
            this.pagingData(); 
        }
        else
            this.hots['penduduk'].render();
     }

     pagingData(): void {
        let hot = this.hots['penduduk'];
        
        hot.scrollViewportTo(0);

        let plugin = hot.getPlugin('trimRows');
        let dataLength = hot.getSourceData().length;
        let pageBegin = (this.paginationComponent.pageBegin - 1) * this.paginationComponent.itemPerPage;
        let offset = this.paginationComponent.pageBegin * this.paginationComponent.itemPerPage;
        
        let sourceRows = [];
        let rows = [];
        
        plugin.untrimAll();
        
        if(this.trimmedRows.length > 0)
            plugin.trimRows(this.trimmedRows);
        
        for(let i=0; i<dataLength; i++)
            sourceRows.push(i);
        
        if(this.trimmedRows.length > 0)
            rows = sourceRows.filter(e => plugin.trimmedRows.indexOf(e) < 0);
        else
            rows = sourceRows;
        
        let displayedRows = rows.slice(pageBegin, offset);
     
        plugin.trimRows(sourceRows);
        plugin.untrimRows(displayedRows);
        hot.render();
     }

     setActiveSheet(sheet): boolean {
        if(this.activeSheet){
            this.hots[this.activeSheet].unlisten();
        }

        this.activeSheet = sheet;

        if(this.activeSheet){
            this.hots[this.activeSheet].listen();
        }

        this.isStatisticShown = false;
        this.selectedDetail = null;
        this.selectedKeluarga = null;
        return false;
     }

     checkPendudukHot(): void {
        this.isPendudukEmpty = this.hots['penduduk'].getSourceData().length > 0 ? false : true;
     }

     openSaveDialog(): void{
          let data = this.hots[this.activeSheet].getSourceData();
          let file = this.dataApiService.getFile(this.activeSheet);
          let localBundle = this.dataApiService.getLocalContent(file, this.bundleSchemas);
          
          this.currentDiff = this.diffTracker.trackDiff(localBundle.data[this.activeSheet], data);

          let me = this;

        if (this.currentDiff.total > 0) {
            this.afterSaveAction = null;
            $('#modal-save-diff')['modal']('show');

            setTimeout(() => {
                me.hots[me.activeSheet].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }

        else {
           this.toastr.custom('<span style="color: red">Tidak ada data yang berubah.</span>', null, {enableHTML: true});
        }
     }

    showSurat(show): void {
        let hot = this.hots['penduduk'];

       if (!hot.getSelected()){
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        this.isSuratShown = show;

        if(!show){
            titleBar.blue();
            return;
        }
            
        let penduduk = hot.getDataAtRow(hot.getSelected()[0]);
        this.selectedPenduduk = schemas.arrayToObj(penduduk, schemas.penduduk);
        titleBar.normal();
        titleBar.title(null);
    }
    
    showStatistics(): boolean {
        this.isStatisticShown = true;
        this.activeSheet = null;
        this.selectedDetail = null;
        this.selectedKeluarga = null;
        return false;
    }

    addDetail(): void {
        let hot = this.hots['penduduk'];

        if (!hot.getSelected()){
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        let data =  schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);

        let detail = {"headers": schemas.penduduk.map(c => c.header), 
                     "fields": schemas.penduduk.map(c => c.field),
                     "data": data };

        let existingDetail = this.details.filter(e => e[0] === detail.data.id)[0];

        if (!existingDetail)
            this.details.push(detail);

        this.selectedDetail = this.details[this.details.length - 1];
        this.activeSheet = null;
        this.selectedKeluarga = null;
    }

    setDetail(detail): boolean {
        this.selectedDetail = detail;
        this.selectedKeluarga = null;
        this.activeSheet = null;
        return false;
    }

    removeDetail(detail): boolean {
        let index = this.details.indexOf(detail);

        if (index > -1)
            this.details.splice(index, 1);

        if (this.details.length === 0)
            this.setActiveSheet('penduduk');
        else
            this.setDetail(this.details[this.details.length - 1]);
        
        return false;
    }

    addKeluarga(): void {
        let hot = this.hots['penduduk'];

        if (!hot.getSelected()){
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        let penduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        let keluarga: any[] = hot.getSourceData().filter(e => e['22'] === penduduk.no_kk);

        if (keluarga.length > 0) {
            this.keluargaCollection.push({
                "kk": penduduk.no_kk,
                "data": keluarga
            });
        }

        this.selectedKeluarga = this.keluargaCollection[this.keluargaCollection.length - 1];
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);

        var plugin = this.hots['keluarga'].getPlugin('hiddenColumns');          
        var fields = schemas.penduduk.map(c => c.field);  
        var result = this.spliceArray(fields, SHOW_COLUMNS[0]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
    
        this.selectedDetail = null;
        this.activeSheet = null;
        this.appRef.tick();

        this.hots['keluarga'].render();
    }

    setKeluarga(kk): boolean {
        let hot = this.hots['penduduk']
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];

        if (!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        
        var plugin = this.hots['keluarga'].getPlugin('hiddenColumns');          
        var fields = schemas.penduduk.map(c => c.field);  
        var result = this.spliceArray(fields, SHOW_COLUMNS[0]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
    
        this.selectedDetail = null;
        this.activeSheet = null;
        this.appRef.tick();

        this.hots['keluarga'].render();
        this.hots['keluarga'].listen();

        return false;
    }

    removeKeluarga(keluarga): boolean {
        let index = this.keluargaCollection.indexOf(keluarga);

        if (index > -1)
            this.keluargaCollection.splice(index, 1);
    
        if(this.keluargaCollection.length === 0)
            this.setActiveSheet('penduduk');
        else
            this.setKeluarga(keluarga);

        return false;
    }

    insertRow(): void {
        let hot = this.hots['penduduk'];
        hot.alter('insert_row', 0);
        hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
        
        this.checkPendudukHot();
    }

    reloadSurat(data): void {
        this.hots['logSurat'].loadData(data);
    }

    spliceArray(fields, showColumns): any{
        let result= [];
        for(var i=0;i!=fields.length;i++){
            var index = showColumns.indexOf(fields[i]);
            if (index == -1) result.push(i);
        }
        return result;
    }

    openMutasiDialog(): void {
        this.changeMutasi(Mutasi.kelahiran);

        if(this.hots['penduduk'].getSelected())
             this.changeMutasi(Mutasi.pindahPergi);
        
        $('#mutasi-modal').modal('show');
    }

    changeMutasi(mutasi): void {
        let hot = this.hots['penduduk'];

        this.selectedMutasi = mutasi;
        this.selectedPenduduk = [];

        if (this.selectedMutasi === Mutasi.pindahPergi || this.selectedMutasi === Mutasi.kematian) {
            if (!hot.getSelected())
                return;

            this.selectedPenduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        }
    }

    mutasi(isMultiple: boolean): void {
        let hot = this.hots['penduduk'];
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));
        let data = jsonData['data']['mutasi'];

        switch (this.selectedMutasi) {
            case Mutasi.pindahPergi:
                hot.alter('remove_row', hot.getSelected()[0]);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Pindah Pergi',
                this.selectedPenduduk.desa,
                new Date()]);
                break;
            case Mutasi.pindahDatang:
                hot.alter('insert_row', 0);
                hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Pindah Datang',
                this.selectedPenduduk.desa,
                new Date()]);
                break;
            case Mutasi.kematian:
                hot.alter('remove_row', hot.getSelected()[0]);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Kematian',
                    '-',
                new Date()]);
                break;
            case Mutasi.kelahiran:
                hot.alter('insert_row', 0);
                hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Kelahiran',
                    '-',
                new Date()]);
                break;
        }

        this.bundleData['penduduk'] = hot.getSourceData();
        this.bundleData['mutasi'] = data;
    }
}

/*
import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import { ToastsManager } from 'ng2-toastr';

import dataApi from "../stores/dataApi";
import DataApiService from '../stores/dataApiService';
import settings from '../stores/settings';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';
import ProdeskelWebDriver from '../helpers/prodeskelWebDriver';

import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";
import { remote, shell } from "electron";
import { Diff, DiffTracker } from "../helpers/diffTracker";

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

declare var Pace;

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DATA_TYPE_DIRS = { "penduduk": "penduduk", "logSurat": "penduduk", "mutasi": "penduduk" };
const SHOW_COLUMNS = [      
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","pekerjaan","kewarganegaraan","rt","rw","nama_dusun","agama","alamat_jalan"],
    ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"]
];

enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
export default class PendudukComponent {
    hots: any;
    data: any;
    importer: any;
    tableSearcher: any;
    bundleData: any;
    bundleSchemas: any;
    activeSheet: string;
    trimmedRows: any[];
    sheets: string[];
    resultBefore: any[];
    selectedMutasi: Mutasi;
    currentDiff: Diff;
    diffTracker: DiffTracker;
    selectedPenduduk: any;
    isSuratShown: boolean;
    isStatisticShown: boolean;
    details: any[];
    keluargaCollection: any[];
    selectedDetail: any;
    selectedKeluarga: any;
    afterSaveAction: string;
    isPendudukEmpty: boolean;
    prodeskelWebDriver: ProdeskelWebDriver;
    syncData: any;
    isFiltered: boolean;

    @ViewChild(PaginationComponent)
    paginationComponent: PaginationComponent;

    options = {
        minimum: 0.08,
        maximum: 1,
        ease: 'linear',
        positionUsing: 'translate3d',
        speed: 200,
        trickleSpeed: 300,
        showSpinner: true,
        direction: "leftToRightIncreased",
        color: '#CC181E',
        thick: true
    };
    
    constructor(public toastr: ToastsManager, 
                private vcr: ViewContainerRef,
                private appRef: ApplicationRef, 
                private ngZone: NgZone,
                private dataApiService: DataApiService) {

        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Penduduk - " +dataApi.getActiveAuth()['desa_name']);
        titleBar.blue();
        this.isFiltered = false;
        this.syncData = { "penduduk": null, "action": null };
        this.importer = new Importer(pendudukImporterConfig);
        this.trimmedRows = [];
        this.resultBefore = [];
        this.details = [];
        this.keluargaCollection = [];
        this.sheets = ['penduduk', 'mutasi', 'logSurat'];
        this.hots = { "penduduk": null, "mutasi": null, "logSurat": null };
        this.bundleData =  { "penduduk": [], "mutasi": [], "logSurat": [] };
        this.bundleSchemas = { "penduduk": schemas.penduduk, "mutasi": schemas.mutasi, "logSurat": schemas.logSurat };
        this.paginationComponent.itemPerPage = parseInt(settings.data['maxPaging']);
        this.selectedPenduduk = schemas.arrayToObj([], schemas.penduduk);
        this.selectedDetail = schemas.arrayToObj([], schemas.penduduk);
        this.diffTracker = new DiffTracker();

        this.sheets.forEach(sheet => {
            let element = $('.' + sheet + '-sheet')[0];
            let schema = schemas[sheet];

            if(!element || !schema)
                return;
            
            this.hots[sheet] = new Handsontable(element, {
                data: [],
                topOverlay: 34,
                rowHeaders: true,
                colHeaders: schemas.getHeader(schema),
                columns: schemas.getColumns(schema),
                colWidths: schemas.getColWidths(schema),
                rowHeights: 23, 
                columnSorting: true,
                sortIndicator: true,
                hiddenColumns: {columns: [0], indicators: true}, 
                renderAllRows: false,
                outsideClickDeselects: false,
                autoColumnSize: false,
                search: true,
                schemaFilters: true,
                contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
                dropdownMenu: ['filter_by_condition', 'filter_action_bar']
            });
        });

        this.hots['keluarga'] = new Handsontable($('.keluarga-sheet')[0], {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.penduduk),
            columns: schemas.getColumns(schemas.penduduk),
            colWidths: schemas.getColWidths(schemas.penduduk),
            rowHeights: 23, 
            columnSorting: true,
            sortIndicator: true,
            hiddenColumns: {columns: [0], indicators: true}, 
            renderAllRows: false,
            outsideClickDeselects: false,
            autoColumnSize: false,
            search: true,
            schemaFilters: true,
            contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
            dropdownMenu: ['filter_by_condition', 'filter_action_bar']
        });

        this.hots['penduduk'].addHook('afterFilter', (formulas) => {
            let plugin = this.hots['penduduk'].getPlugin('trimRows');
            
            if(this.paginationComponent.itemPerPage){
                if(plugin.trimmedRows.length === 0){
                    this.trimmedRows = [];
                    this.isFiltered = false;
                }
                 
                else{
                     this.trimmedRows = plugin.trimmedRows.slice();
                     this.isFiltered = true;
                }

                if(formulas.length === 0)
                    this.paginationComponent.totalItems = this.hots['penduduk'].getSourceData().length;
                else
                    this.paginationComponent.totalItems = this.trimmedRows.length;
                
                this.paginationComponent.pageBegin = 1;
                this.paginationComponent.calculatePages();
                this.pagingData();
            }
            else{
                if(plugin.trimmedRows.length === 0){
                    this.trimmedRows = [];
                    this.isFiltered = false;
                }
                else{
                     this.trimmedRows = plugin.trimmedRows.slice();
                     this.isFiltered = true;
                }
            }
        });

        this.hots['penduduk'].addHook('afterRemoveRow', (index, amount) => {
            this.checkPendudukHot();
        });

        let spanSelected = $("#span-selected")[0];
        let spanCount = $("#span-count")[0];
        let inputSearch = document.getElementById("input-search");
        
        initializeTableSelected(this.hots['penduduk'], 1, spanSelected);
        initializeTableCount(this.hots['penduduk'], spanCount); 
        this.tableSearcher = initializeTableSearch(this.hots['penduduk'], document, inputSearch, null);

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

        //this.sheets.forEach(sheet => {
        //    this.getContent(sheet);
        //});
        //this.getContent('penduduk')        
        //this.setActiveSheet('penduduk');

        let localContent = this.dataApiService.getLocalContent('penduduk', this.bundleSchemas);
        this.dataApiService.getContent('penduduk', null, this.bundleData, this.bundleSchemas)
            .subscribe(
                data => {
                    let mergedContent = this.dataApiService.mergeContent(data, localContent, 'penduduk');
                    jetpack.write(path.join(DATA_DIR, 'penduduk.json'), mergedContent);
                }, 
                error => {}
            );
    }

    setActiveSheet(sheet): boolean {
        if(this.activeSheet){
            this.hots[this.activeSheet].unlisten();
        }

        this.activeSheet = sheet;

        if(this.activeSheet){
            this.hots[this.activeSheet].listen();
        }

        this.isStatisticShown = false;
        this.selectedDetail = null;
        this.selectedKeluarga = null;
        return false;
    }

    getContent(type): void {
         dataApi.getContent(type, null, this.bundleData, this.bundleSchemas, (result) => {

            if(result)
                this.hots[type].loadData(result);
            else
                this.hots[type].loadData([]);
            
            if(type === 'penduduk'){
                this.checkPendudukHot();
                this.pageData(result);
            }

            setTimeout(() => {
                this.hots[type].render();
                this.appRef.tick();
            }, 200);
        });
    }

    saveContent(type): void{
        Pace.start();

        $('#modal-save-diff').modal('hide');      
        
        let hot = this.hots['penduduk'];
        this.bundleData[type] = hot.getSourceData();

        dataApi.saveContent(type, null, this.bundleData, this.bundleSchemas, (err, data) => {
            if (!err)
                this.toastr.success('Penyimpanan Berhasil!', '');
            else
                this.toastr.error('Penyimpanan Gagal!', '');

            hot.loadData(data);
            this.afterSave();
            Pace.stop();
        });
    }

    openSaveDialog(): void {
        let data = this.hots[this.activeSheet].getSourceData();
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));

        this.currentDiff = this.diffTracker.trackDiff(jsonData["data"][this.activeSheet], data);

        let me = this;

        if (this.currentDiff.total > 0) {
            this.afterSaveAction = null;
            $('#modal-save-diff')['modal']('show');

            setTimeout(() => {
                me.hots[me.activeSheet].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }

        else {
           this.toastr.custom('<span style="color: red">Tidak ada data yang berubah.</span>', null, {enableHTML: true});
        }
    }

    openMutasiDialog(): void {
        this.changeMutasi(Mutasi.kelahiran);

        if(this.hots['penduduk'].getSelected())
             this.changeMutasi(Mutasi.pindahPergi);
        
        $('#mutasi-modal').modal('show');
    }

    changeMutasi(mutasi): void {
        let hot = this.hots['penduduk'];

        this.selectedMutasi = mutasi;
        this.selectedPenduduk = [];

        if (this.selectedMutasi === Mutasi.pindahPergi || this.selectedMutasi === Mutasi.kematian) {
            if (!hot.getSelected())
                return;

            this.selectedPenduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        }
    }

    mutasi(isMultiple: boolean): void {
        let hot = this.hots['penduduk'];
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));
        let data = jsonData['data']['mutasi'];

        switch (this.selectedMutasi) {
            case Mutasi.pindahPergi:
                hot.alter('remove_row', hot.getSelected()[0]);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Pindah Pergi',
                this.selectedPenduduk.desa,
                new Date()]);
                break;
            case Mutasi.pindahDatang:
                hot.alter('insert_row', 0);
                hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Pindah Datang',
                this.selectedPenduduk.desa,
                new Date()]);
                break;
            case Mutasi.kematian:
                hot.alter('remove_row', hot.getSelected()[0]);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Kematian',
                    '-',
                new Date()]);
                break;
            case Mutasi.kelahiran:
                hot.alter('insert_row', 0);
                hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                data.push([base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                    'Kelahiran',
                    '-',
                new Date()]);
                break;
        }

        this.bundleData['penduduk'] = hot.getSourceData();
        this.bundleData['mutasi'] = data;

        dataApi.saveContent('penduduk', null, this.bundleData, this.bundleSchemas, (err, result) => {
            if(err){
                this.toastr.error('Penyimpanan penduduk setelah mutasi gagal');
                return;
            }

            dataApi.saveContent('mutasi', null, this.bundleData, this.bundleSchemas, (err, result) => {
                if(err){
                    this.toastr.error('Penyimpanan mutasi gagal');
                    return;
                }

                if (!isMultiple)
                    $('#mutasi-modal').modal('hide');
                
                this.hots['mutasi'].loadData(data);
                this.toastr.success('Mutasi berhasil');
            });
        });
    }

    showSurat(show): void {
        let hot = this.hots['penduduk'];

       if (!hot.getSelected()){
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        this.isSuratShown = show;

        if(!show){
            titleBar.blue();
            return;
        }
            
        let penduduk = hot.getDataAtRow(hot.getSelected()[0]);
        this.selectedPenduduk = schemas.arrayToObj(penduduk, schemas.penduduk);
        titleBar.normal();
        titleBar.title(null);
    }
    
    showStatistics(): boolean {
        this.isStatisticShown = true;
        this.activeSheet = null;
        this.selectedDetail = null;
        this.selectedKeluarga = null;
        return false;
    }

     initProdeskel(): void {
        let hot = this.hots['keluarga'];
        let penduduks = hot.getSourceData().map(p => schemas.arrayToObj(p, schemas.penduduk));

        this.prodeskelWebDriver = new ProdeskelWebDriver();
        this.prodeskelWebDriver.openSite();
        this.prodeskelWebDriver.login(settings.data['prodeskelRegCode'], settings.data['prodeskelPassword']);
        this.prodeskelWebDriver.addNewKK(penduduks.filter(p => p.hubungan_keluarga == 'Kepala Keluarga')[0], penduduks);
        //this.prodeskelWebDriver.switchToFrameDesa();
        //this.prodeskelWebDriver.checkDataTable(this.syncData);
    }

    syncProdeskel(): void {
        $('#prodeskel-modal').modal('hide');
        let hot = this.hots['penduduk'];
        let dataSource = hot.getSourceData();
        let keluargaRaw: any[] = dataSource.filter(e => e['22'] === this.syncData.penduduk.no_kk);
        let keluargaResult: any[] = [];

         for(let i=0; i<keluargaRaw.length; i++){
            var objRes = schemas.arrayToObj(keluargaRaw[i], schemas.penduduk);
            objRes['no'] = (i + 1);
            keluargaResult.push(objRes);
        }
        
        console.log(keluargaResult);

        //this.prodeskelWebDriver.addNewKK(this.syncData.penduduk);
    }
    
    addDetail(): void {
        let hot = this.hots['penduduk'];

        if (!hot.getSelected()){
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        let data =  schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);

        let detail = {"headers": schemas.penduduk.map(c => c.header), 
                     "fields": schemas.penduduk.map(c => c.field),
                     "data": data };

        let existingDetail = this.details.filter(e => e[0] === detail.data.id)[0];

        if (!existingDetail)
            this.details.push(detail);

        this.selectedDetail = this.details[this.details.length - 1];
        this.activeSheet = null;
        this.selectedKeluarga = null;
    }

    setDetail(detail): boolean {
        this.selectedDetail = detail;
        this.selectedKeluarga = null;
        this.activeSheet = null;
        return false;
    }

    removeDetail(detail): boolean {
        let index = this.details.indexOf(detail);

        if (index > -1)
            this.details.splice(index, 1);

        if (this.details.length === 0)
            this.setActiveSheet('penduduk');
        else
            this.setDetail(this.details[this.details.length - 1]);
        
        return false;
    }

    addKeluarga(): void {
        let hot = this.hots['penduduk'];

        if (!hot.getSelected()){
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        let penduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        let keluarga: any[] = hot.getSourceData().filter(e => e['22'] === penduduk.no_kk);

        if (keluarga.length > 0) {
            this.keluargaCollection.push({
                "kk": penduduk.no_kk,
                "data": keluarga
            });
        }

        this.selectedKeluarga = this.keluargaCollection[this.keluargaCollection.length - 1];
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);

        var plugin = this.hots['keluarga'].getPlugin('hiddenColumns');          
        var fields = schemas.penduduk.map(c => c.field);  
        var result = this.spliceArray(fields, SHOW_COLUMNS[0]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
    
        this.selectedDetail = null;
        this.activeSheet = null;
        this.appRef.tick();

        this.hots['keluarga'].render();
    }

    setKeluarga(kk): boolean {
        let hot = this.hots['penduduk']
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];

        if (!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        
        var plugin = this.hots['keluarga'].getPlugin('hiddenColumns');          
        var fields = schemas.penduduk.map(c => c.field);  
        var result = this.spliceArray(fields, SHOW_COLUMNS[0]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
    
        this.selectedDetail = null;
        this.activeSheet = null;
        this.appRef.tick();

        this.hots['keluarga'].render();
        this.hots['keluarga'].listen();

        return false;
    }

    removeKeluarga(keluarga): boolean {
        let index = this.keluargaCollection.indexOf(keluarga);

        if (index > -1)
            this.keluargaCollection.splice(index, 1);
    
        if(this.keluargaCollection.length === 0)
            this.setActiveSheet('penduduk');
        else
            this.setKeluarga(keluarga);

        return false;
    }

    insertRow(): void {
        let hot = this.hots['penduduk'];
        hot.alter('insert_row', 0);
        hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
        
        this.checkPendudukHot();
    }

    pagingData(): void {
        let hot = this.hots['penduduk'];
        
        hot.scrollViewportTo(0);

        let plugin = hot.getPlugin('trimRows');
        let dataLength = hot.getSourceData().length;
        let pageBegin = (this.paginationComponent.pageBegin - 1) * this.paginationComponent.itemPerPage;
        let offset = this.paginationComponent.pageBegin * this.paginationComponent.itemPerPage;
        
        let sourceRows = [];
        let rows = [];
        
        plugin.untrimAll();
        
        if(this.trimmedRows.length > 0)
            plugin.trimRows(this.trimmedRows);
        
        for(let i=0; i<dataLength; i++)
            sourceRows.push(i);
        
        if(this.trimmedRows.length > 0)
            rows = sourceRows.filter(e => plugin.trimmedRows.indexOf(e) < 0);
        else
            rows = sourceRows;
        
        let displayedRows = rows.slice(pageBegin, offset);
     
        plugin.trimRows(sourceRows);
        plugin.untrimRows(displayedRows);
        hot.render();
    }

    next(): void {
        if((this.paginationComponent.pageBegin + 1) > this.paginationComponent.totalPage)
            return;
        
        this.paginationComponent.pageBegin += 1;
        this.paginationComponent.calculatePages();
        this.pagingData();
    }

    prev(): void {
        if(this.paginationComponent.pageBegin === 1)
            return;
        
        this.paginationComponent.pageBegin -= 1;
        this.paginationComponent.calculatePages();
        this.pagingData();
    }

    onPage(page): void {
        this.paginationComponent.pageBegin = page;
        this.paginationComponent.calculatePages();
        this.pagingData();
    }

    first(): void {
        this.paginationComponent.pageBegin = 1;
        this.paginationComponent.calculatePages();
        this.pagingData();
    }

    last(): void {
        this.paginationComponent.pageBegin = this.paginationComponent.totalPage;
        this.paginationComponent.calculatePages();
        this.pagingData();
    }

    filterContent(){ 
        let hot = this.hots['penduduk'];
        var plugin = hot.getPlugin('hiddenColumns');        
        var value = parseInt($('input[name=btn-filter]:checked').val());   
        var fields = schemas.penduduk.map(c => c.field);
        var result = this.spliceArray(fields, SHOW_COLUMNS[value]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
    
        hot.render();
        this.resultBefore = result;
    }

    importExcel(): void {
        let files = remote.dialog.showOpenDialog(null);
        if (files && files.length) {
            this.importer.init(files[0]);
            $("#modal-import-columns").modal("show");
        }
    }

    doImport(overwrite): void {
       $("#modal-import-columns").modal("hide");
        Pace.start();
        let objData = this.importer.getResults();
        
        let undefinedIdData = objData.filter(e => !e['id']);

        for(let i=0; i<objData.length; i++){
            let item = objData[i];
            item['id'] = base64.encode(uuid.v4());
        }

        let existing = overwrite ? [] : this.hots['penduduk'].getSourceData();
        let imported = objData.map(o => schemas.objToArray(o, schemas.penduduk));
        let data = existing.concat(imported);
        console.log(existing.length, imported.length, data.length);

        this.hots['penduduk'].loadData(data);
        this.pageData(data);
        this.checkPendudukHot();
        Pace.stop();
    }

    exportExcel(): void {
        let hot = this.hots['penduduk'];
        let data = [];

        if(this.isFiltered)
            data = hot.getData();
        else
            data = hot.getSourceData();

        exportPenduduk(data, "Data Penduduk");
    }

    spliceArray(fields, showColumns): any{
        let result= [];
        for(var i=0;i!=fields.length;i++){
            var index = showColumns.indexOf(fields[i]);
            if (index == -1) result.push(i);
        }
        return result;
    }

    getDataFields(data): any{
        return Object.keys(data);
    }

    redirectMain(): void {
        if(!this.activeSheet){
             document.location.href = "app.html";
             return;
        }
          
        let data = this.hots[this.activeSheet].getSourceData();
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));
        let latestDiff = this.diffTracker.trackDiff(jsonData["data"][this.activeSheet], data);

        this.afterSaveAction = 'home';

        if(latestDiff.total === 0)
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

    checkPendudukHot(): void {
        this.isPendudukEmpty = this.hots['penduduk'].getSourceData().length > 0 ? false : true;
    }

    pageData(data): void {
        if(this.paginationComponent.itemPerPage && data.length > this.paginationComponent.itemPerPage){
            this.paginationComponent.pageBegin = 1;
            this.paginationComponent.totalItems = data.length;
            this.paginationComponent.calculatePages();
            this.pagingData(); 
        }
        else
            this.hots['penduduk'].render();
    }

    reloadSurat(data): void {
        this.hots['logSurat'].loadData(data);
    }
}
*/
