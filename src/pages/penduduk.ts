import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import { ToastsManager } from 'ng2-toastr';

import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';

import {NgProgressService} from "ng2-progressbar";
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";
import { remote, shell } from "electron";
import { Diff, DiffTracker } from "../helpers/diffTracker";

var base64 = require("uuid-base64");
var webdriver = require('selenium-webdriver');
var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id/app_Login/';
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
    
    constructor(private appRef: ApplicationRef, 
                public toastr: ToastsManager, 
                vcr: ViewContainerRef, 
                private pService: NgProgressService,
                private ngZone: NgZone) {

        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Penduduk - " +dataApi.getActiveAuth()['desa_name']);
        titleBar.blue();

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
                if(plugin.trimmedRows.length === 0)
                    this.trimmedRows = [];
                else
                    this.trimmedRows = plugin.trimmedRows.slice();
                
                if(formulas.length === 0)
                    this.paginationComponent.totalItems = this.hots['penduduk'].getSourceData().length;
                else
                    this.paginationComponent.totalItems = this.trimmedRows.length;
                
                this.paginationComponent.pageBegin = 1;
                this.paginationComponent.calculatePages();
                this.pagingData();
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

        this.setActiveSheet('penduduk');
    }

    setActiveSheet(sheet): boolean {
        this.activeSheet = sheet;
        this.getContent(sheet);
        this.isStatisticShown = false;
        this.selectedDetail = null;
        this.selectedKeluarga = null;
        return false;
    }

    getContent(type): void {
         this.pService.start();

         dataApi.getContent(type, null, this.bundleData, this.bundleSchemas, (result) => {

            if(result)
                this.hots[type].loadData(result);
            else
                this.hots[type].loadData([]);
            
            if(type === 'penduduk'){
                this.checkPendudukHot();

                if(this.paginationComponent.itemPerPage){
                    this.paginationComponent.pageBegin = 1;
                    this.paginationComponent.totalItems = result.length;
                    this.paginationComponent.calculatePages();
                    this.pagingData(); 
                }
            }

            setTimeout(() => {
                this.hots[type].render();
                this.appRef.tick();
                this.pService.done();
            }, 200);
        });
    }

    saveContent(type): void{
        this.pService.start();

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
            this.pService.done();
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
            dataApi.saveContent('mutasi', null, this.bundleData, this.bundleSchemas, (err, result) => {
                if (!isMultiple)
                    $('#mutasi-modal').modal('hide');
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

    openProdeskel(): void {
         let browser = new webdriver.Builder().forBrowser('firefox').build();
         
         browser.get(PRODESKEL_URL);
         browser.findElement(webdriver.By.name('login')).sendKeys(settings.data['prodeskelRegCode']);
         browser.findElement(webdriver.By.name('pswd')).sendKeys(settings.data['prodeskelPassword']);
         browser.findElement(webdriver.By.id('sub_form_b')).click();
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
        var result = this.spliceArray(fields, SHOW_COLUMNS[3]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
    
        this.hots['keluarga'].render();

        this.selectedDetail = null;
        this.activeSheet = null;
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
        var result = this.spliceArray(fields, SHOW_COLUMNS[3]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);
    
        this.hots['keluarga'].render();
        this.selectedDetail = null;
        this.activeSheet = null;
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

    exportExcel(): void {
        
        let hot = this.hots['penduduk'];
        let data = hot.getData();
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
}
