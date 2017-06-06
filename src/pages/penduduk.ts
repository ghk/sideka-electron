import { Component, ApplicationRef, ViewChild } from "@angular/core";
import { remote, shell } from "electron";
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Diff } from "../helpers/diffTracker";
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import DiffTracker from "../helpers/diffTracker";
import createPrintVars from '../helpers/printvars';
import diffProps from '../helpers/diff';
import titleBar from '../helpers/titleBar';
import PendudukStatisticComponent from '../components/pendudukStatistic';

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';

const webdriver = require('selenium-webdriver');
const base64 = require("uuid-base64");
const Handsontable = require('./handsontablep/dist/handsontable.full.js');
const $ = require('jquery');

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id/app_Login/';
const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DATA_TYPE_DIRS = { "penduduk": "penduduk", "logSurat": "penduduk", "mutasi": "penduduk" };

enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
export default class PendudukComponent{
    data: any = {};
    hots: any = {};
    sheets: any[] = [];
    details: any[] = [];
    keluargaCollection: any[] = [];
    activeSheet: any = null;
    isFileMenuShown: boolean = false;
    isStatisticShown: boolean = false;
    isSuratShown: boolean = false;
    tableSearcher: any = {};
    importer: any;
    browser: any;
    diffTracker: DiffTracker;
    currentDiff: Diff;
    bundleData: any =  {"penduduk": [], "mutasi": [], "logSurat": [] };
    bundleSchemas: any = { "penduduk": schemas.penduduk, "mutasi": schemas.mutasi, "logSurat": schemas.logSurat };
    savingMessage: string;
    afterSaveAction: string;
    selectedPenduduk: any = {};
    selectedMutasi: Mutasi;
    selectedDetail = [];
    selectedKeluarga: any = { "kk": null, "data": [] };
    hotKeluarga: any;
    syncData: any;
    paging: any = {"page": 1, "max": 0, "total": 0};
    rows: any[];
    trimmedFilterRows: any[];

    @ViewChild(PendudukStatisticComponent)
    pendudukStatistic: PendudukStatisticComponent;

    constructor(private appRef: ApplicationRef){}

    ngOnInit(): void{
        this.trimmedFilterRows = [];
        this.diffTracker = new DiffTracker();
        this.syncData = { "penduduk": null, "action": null };
        this.paging.max = parseInt(settings.data["maxPaging"]);

        this.sheets = [
            {"id": 'penduduk', "name": 'Penduduk'}, 
            {"id": 'mutasi', "name": 'Mutasi'}, 
            {"id": 'logSurat', "name": 'Log Surat'}];
        
        this.activeSheet = this.sheets[0];
        
        setTimeout(() => {
            this.createSheets();
            this.getContent(this.activeSheet.id);
            this.initializeSearcher();
        }, 1000);

        document.addEventListener('keyup', (e) => {
            if(e.ctrlKey && e.keyCode === 83){
                this.openSaveDialog();
                e.preventDefault();
                e.stopPropagation();
            }
            else if(e.ctrlKey && e.keyCode === 80){
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);

        this.importer = new Importer(pendudukImporterConfig);
    }

    createSheets(): void {
        this.sheets.forEach(sheet => {
            let element = $('.sheet-' + sheet.id)[0];
            
            if(!element)
                return;

            this.hots[sheet.id] = new Handsontable(element, {
                data: [],
                topOverlay: 34,
                rowHeaders: true,
                colHeaders: schemas.getHeader(schemas[sheet.id]),
                columns: schemas.getColumns(schemas[sheet.id]),
                colWidths: schemas.getColWidths(schemas[sheet.id]),
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
                dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
                beforeRemoveRow: (row, amount) => {
                    this.data[sheet.id].splice(row, amount);
                },
                afterFilter: (data) => {
                    let plugin = this.hots[sheet.id].getPlugin('trimRows');
                    
                    if(plugin.trimmedRows.length === 0)
                        this.trimmedFilterRows = [];
                    else
                        this.trimmedFilterRows = plugin.trimmedRows.slice();
                    
                    this.paging.page = 1;
                    this.pagingData(sheet.id);
                }
            });
        });

        let keluargaElement = $('.sheet-keluarga')[0];

        this.hotKeluarga = new Handsontable(keluargaElement, {
            data: [],
            topOverlay: 34,
            rowHeaders: true,
            colHeaders: schemas.getHeader(schemas.keluarga),
            columns: schemas.getColumns(schemas.keluarga),
            colWidths: schemas.getColWidths(schemas.keluarga),
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
    }

    initializeSearcher(): void {
        let spanSelected = $("#span-selected")[0];
        let hot = this.hots['penduduk'];

        initializeTableSelected(hot, 1, spanSelected);

        let spanCount = $("#span-count")[0];
        initializeTableCount(hot, spanCount);

        let inputSearch = document.getElementById("input-search");
        this.tableSearcher = initializeTableSearch(hot, document, inputSearch, null);
    }

    getContent(sheetId): void {
        let me = this;
       
        dataApi.getContent(sheetId, null, me.bundleData, me.bundleSchemas, (result) => {
            if(!result)
                me.data[sheetId] = [];
            else
                me.data[sheetId] = result;
            
            this.hots[sheetId].loadData(me.data[sheetId]);

            me.paging.total = me.data[sheetId].length;

            if(sheetId === 'penduduk')
                me.pagingData('penduduk');

            setTimeout(() => {
                me.hots[sheetId].render();
                me.appRef.tick();
            }, 200);
        });
    }

    next(): boolean {
        this.paging.page += 1;
        this.pagingData('penduduk');
        return false;
    }

    prev(): boolean {
        this.paging.page -= 1;
        this.pagingData('penduduk');
        return false;
    }

    pagingData(sheetId: string): void {
        let plugin = this.hots[sheetId].getPlugin('trimRows');
        let dataLength = this.hots[sheetId].getSourceData().length;
        let pageBegin = (this.paging.page - 1) * this.paging.max;
        let offset = this.paging.page * this.paging.max;
        
        let sourceRows = [];
        let rows = [];
        
        plugin.untrimAll();
        
        if(this.trimmedFilterRows.length > 0)
            plugin.trimRows(this.trimmedFilterRows);
        
        for(let i=0; i<dataLength; i++)
            sourceRows.push(i);
        
        if(this.trimmedFilterRows.length > 0)
            rows = sourceRows.filter(e => plugin.trimmedRows.indexOf(e) < 0);
        else
            rows = sourceRows;
        
         let displayedRows = rows.slice(pageBegin, offset);
     
        plugin.trimRows(sourceRows);
        plugin.untrimRows(displayedRows);
        this.hots[sheetId].render();
        
        /*
        let dataLength = this.hots[sheetId].getSourceData().length;
        let plugin = this.hots[sheetId].getPlugin('trimRows');
        let offset = this.paging.page * this.paging.max;
        let start = (this.paging.page - 1) * this.paging.max;
        let sourceRows = [];
        let rows = [];

        if(plugin.trimmedRows.length > 0)
            this.trimmedRows = plugin.trimmedRows;

        for(let i=0; i<dataLength; i++)
            sourceRows.push(i);
        
        plugin.untrimAll();
        
        if(this.trimmedRows.length > 0)
            rows = sourceRows.filter(e => this.trimmedRows.indexOf(e) < 0);
        else
            rows = sourceRows;
        
        let displayedRows = rows.slice(start, offset);
     
        plugin.trimRows(sourceRows);
        plugin.untrimRows(displayedRows);
        this.hots[sheetId].render();*/
    }

    page(sheetId){
        let dataLength = this.hots[sheetId].getSourceData().length;
        let plugin = this.hots[sheetId].getPlugin('trimRows');
        let trimmedRows = plugin.trimmedRows.length;

        if(trimmedRows > 0)
          dataLength = trimmedRows;
        
        let originalRows = [];
        let untrimmedRows = [];

        for(let i=0; i<dataLength; i++)
            originalRows.push(i);
        
        plugin.untrimRows(originalRows);
        
        let filteredRows = originalRows.filter(e => plugin.trimmedRows.indexOf(e) < 0);
  
        let offset = this.paging.page * this.paging.max;

        for(let i= (this.paging.page - 1) * (this.paging.max + 1); i < offset; i++){ 
             if(!isNaN(filteredRows[i]))
                untrimmedRows.push(filteredRows[i]);
        }
           
        plugin.trimRows(originalRows);
        plugin.untrimRows(untrimmedRows);
        this.hots[sheetId].render();
    }

    saveContent(sheetId): void {
         $("#modal-save-diff").modal("hide");
         let me = this;
         let hot = this.hots['penduduk'];

         me.bundleData[sheetId] = hot.getSourceData();

         dataApi.saveContent(sheetId, null, me.bundleData, me.bundleSchemas, (err, data) => {
              if(!err)
                me.savingMessage = 'Penyimpanan berhasil';
              else
                me.savingMessage = 'Penyimpanan gagal';
                
                me.data[sheetId] = data;
                hot.loadData(me.data[sheetId]);

                me.afterSave();

                setTimeout(() => {
                    me.savingMessage = null;
                }, 2000);
         });
    }
    
    setActiveSheet(sheet): boolean{
        this.isStatisticShown = false;
        this.activeSheet = sheet;

        this.getContent(sheet.id);
        this.selectedDetail = [];
        this.selectedKeluarga = {"kk": null, "data": [] };
        return false;
    }
    
    showFileMenu(isFileMenuShown): void {
        this.isFileMenuShown = isFileMenuShown;
        this.isSuratShown = false;

        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
    }

    showStatistic(): boolean{
        this.isStatisticShown = true;
        this.activeSheet = {};

        return false;
    }

    showSurat(): boolean {
        this.isFileMenuShown = true;
        this.isSuratShown = true;
        
        let hot = this.hots['penduduk'];

        if(!hot.getSelected())
            return;

        let penduduk = hot.getDataAtRow(hot.getSelected()[0]);
        this.selectedPenduduk = schemas.arrayToObj(penduduk, schemas.penduduk);
        return false;
    }

    openSaveDialog(): void {
        let sheet = this.activeSheet.id;
        let data = this.hots[sheet].getSourceData();
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));

        this.currentDiff = this.diffTracker.trackDiff(jsonData["data"][sheet], data);

        let me = this;
        
        if(this.currentDiff.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff")['modal']("show");

            setTimeout(() => {
                me.hots[me.activeSheet.id].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }

        else{
            this.savingMessage = 'Tidak ada data yang berubah';
            setTimeout(() => {
                me.savingMessage = null;
            }, 200)
        }
    }

    openMutasiDialog(): void {
        this.changeMutasi(Mutasi.pindahPergi);
        $('#mutasi-modal').modal('show');
    }

    changeMutasi(mutasi): void {
        let hot = this.hots['penduduk']

        this.selectedMutasi = mutasi;
        this.selectedPenduduk = [];

        if(this.selectedMutasi === Mutasi.pindahPergi || this.selectedMutasi === Mutasi.kematian){
            if(!hot.getSelected())
                return;

            this.selectedPenduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        }
    }

    mutasi(isMultiple: boolean): void {
        let hot = this.hots['penduduk'];
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));
        let data = jsonData['data']['mutasi'];

        switch(this.selectedMutasi){
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
                if(!isMultiple) 
                    $('#mutasi-modal').modal('hide');
            });
        });
    }
    
    insertRow(): void {
        let hot = this.hots['penduduk'];
        hot.alter('insert_row', 0);
        hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
    }

    addDetail(): void {
        let hot = this.hots['penduduk'];

        if(!hot.getSelected())
            return;
        
        let detail = hot.getDataAtRow(hot.getSelected()[0]);
        let existingDetail = this.details.filter(e => e[0] === detail[0])[0];

        if(!existingDetail)
            this.details.push(detail);
        
        this.selectedDetail = this.details[this.details.length - 1];
        this.activeSheet = {};
        this.selectedKeluarga = {"kk": null, "data": [] };
    }

    addKeluarga(): void {
        let hot = this.hots['penduduk'];

        if(!hot.getSelected())
            return;
        
        let penduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        let keluarga: any[] = hot.getSourceData().filter(e => e['22'] === penduduk.no_kk);

        if(keluarga.length > 0){
            this.keluargaCollection.push({
                "kk": penduduk.no_kk,
                "data": keluarga
            });
        } 
        this.selectedKeluarga = this.keluargaCollection[this.keluargaCollection.length - 1];
        this.hotKeluarga.loadData(this.selectedKeluarga.data);

        let me = this;

        setTimeout(() => {
            me.hotKeluarga.render();
            me.activeSheet = {};
            me.selectedDetail = [];
        }, 200);
    }

    removeDetail(detail): boolean {
        let index = this.details.indexOf(detail);

        if(index > -1)
            this.details.splice(index, 1);
        
        if(this.details.length === 0)
            this.setActiveSheet(this.sheets.filter(e => e.id === 'penduduk')[0]);
        else
            this.setDetail(this.details[this.details.length - 1]);

        return false;
    }

    removeKeluarga(keluarga): boolean{
        let index = this.keluargaCollection.indexOf(keluarga);

        if(index > -1)
            this.keluargaCollection.splice(index, 1);
        
        if(this.keluargaCollection.length === 0)
            this.setActiveSheet(this.sheets.filter(e => e.id === 'penduduk')[0]);
        else
            this.setKeluarga(keluarga);
        
        return false;
    }

    setDetail(detail): boolean {
        this.selectedDetail = detail;
        this.selectedKeluarga = {"kk": null, "data": [] };
        this.activeSheet = {};
        return false;
    }

    setKeluarga(kk): boolean{
        let hot = this.hots['penduduk']
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];
        
        if(!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.hotKeluarga.loadData(this.selectedKeluarga.data);

        let me = this;

        setTimeout(() => {
            me.hotKeluarga.render();
            me.activeSheet = {};
            me.selectedDetail = [];
        }, 200);

        return false;
    }

     initProdeskel(): void {
        let hot = this.hots['penduduk'];
        let selectedPenduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);

        this.syncData.penduduk = selectedPenduduk;
        this.syncData.action = 'Tambah';
        this.browser = new webdriver.Builder().forBrowser('firefox').build();
        this.browser.get(PRODESKEL_URL);
        this.browser.findElement(webdriver.By.name('login')).sendKeys(settings.data['prodeskelRegCode']);
        this.browser.findElement(webdriver.By.name('pswd')).sendKeys( settings.data['prodeskelPassword']);
        this.browser.findElement(webdriver.By.id('sub_form_b')).click();

        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('btn_1')), 5 * 1000).then(el => {
            el.click();
        });

        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('iframe_mdesa')), 5 * 1000).then(el => {
            this.browser.switchTo().frame(el);
        });

        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('quant_linhas_f0_bot')), 5 * 1000).then(el => {
            el.sendKeys('all');
            
            let formProcess = this.browser.findElement(webdriver.By.id('id_div_process_block'));

            this.browser.wait(webdriver.until.elementIsNotVisible(formProcess), 10 * 1000).then(() => {
                this.browser.findElement(webdriver.By.id('apl_grid_ddk01#?#1')).then(res => {
                     let exists: boolean = false;
                });
            });
        });
    }

    afterSave(): void{
        if(this.afterSaveAction == "home")
            document.location.href="app.html";
        else if(this.afterSaveAction == "quit")
            APP.quit();
    } 

    importExcel(): void {
        let files = remote.dialog.showOpenDialog(null);
        if(files && files.length){
            this.importer.init(files[0]);
            $("#modal-import-columns").modal("show");
        }
    }

    exportExcel(): void {
        let hot = this.hots['penduduk'];        
        let data = hot.getData();
        exportPenduduk(data, "Data Penduduk");
    }
}
