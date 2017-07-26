import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone } from "@angular/core";
import { Progress } from 'angular-progress-http';
import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';

import 'rxjs/add/operator/finally';

import dataApi from '../stores/dataApi';
import DataApiService from '../stores/dataApiService';
import settings from '../stores/settings';
import schemas from '../schemas';
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import titleBar from '../helpers/titleBar';
import ProdeskelWebDriver from '../helpers/prodeskelWebDriver';

import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';
import ProgressBarComponent from '../components/progressBar';

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
var app = remote.app;

const APP_DIR = jetpack.cwd(app.getAppPath());
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const SHOW_COLUMNS = [
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "pekerjaan", "kewarganegaraan", "rt", "rw", "nama_dusun", "agama", "alamat_jalan"],
    ["nik", "nama_penduduk", "no_telepon", "email", "rt", "rw", "nama_dusun", "alamat_jalan"],
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu", "hubungan_keluarga", "no_kk"]
];

enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
export default class PendudukComponent {
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
    isFiltered: boolean;
    isStatisticShown: boolean;
    isSuratShown: boolean;
    isPendudukEmpty: boolean;
    selectedPenduduk: any;
    selectedDetail: any;
    selectedKeluarga: any;
    selectedDiff: string;
    diffTracker: DiffTracker;
    selectedMutasi: Mutasi;
    currentDiffs: any;
    afterSaveAction: string;
    progress: Progress;
    progressMessage: string;

    @ViewChild(PaginationComponent)
    paginationComponent: PaginationComponent;

    constructor(private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private appRef: ApplicationRef,
        private ngZone: NgZone,
        private dataApiService: DataApiService) {

        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Penduduk - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();
        this.progressMessage = '';

        this.progress = {
            percentage: 0,
            total: 0,
            event: null,
            lengthComputable: true,
            loaded: 0
        };

        this.trimmedRows = [];
        this.keluargaCollection = [];
        this.details = [];
        this.resultBefore = [];
        this.bundleData = { "penduduk": [], "mutasi": [], "logSurat": [] };
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

            if (!element || !schema)
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
                hiddenColumns: { columns: [0], indicators: true },
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
            hiddenColumns: { columns: [0], indicators: true },
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

            if (this.paginationComponent.itemPerPage) {
                if (plugin.trimmedRows.length === 0) {
                    this.trimmedRows = [];
                    this.isFiltered = false;
                }

                else {
                    this.trimmedRows = plugin.trimmedRows.slice();
                    this.isFiltered = true;
                }

                if (formulas.length === 0)
                    this.paginationComponent.totalItems = this.hots['penduduk'].getSourceData().length;
                else
                    this.paginationComponent.totalItems = this.trimmedRows.length;

                this.paginationComponent.pageBegin = 1;
                this.paginationComponent.calculatePages();
                this.pagingData();
            }
            else {
                if (plugin.trimmedRows.length === 0) {
                    this.trimmedRows = [];
                    this.isFiltered = false;
                }
                else {
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
        
        this.getContent();
        this.setActiveSheet(this.activeSheet);
    }

    getContent(): void {
        let me = this;
        let localBundle = this.dataApiService.getLocalContent('penduduk', this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.progressMessage = 'Memuat data';
        
        this.dataApiService.getContent('penduduk', null, changeId, this.progressListener.bind(this))
            .subscribe(
                result => {                    
                    if(result["change_id"] !== localBundle.changeId){
                        if(result["diffs"]){
                            if(result["diffs"]["penduduk"].length > 0)
                                this.toastr.info("Terdapat " + result["diffs"]["penduduk"].length + " perubahan pada data penduduk");
                            if(result["diffs"]["logSurat"].length > 0)
                                this.toastr.info("Terdapat " + result["diffs"]["logSurat"].length + " perubahan pada data log surat");
                            if(result["diffs"]["mutasi"].length > 0)
                                this.toastr.info("Terdapat " + result["diffs"]["mutasi"].length + " perubahan pada data log mutasi");
                        }
                    }

                    mergedResult = this.mergeContent(result, localBundle);  

                    try {
                        jetpack.write(path.join(CONTENT_DIR, 'penduduk.json'), JSON.stringify(mergedResult));
                    } 
                    catch (exception) {
                    }
                    
                    if (mergedResult['diffs']['penduduk'].length > 0 || 
                        mergedResult['diffs']['mutasi'].length > 0 ||
                        mergedResult['diffs']['logSurat'].length > 0)
                        this.saveContent(false);
                    else {
                        this.hots['penduduk'].loadData(mergedResult['data']['penduduk']);
                        this.hots['mutasi'].loadData(mergedResult['data']['mutasi']);
                        this.hots['logSurat'].loadData(mergedResult['data']['logSurat']);
                    }
                },
                error => {
                    let penduduk = this.dataApiService.mergeDiffs(localBundle['diffs']['penduduk'], localBundle['data']['penduduk']);
                    let mutasi = this.dataApiService.mergeDiffs(localBundle['diffs']['mutasi'], localBundle['data']['mutasi']);
                    let logSurat = this.dataApiService.mergeDiffs(localBundle['diffs']['logSurat'], localBundle['data']['logSurat']);
                    
                    this.hots['penduduk'].loadData(penduduk);
                    this.hots['mutasi'].loadData(mutasi);
                    this.hots['logSurat'].loadData(logSurat);
                }
            );
    }

    saveContent(isTrackingDiff: boolean): void {
        $('#modal-save-diff').modal('hide'); 
        
        let localBundle = this.dataApiService.getLocalContent('penduduk', this.bundleSchemas);

        if (isTrackingDiff) {
            this.bundleData['penduduk'] = this.hots['penduduk'].getSourceData();
            this.bundleData['mutasi'] = this.hots['mutasi'].getSourceData();
            this.bundleData['logSurat'] = this.hots['logSurat'].getSourceData();
            this.progressMessage = 'Menyimpan Data';
        
            let diffs = {
                "penduduk": this.diffTracker.trackDiff(localBundle['data']['penduduk'], this.bundleData['penduduk']),
                "mutasi": this.diffTracker.trackDiff(localBundle['data']['mutasi'], this.bundleData['mutasi']),
                "logSurat": this.diffTracker.trackDiff(localBundle['data']['logSurat'], this.bundleData['logSurat'])
            }

            if(diffs.penduduk.total > 0)
                localBundle['diffs']['penduduk'] = localBundle.diffs['penduduk'].concat(diffs.penduduk);
            if(diffs.mutasi.total > 0)
                localBundle['diffs']['mutasi'] = localBundle['diffs']['mutasi'].concat(diffs.mutasi);
            if(diffs.logSurat.total > 0)
                localBundle['diffs']['logSurat'] = localBundle['diffs']['logSurat'].concat(diffs.logSurat);
        }
        
        this.dataApiService.saveContent('penduduk', null, localBundle, this.bundleSchemas, this.progressListener.bind(this))
            .finally(() => 
            {              
                try {
                    jetpack.write(path.join(CONTENT_DIR, 'penduduk.json'), JSON.stringify(localBundle));
                    this.toastr.success('Data berhasil disimpan ke komputer');
                } 
                catch (exception) {
                    this.toastr.error('Data gagal disimpan ke komputer');
                }
            })
            .subscribe(
                result => {
                    let mergedResult = this.mergeContent(result, localBundle);

                    localBundle.diffs['penduduk'] = [];
                    localBundle.diffs['mutasi'] = [];
                    localBundle.diffs['logSurat'] = [];
                    
                    localBundle.data['penduduk'] = mergedResult['data']['penduduk'];
                    localBundle.data['mutasi'] = mergedResult['data']['mutasi'];
                    localBundle.data['logSurat'] = mergedResult['data']['logSurat'];
                    
                    this.hots["penduduk"].loadData(localBundle["data"]["penduduk"]);
                    this.hots["mutasi"].loadData(localBundle["data"]["mutasi"]);
                    this.hots["logSurat"].loadData(localBundle["data"]["logSurat"]);
                    
                    this.toastr.success('Data berhasil disimpan ke server');
                },
                error => {
                    this.toastr.error('Data gagal disimpan ke server');
                }
            )
    }

    mergeContent(serverData, localBundle): any {
        let localPendudukDiffs = localBundle.diffs["penduduk"];
        let localMutasiDiffs = localBundle.diffs["mutasi"];
        let localLogSuratDiffs = localBundle.diffs["logSurat"];
        
        if(serverData['diffs']){
            let serverPendudukDiffs = serverData["diffs"]["penduduk"] ? serverData["diffs"]["penduduk"] : [];
            let serverMutasiDiffs = serverData["diffs"]["mutasi"] ? serverData["diffs"]["mutasi"] : [];
            let serverLogSuratDiffs = serverData["diffs"]["logSurat"] ? serverData["diffs"]["logSurat"] : [];

            localBundle["data"]["penduduk"] = this.dataApiService.mergeDiffs(serverPendudukDiffs, localBundle["data"]["penduduk"]);
            localBundle["data"]["mutasi"] = this.dataApiService.mergeDiffs(serverMutasiDiffs, localBundle["data"]["mutasi"]);
            localBundle["data"]["logSurat"] = this.dataApiService.mergeDiffs(serverLogSuratDiffs, localBundle["data"]["logSurat"]);
        }
        else if(serverData['data'] instanceof Array){
            localBundle["data"]["penduduk"] = serverData["data"];
        }
        else {
             localBundle["data"]["penduduk"] = serverData["data"]["penduduk"] ? serverData["data"]["penduduk"] : [];
             localBundle["data"]["mutasi"] = serverData["data"]["mutasi"] ? serverData["data"]["mutasi"] : [];
             localBundle["data"]["logSurat"] = serverData["data"]["logSurat"] ? serverData["data"]["logSurat"] : [];
        }

        localBundle.changeId = serverData.change_id;
        return localBundle;
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    pageData(data): void {
        if (this.paginationComponent.itemPerPage && data.length > this.paginationComponent.itemPerPage) {
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

        if (this.trimmedRows.length > 0)
            plugin.trimRows(this.trimmedRows);

        for (let i = 0; i < dataLength; i++)
            sourceRows.push(i);

        if (this.trimmedRows.length > 0)
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

    setActiveSheet(sheet): boolean {
        if (this.activeSheet) {
            this.hots[this.activeSheet].unlisten();
        }

        this.activeSheet = sheet;

        if (this.activeSheet) {
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

    openSaveDialog(): void {
        let pendudukData = this.hots['penduduk'].getSourceData();
        let mutasiData = this.hots['mutasi'].getSourceData();
        let logSuratData = this.hots['logSurat'].getSourceData();

        let localBundle = this.dataApiService.getLocalContent('penduduk', this.bundleSchemas);
    
        this.currentDiffs = {
            "penduduk": this.diffTracker.trackDiff(localBundle.data['penduduk'], pendudukData),
            "mutasi": this.diffTracker.trackDiff(localBundle.data['mutasi'], mutasiData),
            "logSurat": this.diffTracker.trackDiff(localBundle.data['logSurat'], logSuratData)
        }
       
        let me = this;

        if (this.currentDiffs.penduduk.total > 0 || this.currentDiffs.mutasi.total > 0 
            || this.currentDiffs.logSurat.total > 0) {

            this.selectedDiff = 'penduduk';
            this.afterSaveAction = null;
            $('#modal-save-diff')['modal']('show');

            setTimeout(() => {
                me.hots['penduduk'].unlisten();
                me.hots['mutasi'].unlisten();
                me.hots['logSurat'].unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }

        else {
            this.toastr.custom('<span style="color: red">Tidak ada data yang berubah.</span>', null, { enableHTML: true });
        }
    }

    switchDiff(sheet): boolean {
        this.selectedDiff = sheet;
        return false;
    }

    showSurat(show): void {
        let hot = this.hots['penduduk'];

        if (!hot.getSelected()) {
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        this.isSuratShown = show;

        if (!show) {
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

        if (!hot.getSelected()) {
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        let data = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);

        let detail = {
            "headers": schemas.penduduk.map(c => c.header),
            "fields": schemas.penduduk.map(c => c.field),
            "data": data
        };

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

        if (!hot.getSelected()) {
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

        if (this.keluargaCollection.length === 0)
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

    importExcel(): void {
        let files = remote.dialog.showOpenDialog(null);
        if (files && files.length) {
            this.importer.init(files[0]);
            $("#modal-import-columns").modal("show");
        }
    }
    
    doImport(overwrite): void {
        $("#modal-import-columns").modal("hide");
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

    spliceArray(fields, showColumns): any {
        let result = [];
        for (var i = 0; i != fields.length; i++) {
            var index = showColumns.indexOf(fields[i]);
            if (index == -1) result.push(i);
        }
        return result;
    }

    openMutasiDialog(): void {
        this.changeMutasi(Mutasi.kelahiran);

        if (this.hots['penduduk'].getSelected())
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
        let data = this.hots['mutasi'].getSourceData();
        
        try{
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

            this.bundleData['mutasi'] = data;
            this.hots['mutasi'].loadData(data);

            if(!isMultiple)
                $('#mutasi-modal').modal('hide');
            
            this.toastr.success('Mutasi penduduk berhasil');
        }
        catch(exception){
            this.toastr.error('Mutasi penduduk gagal');
        }
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

    initProdeskel(): void {
        let hot = this.hots['keluarga'];
        let penduduks = hot.getSourceData().map(p => schemas.arrayToObj(p, schemas.penduduk));

        let prodeskelWebDriver = new ProdeskelWebDriver();
        prodeskelWebDriver.openSite();
        prodeskelWebDriver.login(settings.data['prodeskelRegCode'], settings.data['prodeskelPassword']);
        prodeskelWebDriver.addNewKK(penduduks.filter(p => p.hubungan_keluarga == 'Kepala Keluarga')[0], penduduks);
    }

    forceQuit(): void {
        document.location.href="app.html";
    }

    afterSave(): void {
        if (this.afterSaveAction == "home")
            document.location.hash = "";
        else if (this.afterSaveAction == "quit")
            app.quit();
    }

    redirectMain(): void {
        if(!this.activeSheet){
             document.location.hash = "";
             return;
        }
          
        let data = this.hots[this.activeSheet].getSourceData();
        let file = this.dataApiService.getFile(this.activeSheet);
        let localBundle = this.dataApiService.getLocalContent(file, this.bundleSchemas);
        let latestDiff = this.diffTracker.trackDiff(localBundle.data[this.activeSheet], data);

        this.afterSaveAction = 'home';

        if(latestDiff.total === 0)
            document.location.hash = "";
        else
            this.openSaveDialog();
    }
}
