import { remote, shell } from 'electron';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { DiffTracker, DiffMerger } from "../helpers/diffs";
import { PersistablePage } from '../pages/persistablePage';

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as _ from 'lodash';

import 'rxjs/add/operator/finally';

import { DiffItem } from '../stores/bundle';
import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import TableHelper from '../helpers/table';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import ProdeskelProtocol from '../helpers/prodeskelProtocol';
import ProdeskelSynchronizer from '../helpers/prodeskelSynchronizer';
import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';
import ProgressBarComponent from '../components/progressBar';
import PageSaver from '../helpers/pageSaver';
import DataHelper from '../helpers/dataHelper';
import SidekaProdeskelMapper from '../helpers/sidekaProdeskelMapper';

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');

const SHOW_COLUMNS = [
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "pekerjaan", "kewarganegaraan", "rt", "rw", "nama_dusun", "agama", "alamat_jalan"],
    ["nik", "nama_penduduk", "no_telepon", "email", "rt", "rw", "nama_dusun", "alamat_jalan"],
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu", "hubungan_keluarga", "no_kk"]
];
enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: '../templates/penduduk.html'
})
export default class PendudukComponent implements OnDestroy, OnInit, PersistablePage {
    type = "penduduk";
    subType = null;
    bundleSchemas = schemas.pendudukBundle;

    sheets: any[];
    trimmedRows: any[];
    keluargaCollection: any[];
    details: any[];
    resultBefore: any[];
    activeSheet: any;
    hots: any;
    importer: any;
    tableHelper: any;
    isFiltered: boolean;
    isPendudukEmpty: boolean;
    selectedPenduduk: any;
    selectedDetail: any;
    selectedKeluarga: any;
    selectedDiff: string;
    selectedMutasi: Mutasi;
    afterSaveAction: string;
    progress: Progress;
    progressMessage: string;
    inputSearch: any;
    pageSaver: PageSaver;
    pendudukAfterRemoveRowHook: any;
    pendudukAfterFilterHook: any;
    pendudukSubscription: Subscription;
    modalSaveId: string;
    selectedProdeskelData: any;
    prodeskelData: any[];
    pendudukSchema: any[];
    activePageMenu: string;
    prodeskelRegCode: string;
    prodeskelPassword: string;
    prodeskelPengisi: string;
    prodeskelJabatan: string;
    prodeskelPekerjaan: string;
    currentProdeskelIndex: number;

    @ViewChild(PaginationComponent)
    paginationComponent: PaginationComponent;

    @ViewChild(PendudukStatisticComponent)
    pendudukStatisticComponent: PendudukStatisticComponent;

    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,
        private settingsService: SettingsService,
        public toastr: ToastsManager,
        public router: Router,
        private vcr: ViewContainerRef,
        private appRef: ApplicationRef,
        private ngZone: NgZone,
    ) {
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this);
    }

    ngOnInit(): void {
        titleBar.title("Data Kependudukan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        this.currentProdeskelIndex = 0;
        this.progressMessage = '';
        this.progress = {
            percentage: 0,
            total: 0,
            event: null,
            lengthComputable: true,
            loaded: 0
        };

        this.modalSaveId = 'modal-save-diff';
        this.trimmedRows = [];
        this.keluargaCollection = [];
        this.details = [];
        this.resultBefore = [];
        this.pageSaver.bundleData = { "penduduk": [], "mutasi": [], "log_surat": [], "prodeskel": [] };
        this.sheets = ['penduduk', 'mutasi', 'logSurat', 'prodeskel'];
        this.hots = { "penduduk": null, "mutasi": null, "logSurat": null, "prodeskel": null, "keluarga": null };
        this.pendudukSchema = schemas.penduduk; 
        this.paginationComponent.itemPerPage = parseInt(this.settingsService.get('maxPaging'));
        this.selectedPenduduk = schemas.arrayToObj([], schemas.penduduk);
        this.selectedDetail = schemas.arrayToObj([], schemas.penduduk);

        this.importer = new Importer(pendudukImporterConfig);
        this.pageSaver.subscription = this.pendudukSubscription;

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

        this.hots.keluarga = new Handsontable($('.keluarga-sheet')[0], {
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

        this.pendudukAfterFilterHook = (formulas) => {
            let plugin = this.hots.penduduk.getPlugin('trimRows');

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
                    this.paginationComponent.totalItems = this.hots.penduduk.getSourceData().length;
                else
                    this.paginationComponent.totalItems = this.trimmedRows.length;

                this.paginationComponent.setCurrentPage(1);
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
        }
        
        this.pendudukAfterRemoveRowHook = (index, amount) => {
            this.checkPendudukHot();
        }
        
        this.hots.penduduk.addHook('afterFilter', this.pendudukAfterFilterHook);    
        this.hots.penduduk.addHook('afterRemoveRow', this.pendudukAfterRemoveRowHook);

        let spanSelected = $("#span-selected")[0];
        let spanCount = $("#span-count")[0];
        let inputSearch = document.getElementById("input-search");

        this.tableHelper = new TableHelper(this.hots.penduduk, inputSearch);
        this.tableHelper.initializeTableSelected(this.hots.penduduk, 2, spanSelected);
        this.tableHelper.initializeTableCount(this.hots.penduduk, spanCount);
        this.tableHelper.initializeTableSearch(document, null);

        document.addEventListener('keyup', this.keyupListener, false);

        this.progressMessage = 'Memuat data';
        this.setActiveSheet('penduduk');

        this.pageSaver.getContent(data => {
            this.loadAllData(data);
            this.checkPendudukHot();
        });
    }

    ngOnDestroy(): void {    
        if (this.pendudukSubscription)
            this.pendudukSubscription.unsubscribe();

        document.removeEventListener('keyup', this.keyupListener, false); 

        if (this.pendudukAfterFilterHook)
            this.hots.penduduk.removeHook('afterFilter', this.pendudukAfterFilterHook);

        if (this.pendudukAfterRemoveRowHook)
            this.hots.penduduk.removeHook('afterRemoveRow', this.pendudukAfterRemoveRowHook); 
        
        this.progress.percentage = 100;

        this.tableHelper.removeListenerAndHooks();
        this.hots.penduduk.destroy();
        this.hots.mutasi.destroy();
        this.hots.logSurat.destroy();
        this.hots.keluarga.destroy();
        this.hots.prodeskel.destroy();
        this.hots = null;
        
        titleBar.removeTitle();
    }

    saveContent(): void {
        $('#modal-save-diff').modal('hide');

        this.pageSaver.bundleData['penduduk'] = this.hots.penduduk.getSourceData();
        this.pageSaver.bundleData['mutasi'] = this.hots.mutasi.getSourceData();
        this.pageSaver.bundleData['log_surat'] = this.hots.logSurat.getSourceData();
        this.pageSaver.bundleData['prodeskel'] = this.hots.prodeskel.getSourceData();

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent(true, data => {
            this.loadAllData(data);
        }, err => {

        });
    }

    loadAllData(bundle) {
        this.hots.penduduk.loadData(bundle['data']['penduduk']);
        this.hots.mutasi.loadData(bundle['data']['mutasi']);
        this.hots.logSurat.loadData(bundle['data']['log_surat']);
        this.hots.prodeskel.loadData(bundle['data']['prodeskel']);

        this.pageSaver.bundleData['penduduk'] = bundle['data']['penduduk'];
        this.pageSaver.bundleData['mutasi'] = bundle['data']['mutasi'];
        this.pageSaver.bundleData['log_surat'] = bundle['data']['log_surat'];
        this.pageSaver.bundleData['prodeskel'] = bundle['data']['prodeskel'];

        let pendudukData = bundle['data']['penduduk'];

        setTimeout(() => {
            if(!this.hots) /* If the page is closed this will be gone */
                return;

            this.setPaging(bundle['data']['penduduk']);
            this.hots.penduduk.render();
            this.hots.mutasi.render();
            this.hots.logSurat.render();
            this.hots.keluarga.render();
            this.hots.prodeskel.render();
        }, 200);
    }


    progressListener(progress: Progress) {
        this.progress = progress;
    }

    setPaging(data): void {
        if (this.paginationComponent.itemPerPage && data.length > this.paginationComponent.itemPerPage) {
            this.paginationComponent.setCurrentPage(1);
            this.paginationComponent.totalItems = data.length;
            this.paginationComponent.calculatePages();
            this.pagingData();
        }
    }

    pagingData(): void {
        let hot = this.hots.penduduk;

        hot.scrollViewportTo(0);

        let plugin = hot.getPlugin('trimRows');
        let dataLength = hot.getSourceData().length;
        let currentPage = this.paginationComponent.getCurrentPage();

        let pageBegin = (currentPage - 1) * this.paginationComponent.itemPerPage;
        let offset = currentPage * this.paginationComponent.itemPerPage;

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

        let me = this;

        setTimeout(() => {
            me.hots.penduduk.render();    
        });
    }

    setActiveSheet(sheet): boolean {
        if (this.activeSheet) 
            this.hots[this.activeSheet].unlisten();

        this.activeSheet = sheet;

        if (this.activeSheet) 
           this.hots[this.activeSheet].listen();

        this.selectedDetail = null;
        this.selectedKeluarga = null;
        return false;
    }

    checkPendudukHot(): void {
        this.isPendudukEmpty = this.hots.penduduk.getSourceData().length > 0 ? false : true;
    }

    getCurrentUnsavedData(): any {
        let pendudukData = this.hots.penduduk.getSourceData();
        let mutasiData = this.hots.mutasi.getSourceData();
        let logSuratData = this.hots.logSurat.getSourceData();
        let prodeskelData = this.hots.prodeskel.getSourceData();

        return { "penduduk": pendudukData, 
                 "mutasi": mutasiData, 
                 "log_surat": logSuratData,
                 "prodeskel": prodeskelData
               };
    }

    showSurat(show): void {
        let hot = this.hots.penduduk;

        if (!hot.getSelected()) {
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }
        let penduduk = hot.getDataAtRow(hot.getSelected()[0]);
        this.selectedPenduduk = schemas.arrayToObj(penduduk, schemas.penduduk);

        this.setActivePageMenu(show ? 'surat' : null);
    }

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
            titleBar.title(null);
            this.hots[this.activeSheet].unlisten();

            if(activePageMenu == 'surat'){
                setTimeout(()=>{
                    $("[name='keywordSurat']").focus();
                }, 0);
            }
        } else {
            titleBar.blue();
            titleBar.title("Data Kependudukan - " + this.dataApiService.auth.desa_name);
            this.hots[this.activeSheet].listen();
        }
    }

    addDetail(): void {
        let hot = this.hots.penduduk;

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
        let hot = this.hots.penduduk;

        if (!hot.getSelected()) {
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        let penduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);

        if (!penduduk.no_kk) {
            this.toastr.error('No KK tidak ditemukan');
            return;
        }

        let keluarga: any[] = hot.getSourceData().filter(e => schemas.arrayToObj(e, schemas.penduduk).no_kk === penduduk.no_kk);

        if (keluarga.length > 0) {
            this.keluargaCollection.push({
                "kk": penduduk.no_kk,
                "data": keluarga
            });
        }

        this.selectedKeluarga = this.keluargaCollection[this.keluargaCollection.length - 1];
        this.hots.keluarga.loadData(this.selectedKeluarga.data);

        var plugin = this.hots.keluarga.getPlugin('hiddenColumns');
        var fields = schemas.penduduk.map(c => c.field);
        var result = PageSaver.spliceArray(fields, SHOW_COLUMNS[0]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);

        this.selectedDetail = null;
        this.activeSheet = null;
        this.appRef.tick()

        this.hots.keluarga.render();
    }

    setKeluarga(kk): boolean {
        if (!kk) {
            this.toastr.error('KK tidak ditemukan');
            return;
        }

        let hot = this.hots.penduduk;
        let keluarga: any = this.keluargaCollection.filter(e => e['kk'] === kk)[0];

        if (!keluarga)
            return false;

        this.selectedKeluarga = keluarga;
        this.hots.keluarga.loadData(this.selectedKeluarga.data);
        this.hots.keluarga.loadData(this.selectedKeluarga.data);

        var plugin = this.hots.keluarga.getPlugin('hiddenColumns');
        var fields = schemas.penduduk.map(c => c.field);
        var result = PageSaver.spliceArray(fields, SHOW_COLUMNS[0]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);

        this.selectedDetail = null;
        this.activeSheet = null;
        this.appRef.tick();

        this.hots.keluarga.render();
        this.hots.keluarga.listen();

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
        let hot = this.hots.penduduk;
        let schema = schemas.penduduk.map(e => e.field);
        let newData = [];

        for(let i=0; i<schema.length; i++) {
            if(i === 0)
                newData.push(base64.encode(uuid.v4()));
            else if(i === 1)
                newData.push(this.selectedPenduduk.nik);
            else if(i === 2)
                newData.push(this.selectedPenduduk.nama_penduduk);
            else
                newData.push(null);
        }

        this.pageSaver.bundleData['penduduk'].push(newData);
        this.hots.penduduk.loadData(this.pageSaver.bundleData['penduduk']);

        let me = this;

        setTimeout(() => {
            me.hots.penduduk.render();    
        });
        
        this.checkPendudukHot();
    }

    reloadSurat(data): void {
        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, 'penduduk');
        let diffs = DiffTracker.trackDiff(localBundle['data']['log_surat'], data);
        localBundle['diffs']['log_surat'] = localBundle['diffs']['log_surat'].concat(diffs);
        this.pageSaver.writeContent(localBundle);
        let mergedResult = DiffMerger.mergeContent(this.bundleSchemas, localBundle, localBundle);
        this.hots.logSurat.loadData(mergedResult["data"]["log_surat"]);
        this.hots.logSurat.render();
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
        
        for (let i = 0; i < objData.length; i++) {
            let item = objData[i];
            item['id'] = base64.encode(uuid.v4());

            item.jenis_kelamin = SidekaProdeskelMapper.mapGender(item.jenis_kelamin);
            item.kewarganegaraan = SidekaProdeskelMapper.mapNationality(item.kewarganegaraan);
            item.agama = SidekaProdeskelMapper.mapReligion(item.agama);
            item.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(item.hubungan_keluarga);
            item.pendidikan = SidekaProdeskelMapper.mapEducation(item.pendidikan);
            item.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(item.status_kawin);
            item.pekerjaan = SidekaProdeskelMapper.mapJob(item.pekerjaan);
        }

        let existing = overwrite ? [] : this.hots.penduduk.getSourceData();
        let imported = objData.map(o => schemas.objToArray(o, schemas.penduduk));
        let data = existing.concat(imported);

        this.hots.penduduk.loadData(data);
        this.setPaging(data);
        this.checkPendudukHot();
        this.hots.penduduk.render();
    }

    doImportAndMerge(): void {
        $("#modal-import-columns").modal("hide");

        let objData = this.importer.getResults();
        let undefinedIdData = objData.filter(e => !e['id']);
        let hotData = this.hots.penduduk.getSourceData().map(e => { return schemas.arrayToObj(e, schemas.penduduk); } );

        for (let i = 0; i < objData.length; i++) {
           let item = objData[i];
           let itemsInHot = hotData.filter(e => e.nik === item.nik);
           
           if(itemsInHot.length > 1)
              continue;

           if(itemsInHot.length === 0) 
              item.id = base64.encode(uuid.v4());
           else if(itemsInHot.length === 1) 
              item.id = itemsInHot[0].id; 

           item.jenis_kelamin = SidekaProdeskelMapper.mapGender(item.jenis_kelamin);
           item.kewarganegaraan = SidekaProdeskelMapper.mapNationality(item.kewarganegaraan);
           item.agama = SidekaProdeskelMapper.mapReligion(item.agama);
           item.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(item.hubungan_keluarga);
           item.pendidikan = SidekaProdeskelMapper.mapEducation(item.pendidikan);
           item.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(item.status_kawin);
           item.pekerjaan = SidekaProdeskelMapper.mapJob(item.pekerjaan);
        }

        let imported = objData.map(o => schemas.objToArray(o, schemas.penduduk));

        this.hots.penduduk.loadData(imported);
        this.setPaging(imported);
        this.checkPendudukHot();
        this.hots.penduduk.render();
    } 

    exportExcel(): void {
        let hot = this.hots.penduduk;
        let data = [];
        if (this.isFiltered)
            data = hot.getData();
        else
            data = hot.getSourceData();

        exportPenduduk(data, "Data Penduduk");
    }

    openMutasiDialog(): void {
        this.changeMutasi(Mutasi.kelahiran);

        if (this.hots.penduduk.getSelected())
            this.changeMutasi(Mutasi.pindahPergi);

        $('#mutasi-modal').modal('show');
    }

    changeMutasi(mutasi): void {
        let hot = this.hots.penduduk;

        this.selectedMutasi = mutasi;
        this.selectedPenduduk = [];

        if (this.selectedMutasi === Mutasi.pindahPergi || this.selectedMutasi === Mutasi.kematian) {
            if (!hot.getSelected())
                return;

            this.selectedPenduduk = schemas.arrayToObj(hot.getDataAtRow(hot.getSelected()[0]), schemas.penduduk);
        }
    }

    mutasi(isMultiple: boolean): void {
        let hot = this.hots.penduduk;
        let mutasiHot = this.hots.mutasi;
        let data = this.hots.mutasi.getSourceData();
        let schema = schemas.penduduk.map(e => e.field);
  
        try {
            let newData = [];
            let newMutasiData = [];

            switch (this.selectedMutasi) {
                case Mutasi.pindahPergi:
                    hot.alter('remove_row', hot.getSelected()[0]);

                    newMutasiData = [base64.encode(uuid.v4()), this.selectedPenduduk.nik, this.selectedPenduduk.nama_penduduk, 'Pindah Pergi', this.selectedPenduduk.desa, new Date().toUTCString()];
                   
                    break;
                case Mutasi.pindahDatang:

                    for(let i=0; i<schema.length; i++) {
                        if(i === 0)
                            newData.push(base64.encode(uuid.v4()));
                        else if(i === 1)
                            newData.push(this.selectedPenduduk.nik);
                        else if(i === 2)
                            newData.push(this.selectedPenduduk.nama_penduduk);
                        else
                            newData.push(null);
                    }

                    this.pageSaver.bundleData['penduduk'].push(newData);
                    
                    newMutasiData = [base64.encode(uuid.v4()), '-', this.selectedPenduduk.nama_penduduk, 'Pindah Datang', this.selectedPenduduk.desa, new Date().toUTCString()];
                   
                    break;
                case Mutasi.kematian:
                    hot.alter('remove_row', hot.getSelected()[0]);

                    newMutasiData = [base64.encode(uuid.v4()), this.selectedPenduduk.nik, this.selectedPenduduk.nama_penduduk, 'Kematian', this.selectedPenduduk.desa, new Date().toUTCString()];
                    break;
                case Mutasi.kelahiran:
                    for(let i=0; i<schema.length; i++) {
                        if(i === 0)
                            newData.push(base64.encode(uuid.v4()));
                        else if(i === 2)
                            newData.push(this.selectedPenduduk.nama_penduduk);
                        else
                            newData.push(null);
                    }

                    this.pageSaver.bundleData['penduduk'].push(newData);
                    newMutasiData = [base64.encode(uuid.v4()), '-', this.selectedPenduduk.nama_penduduk, 'Kelahiran', this.selectedPenduduk.desa, new Date().toUTCString()];
                    break;
            }

            this.pageSaver.bundleData['mutasi'].push(newMutasiData);

            
            if (!isMultiple)
                $('#mutasi-modal').modal('hide');

            this.toastr.success('Mutasi penduduk berhasil');
            this.checkPendudukHot();
        }
        catch (exception) {
            this.toastr.error('Mutasi penduduk gagal');
        }
    }

    filterContent() {
        let hot = this.hots.penduduk;
        var plugin = hot.getPlugin('hiddenColumns');
        var value = parseInt($('input[name=btn-filter]:checked').val());
        var fields = schemas.penduduk.map(c => c.field);
        var result = PageSaver.spliceArray(fields, SHOW_COLUMNS[value]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);

        hot.render();
        this.resultBefore = result;
    }

    saveProdeskelLogin(): void {
        this.settingsService.set('prodeskel.regCode', this.prodeskelRegCode);
        this.settingsService.set('prodeskel.password', this.prodeskelPassword);
        this.settingsService.set('prodeskel.jabatan', this.prodeskelJabatan);
        this.settingsService.set('prodeskel.pekerjaan', this.prodeskelPekerjaan);
        this.settingsService.set('prodeskel.pengisi', this.prodeskelPengisi);

        $('#modal-prodeskel-login')['modal']('hide');
    }

    refreshProdeskel(): void {
        let totalUpdated = 0;
        let pendudukData: any[] = this.hots.penduduk.getSourceData().map(e => { return schemas.arrayToObj(e, schemas.penduduk) }); 
        let prodeskelData: any[] = this.hots.prodeskel.getSourceData().map(e => { return schemas.arrayToObj(e, schemas.prodeskel) });
        let kepalaKeluargaCollection = pendudukData.filter(e => e.hubungan_keluarga === 'Kepala Keluarga');
        let newProdeskelData: any[] = [];

        kepalaKeluargaCollection.forEach(kepalaKeluarga => {
             let currentProdeskelData = prodeskelData.filter(e => e.no_kk === kepalaKeluarga.no_kk)[0];
             let anggotaKeluarga = pendudukData.filter(e => e.no_kk === kepalaKeluarga.no_kk);
             
             if(!currentProdeskelData){
                newProdeskelData.push([base64.encode(uuid.v4()), kepalaKeluarga.no_kk, kepalaKeluarga.nama_penduduk, 
                                    anggotaKeluarga, null,  'Belum Tersinkronisasi', null,  null, null, null]);
                
                return;
             }

             currentProdeskelData.nama_kk = kepalaKeluarga.nama_penduduk;

             if(!_.isEqual(anggotaKeluarga, currentProdeskelData.anggota)) {
                currentProdeskelData.anggota = anggotaKeluarga;
                
                if(currentProdeskelData.status === 'Tersinkronisasi')
                    currentProdeskelData.status = 'Perlu Sinkronisasi Lagi';

                else if(currentProdeskelData.status === 'Perlu Sinkronisasi Lagi')
                    currentProdeskelData.status = 'Belum Tersinkronisasi';

                totalUpdated += 1;
             }

            newProdeskelData.push(schemas.objToArray(currentProdeskelData, schemas.prodeskel));
        });

        this.hots.prodeskel.loadData(newProdeskelData);

        let me = this;

        setTimeout(() => {
            me.hots.prodeskel.render();
            me.toastr.success('Data berhasil diperbaharui');
            me.toastr.info('Terdapat ' + totalUpdated + ' data yang diperbaharui');
        }, 200);
    }

    syncSingleProdeskel(): void {
        if(!this.isAuthenticated()) {
             $('#modal-prodeskel-login')['modal']('show');
             return;
        }

        let prodeskelHot = this.hots.prodeskel;

        if(!prodeskelHot.getSelected()) {
            this.toastr.info('Tidak ada keluarga yang dipilih');
            return;
        }

        let selectedKeluarga = prodeskelHot.getDataAtRow(prodeskelHot.getSelected()[0]);
        
        if(!selectedKeluarga) 
            return;
        
        let anggotaKeluarga = selectedKeluarga[3];
        let kepalaKeluarga = anggotaKeluarga.filter(e => e.hubungan_keluarga === 'Kepala Keluarga')[0];

        if(!kepalaKeluarga) {
            this.toastr.info('Kepala keluarga tidak ditemukan, silahkan perbaharui data');
            return;
        }

        let validationMessages = [];

        if(!kepalaKeluarga.alamat_jalan || kepalaKeluarga.alamat_jalan === 'Tidak Diketahui')
            validationMessages.push(kepalaKeluarga.nama_penduduk + ' Tidak dapat disinkronisasi, alamat tidak valid');

        if(!kepalaKeluarga.rt || kepalaKeluarga.rt === 'Tidak Diketahui')
            validationMessages.push(kepalaKeluarga.nama_penduduk + ' Tidak dapat disinkronisasi, rt tidak valid');

        if(!kepalaKeluarga.rw || kepalaKeluarga.rw === 'Tidak Diketahui')
            validationMessages.push(kepalaKeluarga.nama_penduduk + ' Tidak dapat disinkronisasi, rw tidak valid');

        kepalaKeluarga.jenis_kelamin = SidekaProdeskelMapper.mapGender(kepalaKeluarga.jenis_kelamin);
        kepalaKeluarga.kewarganegaraan = SidekaProdeskelMapper.mapNationality(kepalaKeluarga.kewarganegaraan);
        kepalaKeluarga.agama = SidekaProdeskelMapper.mapReligion(kepalaKeluarga.agama);
        kepalaKeluarga.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(kepalaKeluarga.hubungan_keluarga);
        kepalaKeluarga.pendidikan = SidekaProdeskelMapper.mapEducation(kepalaKeluarga.pendidikan);
        kepalaKeluarga.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(kepalaKeluarga.status_kawin);
        kepalaKeluarga.pekerjaan = SidekaProdeskelMapper.mapJob(kepalaKeluarga.pekerjaan);

        anggotaKeluarga.forEach(anggota => {
            
            if(!anggota.status_kawin || anggota.status_kawin === 'Tidak Diketahui') 
                validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, status kawin tidak valid');

            if(!anggota.kewarganegaraan || anggota.kewarganegaraan === 'Tidak Diketahui')
                validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, kewarganegaraan tidak valid');

            if(!anggota.agama || anggota.agama === 'Tidak Diketahui')
                validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, agama tidak valid');

            if(!anggota.pendidikan || anggota.pendidikan === 'Tidak Diketahui')
                validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, pendidikan tidak valid');

            if(!anggota.pekerjaan || anggota.pekerjaan === 'Tidak Diketahui')
                validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, pekerjaan tidak valid');

            anggota.jenis_kelamin = SidekaProdeskelMapper.mapGender(anggota.jenis_kelamin);
            anggota.kewarganegaraan = SidekaProdeskelMapper.mapNationality(anggota.kewarganegaraan);
            anggota.agama = SidekaProdeskelMapper.mapReligion(anggota.agama);
            anggota.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(anggota.hubungan_keluarga);
            anggota.pendidikan = SidekaProdeskelMapper.mapEducation(anggota.pendidikan);
            anggota.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(anggota.status_kawin);
            anggota.pekerjaan = SidekaProdeskelMapper.mapJob(anggota.pekerjaan);
        });

        if(validationMessages.length > 0) {
            validationMessages.forEach(message => { this.toastr.info(message); });
            return;
        }

        let user = {
            "regCode": this.settingsService.get('prodeskel.regCode'),
            "password": this.settingsService.get('prodeskel.password'),
            "pengisi": this.settingsService.get('prodeskel.pengisi'),
            "pekerjaan": this.settingsService.get('prodeskel.pekerjaan'),
            "jabatan": this.settingsService.get('prodeskel.jabatan')
        };

        let prodeskelSynchronizer = new ProdeskelSynchronizer();
        
        prodeskelSynchronizer.login(user.regCode, user.password);

        prodeskelSynchronizer.sync(kepalaKeluarga, anggotaKeluarga, user).then(() => {
             let index = this.hots.prodeskel.getSelected()[0];
             this.toastr.success('Data berhasil disinkronisasi');
             this.hots.prodeskel.setDataAtCell(index, 5, 'Tersinkronisasi');
             this.hots.prodeskel.setDataAtCell(index, 6, user.pengisi);
             this.hots.prodeskel.setDataAtCell(index, 7, this.settingsService.get('prodeskel.regCode'));
             this.hots.prodeskel.setDataAtCell(index, 8, new Date());
        }).catch(error => {
             this.toastr.error(error);
        });
    }

    async syncMultipleProdeskel(): Promise<void> {
        if(!this.isAuthenticated()) {
             $('#modal-prodeskel-login')['modal']('show');
             return;
        }

        let prodeskelHot = this.hots.prodeskel;
        let prodeskelData = prodeskelHot.getSourceData();
        let user = {
            "regCode": this.settingsService.get('prodeskel.regCode'),
            "password": this.settingsService.get('prodeskel.password'),
            "pengisi": this.settingsService.get('prodeskel.pengisi'),
            "pekerjaan": this.settingsService.get('prodeskel.pekerjaan'),
            "jabatan": this.settingsService.get('prodeskel.jabatan')
        };

        let prodeskelSynchronizer = new ProdeskelSynchronizer();
        
        prodeskelSynchronizer.login(user.regCode, user.password);

        for(let i=0; i<prodeskelData.length; i++) {
            let selectedKeluarga = prodeskelData[i];
            let anggotaKeluarga = selectedKeluarga[3];
            let kepalaKeluarga = anggotaKeluarga.filter(e => e.hubungan_keluarga === 'Kepala Keluarga')[0];

            if(!kepalaKeluarga) {
                this.toastr.info('Kepala keluarga tidak ditemukan, silahkan perbaharui data');
                continue;
            }

            if(selectedKeluarga[4]) 
                continue;
            
            let validationMessages = [];

            if(!kepalaKeluarga.alamat_jalan || kepalaKeluarga.alamat_jalan === 'Tidak Diketahui')
                validationMessages.push(kepalaKeluarga.nama_penduduk + ' Tidak dapat disinkronisasi, alamat tidak valid');

            if(!kepalaKeluarga.rt || kepalaKeluarga.rt === 'Tidak Diketahui')
                validationMessages.push(kepalaKeluarga.nama_penduduk + ' Tidak dapat disinkronisasi, rt tidak valid');

            if(!kepalaKeluarga.rw || kepalaKeluarga.rw === 'Tidak Diketahui')
                validationMessages.push(kepalaKeluarga.nama_penduduk + ' Tidak dapat disinkronisasi, rw tidak valid');

            kepalaKeluarga.jenis_kelamin = SidekaProdeskelMapper.mapGender(kepalaKeluarga.jenis_kelamin);
            kepalaKeluarga.kewarganegaraan = SidekaProdeskelMapper.mapNationality(kepalaKeluarga.kewarganegaraan);
            kepalaKeluarga.agama = SidekaProdeskelMapper.mapReligion(kepalaKeluarga.agama);
            kepalaKeluarga.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(kepalaKeluarga.hubungan_keluarga);
            kepalaKeluarga.pendidikan = SidekaProdeskelMapper.mapEducation(kepalaKeluarga.pendidikan);
            kepalaKeluarga.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(kepalaKeluarga.status_kawin);
            kepalaKeluarga.pekerjaan = SidekaProdeskelMapper.mapJob(kepalaKeluarga.pekerjaan);

            anggotaKeluarga.forEach(anggota => {
                
                if(!anggota.status_kawin || anggota.status_kawin === 'Tidak Diketahui') 
                    validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, status kawin tidak valid');

                if(!anggota.kewarganegaraan || anggota.kewarganegaraan === 'Tidak Diketahui')
                    validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, kewarganegaraan tidak valid');

                if(!anggota.agama || anggota.agama === 'Tidak Diketahui')
                    validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, agama tidak valid');

                if(!anggota.pendidikan || anggota.pendidikan === 'Tidak Diketahui')
                    validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, pendidikan tidak valid');

                if(!anggota.pekerjaan || anggota.pekerjaan === 'Tidak Diketahui')
                    validationMessages.push(anggota.nama_penduduk + ' Tidak dapat disinkronisasi, pekerjaan tidak valid');

                anggota.jenis_kelamin = SidekaProdeskelMapper.mapGender(anggota.jenis_kelamin);
                anggota.kewarganegaraan = SidekaProdeskelMapper.mapNationality(anggota.kewarganegaraan);
                anggota.agama = SidekaProdeskelMapper.mapReligion(anggota.agama);
                anggota.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(anggota.hubungan_keluarga);
                anggota.pendidikan = SidekaProdeskelMapper.mapEducation(anggota.pendidikan);
                anggota.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(anggota.status_kawin);
                anggota.pekerjaan = SidekaProdeskelMapper.mapJob(anggota.pekerjaan);
            });

            if(validationMessages.length > 0) {
                validationMessages.forEach(message => { this.toastr.info(message); });
                continue;
            }

            try {
                await prodeskelSynchronizer.sync(kepalaKeluarga, anggotaKeluarga, user);
                this.toastr.success('Data ' + kepalaKeluarga.no_kk + ' berhasil disinkronisasi');
                this.hots.prodeskel.setDataAtCell(i, 5, 'Tersinkronisasi');
                this.hots.prodeskel.setDataAtCell(i, 6, user.pengisi);
                this.hots.prodeskel.setDataAtCell(i, 7, this.settingsService.get('prodeskel.regCode'));
                this.hots.prodeskel.setDataAtCell(i, 8, new Date());
            }
            catch(error) {
                this.toastr.error(error);
            }
        }
    }

    syncExportProdeskel(): void {
        if(!this.isAuthenticated()) {
             $('#modal-prodeskel-login')['modal']('show');
             return;
        }
        
        let prodeskelSynchronizer = new ProdeskelSynchronizer();

        prodeskelSynchronizer.login(this.settingsService.get('prodeskel.regCode'), this.settingsService.get('prodeskel.password'));

        prodeskelSynchronizer.export();
    }

    isAuthenticated(): boolean {
        if(!this.settingsService.get('prodeskel.regCode') 
            || !this.settingsService.get('prodeskel.password')
            || !this.settingsService.get('prodeskel.pengisi')
            || !this.settingsService.get('prodeskel.pekerjaan')
            || !this.settingsService.get('prodeskel.jabatan')) {
            
            return false;
        }

        return true;
    }

    keyupListener = (e) => {
        // Ctrl+s
        if (e.ctrlKey && e.keyCode === 83) {
            this.pageSaver.onBeforeSave();
            e.preventDefault();
            e.stopPropagation();
        }
        // Ctrl+p
        else if (e.ctrlKey && e.keyCode === 80) {
            this.showSurat(true);
            e.preventDefault();
            e.stopPropagation();
        }
    }
}
