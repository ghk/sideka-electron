import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';

import dataApi from "../stores/dataApi";
import settings from '../stores/settings';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';

import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import { Component, ApplicationRef, ViewChild } from "@angular/core";
import { remote, shell } from "electron";
import { Diff, DiffTracker } from "../helpers/diffTracker";

const base64 = require("uuid-base64");
const $ = require('jquery');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');
const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DATA_TYPE_DIRS = { "penduduk": "penduduk", "logSurat": "penduduk", "mutasi": "penduduk" };
const SHOW_COLUMNS = [      
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","pekerjaan","kewarganegaraan","rt","rw","nama_dusun","agama","alamat_jalan"],
    ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
    ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"],
    ["nik","nama_penduduk","kompetensi","pendidikan","pekerjaan","pekerjaan_ped"]
];

const SPLICE_ARRAY = function(fields, showColumns){
    var result=[];
    for(var i=0;i!=fields.length;i++){
        var index = showColumns.indexOf(fields[i]);
        if (index == -1) result.push(i);
    }
    return result;
};

const getBaseHotOptions = (schema) => {
    return {
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
        dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
    }
};

enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})

export default class PendudukComponent {
    data: any;
    hots: any;
    diffTracker: DiffTracker;
    currentDiff: Diff;
    importer: any;
    tableSearcher: any;
    isFileMenuShown: boolean = false;
    isStatisticShown: boolean = false;
    isSuratShown: boolean = false;
    activeSheet: string = 'penduduk';
    savingMessage: string = null;
    afterSaveAction: string = null;
    bundleData: any = { "penduduk": [], "mutasi": [], "logSurat": [] };
    bundleSchemas: any = { "penduduk": schemas.penduduk, "mutasi": schemas.mutasi, "logSurat": schemas.logSurat };
    trimmedRows: any[];
    details: any[];
    keluargaCollection: any[];
    selectedDetail: any;
    selectedKeluarga: any;
    selectedPenduduk: any;
    selectedMutasi: Mutasi;
    resultBefore: any[];
    
    @ViewChild(PaginationComponent)
    paginationComponent: PaginationComponent;

    constructor(private appRef: ApplicationRef) { }

    ngOnInit(): void {
        let pendudukOptions = getBaseHotOptions(schemas.penduduk);
        
        pendudukOptions['beforeRemoveRow'] = (row, amount) => {
            this.data['penduduk'].splice(row, amount);
        };

        pendudukOptions['afterFilter'] = (formulas) => {
            let plugin = this.hots['penduduk'].getPlugin('trimRows');
                    
            if(plugin.trimmedRows.length === 0)
                this.trimmedRows = [];
            else
                this.trimmedRows = plugin.trimmedRows.slice();
            
            if(formulas.length === 0)
                this.paginationComponent.totalItems = this.hots['penduduk'].getSourceData().length;
            else
                this.paginationComponent.totalItems = this.hots['penduduk'].getData().length;

            this.paginationComponent.pageBegin = 1;
            this.pagingData();
        };

        this.hots = {
            "penduduk": this.createHot($('.penduduk-sheet')[0], pendudukOptions),
            "mutasi": this.createHot($('.mutasi-sheet')[0], getBaseHotOptions(schemas.mutasi)),
            "logSurat": this.createHot($('.logSurat-sheet')[0], getBaseHotOptions(schemas.logSurat)),
            "keluarga": this.createHot($('.keluarga-sheet')[0], getBaseHotOptions(schemas.penduduk))
        };

        this.paginationComponent.itemPerPage = parseInt(settings.data['maxPaging']);
        this.resultBefore = [];
        this.details = [];
        this.trimmedRows = [];
        this.selectedDetail = [];
        this.keluargaCollection = [];
        this.selectedPenduduk = schemas.arrayToObj([], schemas.penduduk);
        this.data = { "penduduk": [], "mutasi": [], "logSurat": [] };
        this.activeSheet = 'penduduk';
        this.importer = new Importer(pendudukImporterConfig);
        this.diffTracker = new DiffTracker();

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

        this.getContent(this.activeSheet);
    }

    createHot(element, options): any{
        return new Handsontable(element, options);
    }
    
    getContent(type): void {
        dataApi.getContent(type, null, this.bundleData, this.bundleSchemas, (result) => {
            if(!result)
                this.data[type] = [];
            else
                this.data[type] = result;
            
            this.hots[type].loadData(this.data[type]);

            this.paginationComponent.pageBegin = 1;
            this.paginationComponent.totalItems = result.length;
            this.paginationComponent.calculatePages();
            this.pagingData();

            setTimeout(() => {
                this.hots[type].render();
                this.appRef.tick();
            }, 200);
        });
    }

    saveContent(type): void {
        $("#modal-save-diff").modal("hide");
      
        let hot = this.hots['penduduk'];

        this.bundleData[type] = hot.getSourceData();

        dataApi.saveContent(type, null, this.bundleData, this.bundleSchemas, (err, data) => {
            if (!err)
                this.savingMessage = 'Penyimpanan berhasil';
            else
                this.savingMessage = 'Penyimpanan gagal';

            this.data[type] = data;
            
            hot.loadData(this.data[type]);

            this.afterSave();

            setTimeout(() => {
                this.savingMessage = null;
            }, 2000);
        });
    }

    setActiveSheet(sheet): boolean {
        this.isStatisticShown = false;
        this.activeSheet = sheet;
        this.getContent(sheet);
        this.isStatisticShown = false;
        this.selectedDetail = [];
        this.selectedKeluarga = null;
        return false;
    }

    showStatistic(): boolean {
        this.isStatisticShown = true;
        this.activeSheet = null;
        this.selectedDetail = [];
        this.selectedKeluarga = null;
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

    showSurat(): boolean {
        this.isFileMenuShown = true;
        this.isSuratShown = true;

        let hot = this.hots['penduduk'];

        if (!hot.getSelected())
            return;

        let penduduk = hot.getDataAtRow(hot.getSelected()[0]);
        this.selectedPenduduk = schemas.arrayToObj(penduduk, schemas.penduduk);
        return false;
    }

    addDetail(): void {
        let hot = this.hots['penduduk'];

        if (!hot.getSelected())
            return;

        let detail = hot.getDataAtRow(hot.getSelected()[0]);
        let existingDetail = this.details.filter(e => e[0] === detail[0])[0];

        if (!existingDetail)
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

        if (!hot.getSelected())
            return;

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
        this.hots['keluarga'].render();
        this.selectedDetail = [];
        this.activeSheet = null;
    }

    setKeluarga(kk): boolean {
        let hot = this.hots['penduduk']
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];

        if (!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.hots['keluarga'].loadData(this.selectedKeluarga.data);
        this.hots['keluarga'].render();
        this.selectedDetail = [];
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

    openSaveDialog(): void {
        let data = this.hots[this.activeSheet].getSourceData();
        let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));

        this.currentDiff = this.diffTracker.trackDiff(jsonData["data"][this.activeSheet], data);

        let me = this;

        if (this.currentDiff.total > 0) {
            this.afterSaveAction = null;
            $("#modal-save-diff")['modal']("show");

            setTimeout(() => {
                me.hots[me.activeSheet].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }

        else {
            this.savingMessage = 'Tidak ada data yang berubah';
            setTimeout(() => {
                me.savingMessage = null;
            }, 200)
        }
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            document.location.href = "app.html";
        else if (this.afterSaveAction == "quit")
            APP.quit();
    }

    insertRow(): void {
        let hot = this.hots['penduduk'];
        hot.alter('insert_row', 0);
        hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
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

    next(): void{
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

    onPage(page): void{
        this.paginationComponent.pageBegin = page;
        this.paginationComponent.calculatePages();
        this.pagingData();
    }

    goToFirst(): void {
        this.paginationComponent.pageBegin = 1;
        this.paginationComponent.calculatePages();
        this.pagingData();
    }

    goToLast(): void {
        this.paginationComponent.pageBegin = this.paginationComponent.totalPage;
        this.paginationComponent.calculatePages();
        this.pagingData();
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

    openMutasiDialog(): void {
        this.changeMutasi(Mutasi.pindahPergi);
        $('#mutasi-modal').modal('show');
    }

    changeMutasi(mutasi): void {
        let hot = this.hots['penduduk']

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

    filterContent(){ 
        let hot = this.hots['penduduk'];
        var plugin = hot.getPlugin('hiddenColumns');        
        var value = parseInt($('input[name=btn-filter]:checked').val());   
        var fields = schemas.penduduk.map(c => c.field);
        var result = SPLICE_ARRAY(fields, SHOW_COLUMNS[value]);

        plugin.showColumns(this.resultBefore);

        plugin.hideColumns(result);
    
        hot.render();
        this.resultBefore = result;
    }
}
