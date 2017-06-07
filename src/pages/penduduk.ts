import { Component, ApplicationRef, ViewChild } from "@angular/core";
import { remote, shell } from "electron";
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Diff } from "../helpers/diffTracker";
import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import DiffTracker from "../helpers/diffTracker";
import PendudukStatisticComponent from '../components/pendudukStatistic';

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';

const base64 = require("uuid-base64");
const $ = require('jquery');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');
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
    isFileMenuShown: boolean = false;
    isStatisticShown: boolean = false;
    isSuratShown: boolean = false;
    activeSheet: string = 'penduduk';
    savingMessage: string = null;
    afterSaveAction: string = null;
    bundleData: any =  {"penduduk": [], "mutasi": [], "logSurat": [] };
    bundleSchemas: any = { "penduduk": schemas.penduduk, "mutasi": schemas.mutasi, "logSurat": schemas.logSurat };
    trimmedRows: any[] = [];
    selectedDetail: any;
    selectedKeluarga: any;
    selectedPenduduk: any;
    selectedMutasi: Mutasi;
    hots: any;
    importer: any;
    tableSearcher: any;
    data: any;
    currentDiff: Diff;
    diffTracker: DiffTracker;
    page: number = 1;
    pageLength: number = 10;
    totalItems: number = 0;
    details: any[] = [];
    keluargaCollection: any[] = [];

    @ViewChild(PendudukStatisticComponent)
    pendudukStatistic: PendudukStatisticComponent;

    constructor(private appRef: ApplicationRef){}

    ngOnInit(): void { 
        let pendudukSheet = $('.penduduk-sheet')[0];
        let mutasiSheet = $('.mutasi-sheet')[0];
        let logSuratSheet = $('.logSurat-sheet')[0];
        let keluargaSheet = $('.keluarga-sheet')[0];

        this.hots = {
            "penduduk": this.createHandsontable(pendudukSheet, schemas.penduduk),
            "mutasi": this.createHandsontable(mutasiSheet, schemas.mutasi),
            "logSurat": this.createHandsontable(logSuratSheet, schemas.logSurat),
            "keluarga": this.createHandsontable(keluargaSheet, schemas.penduduk)
        }; 

        this.data = { "penduduk": [], "mutasi": [], "logSurat": [] };
        this.selectedPenduduk = schemas.arrayToObj([], schemas.penduduk);
        this.selectedDetail = [];

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

        this.pageLength = parseInt(settings.data["maxPaging"]);
        this.diffTracker = new DiffTracker();
        this.importer = new Importer(pendudukImporterConfig);
        this.initializeSearcher();
    }

    initializeSearcher(): void {
        let spanSelected = $("#span-selected")[0];
        let hot = this.hots['penduduk'];
        let spanCount = $("#span-count")[0];
        let inputSearch = document.getElementById("input-search");

        initializeTableSelected(hot, 1, spanSelected);
        initializeTableCount(hot, spanCount);

        this.tableSearcher = initializeTableSearch(hot, document, inputSearch, null);
        this.getContent(this.activeSheet);
    }

    createHandsontable(element, schema): any {
        return new Handsontable(element, {
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
    }

    getContent(sheet): void {
        let me = this;
       
        dataApi.getContent(sheet, null, me.bundleData, me.bundleSchemas, (result) => {
            if(!result)
                me.data[sheet] = [];
            else
                me.data[sheet] = result;
            
            this.hots[sheet].loadData(me.data[sheet]);

            me.totalItems = me.data[sheet].length;

            if(sheet === 'penduduk')
                me.pageChange(this.page);

            setTimeout(() => {
                me.hots[sheet].render();
                me.appRef.tick();
            }, 200);
        });
    }

    saveContent(sheet): void {
        $("#modal-save-diff").modal("hide");
         let me = this;
         let hot = this.hots['penduduk'];

         me.bundleData[sheet] = hot.getSourceData();

         dataApi.saveContent(sheet, null, me.bundleData, me.bundleSchemas, (err, data) => {
              if(!err)
                me.savingMessage = 'Penyimpanan berhasil';
              else
                me.savingMessage = 'Penyimpanan gagal';
                
                me.data[sheet] = data;
                hot.loadData(me.data[sheet]);

                me.afterSave();

                setTimeout(() => {
                    me.savingMessage = null;
                }, 2000);
         });
    }

    pageChange(page): void {
        this.page = page;
        let hot = this.hots['penduduk'];
        let plugin = hot.getPlugin('trimRows');
        let dataLength = hot.getSourceData().length;
        let pageBegin = (this.page - 1) * this.pageLength;
        let offset = this.page * this.pageLength;

        hot.scrollViewportTo(0);

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

    setActiveSheet(sheet): boolean{
        this.isStatisticShown = false;
        this.activeSheet = sheet;

        this.getContent(sheet);
        this.selectedDetail = [];
        this.selectedKeluarga = null;
        return false;
    }

    showStatistic(): boolean{
        this.isStatisticShown = true;
        this.activeSheet = null;
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

    addDetail(): void {
        let hot = this.hots['penduduk'];

        if(!hot.getSelected())
            return;

        let detail = hot.getDataAtRow(hot.getSelected()[0]);
        let existingDetail = this.details.filter(e => e[0] === detail[0])[0];

        if(!existingDetail)
            this.details.push(detail);
        
        this.selectedDetail = this.details[this.details.length - 1];
        this.activeSheet = null;
    }

    setDetail(detail): boolean {
        this.selectedDetail = detail;
        this.selectedKeluarga = null;
        this.activeSheet = null;
        return false;
    }

    removeDetail(detail): boolean {
        let index = this.details.indexOf(detail);

        if(index > -1)
            this.details.splice(index, 1);
        
        if(this.details.length === 0)
            this.setActiveSheet('penduduk');
        else
            this.setDetail(this.details[this.details.length - 1]);

        return false;
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
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        this.hots['keluarga'].render();
        this.selectedDetail = [];
        this.activeSheet = null;
    }

    setKeluarga(kk): boolean{
       let hot = this.hots['penduduk']
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];
        
        if(!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        this.hots['keluarga'].render();
        this.selectedDetail = [];
        this.activeSheet = null;
        return false;
    }

    removeKeluarga(keluarga): boolean{
        let index = this.keluargaCollection.indexOf(keluarga);

        if(index > -1)
            this.keluargaCollection.splice(index, 1);
        
        if(this.keluargaCollection.length === 0)
            this.setActiveSheet('hot');
        else
            this.setKeluarga(keluarga);
        
        return false;
    }

    openSaveDialog(): void {
        let data = this.hots[this.activeSheet].getSourceData();
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));

        this.currentDiff = this.diffTracker.trackDiff(jsonData["data"][this.activeSheet], data);

        let me = this;
        
        if(this.currentDiff.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff")['modal']("show");

            setTimeout(() => {
                me.hots[me.activeSheet].unlisten();
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

    afterSave(): void{
        if(this.afterSaveAction == "home")
            document.location.href="app.html";
        else if(this.afterSaveAction == "quit")
            APP.quit();
    } 

    showFileMenu(isFileMenuShown): void {
        this.isFileMenuShown = isFileMenuShown;
        this.isSuratShown = false;

        if(isFileMenuShown)
            titleBar.normal();
        else
            titleBar.blue();
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
}
