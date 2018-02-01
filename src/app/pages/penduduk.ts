import { remote, shell } from 'electron';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Progress } from 'angular-progress-http';
import { RequestOptions } from '@angular/http';
import { ToastsManager } from 'ng2-toastr';
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { DiffTracker, DiffMerger } from "../helpers/diffs";
import { PersistablePage } from '../pages/persistablePage';
import { DiffItem } from '../stores/bundle';

import * as path from 'path';
import * as uuid from 'uuid';
import * as jetpack from 'fs-jetpack';
import * as _ from 'lodash';

import 'rxjs/add/operator/finally';

import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import TableHelper from '../helpers/table';
import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';
import ProgressBarComponent from '../components/progressBar';
import PageSaver from '../helpers/pageSaver';
import DataHelper from '../helpers/dataHelper';
import SidekaProdeskelMapper from '../helpers/sidekaProdeskelMapper';
import ProdeskelService from '../stores/prodeskelService';

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');

let scriptSession = null;

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
    pendudukAfterCreateRow: any;
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
    process: boolean;
    prodeskelMessage: string;
    isProdeskelProcessed: boolean;
    isProdeskelASyncProcessed: boolean;
    isProdeskelLoggedIn: boolean;

    @ViewChild(PaginationComponent)
    paginationComponent: PaginationComponent;

    @ViewChild(PendudukStatisticComponent)
    pendudukStatisticComponent: PendudukStatisticComponent;

    prodeskelCookieExists: boolean;

    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,
        private settingsService: SettingsService,
        public toastr: ToastsManager,
        public router: Router,
        private vcr: ViewContainerRef,
        private appRef: ApplicationRef,
        private ngZone: NgZone,
        private prodeskelService: ProdeskelService
    ) {
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this);
    }

    ngOnInit(): void {
        titleBar.title("Data Kependudukan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        this.isProdeskelLoggedIn = false;
        this.setProdeskelCookie();

        this.currentProdeskelIndex = 0;
        this.prodeskelMessage = '';
        this.progressMessage = '';
        this.progress = {
            percentage: 0,
            total: 0,
            event: null,
            lengthComputable: true,
            loaded: 0
        };

        this.process = false;
        this.isProdeskelProcessed = false;
        this.isProdeskelASyncProcessed = false;
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

        let me = this;
        
        this.pendudukAfterRemoveRowHook = (index, amount) => {
            me.checkPendudukHot();
        }

        this.pendudukAfterCreateRow = (index, amount, source) => {
            me.hots.penduduk.setDataAtCell(index, 0, base64.encode(uuid.v4()));
            me.checkPendudukHot();
        }
        
        this.hots.penduduk.addHook('afterFilter', this.pendudukAfterFilterHook);    
        this.hots.penduduk.addHook('afterRemoveRow', this.pendudukAfterRemoveRowHook);
        this.hots.penduduk.addHook('afterCreateRow', this.pendudukAfterCreateRow);

        let spanSelected = $("#span-selected")[0];
        let spanCount = $("#span-count")[0];
        let inputSearch = document.getElementById("input-search");

        this.tableHelper = new TableHelper(this.hots.penduduk, inputSearch);
        this.tableHelper.initializeTableSelected(this.hots.penduduk, 2, spanSelected);
        this.tableHelper.initializeTableCount(this.hots.penduduk, spanCount);
        this.tableHelper.initializeTableSearch(document, null);

        document.addEventListener('keyup', this.keyupListener, false);
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);

        this.progressMessage = 'Memuat data';
        this.setActiveSheet('penduduk');

        this.pageSaver.getContent(data => {
            this.loadAllData(data);
            this.checkPendudukHot();
        });
    }

    async setProdeskelCookie() {
       let result = await this.prodeskelService.getInitialCookie();
       let cookie = result.headers['set-cookie'][0];
       let phpsessid = cookie.split(';')[0];
       let sessId = phpsessid.substr(10, phpsessid.length -1);
       let data: Electron.Details = { url: 'http://localhost:3000', name: 'PHPSESSID', value: sessId };
       remote.getCurrentWebContents().session.cookies.set(data, (error) => {});
    }

    async prodeskelLogin() {
        if (!this.isAuthenticated()) {
            $('#modal-prodeskel-login')['modal']('show');
            return;
        }

        this.isProdeskelProcessed = true;
        this.prodeskelMessage = 'Sedang Login Prodeskel...';
        let login = this.settingsService.get('prodeskel.regCode');
        let password = this.settingsService.get('prodeskel.password');
        let result = await this.prodeskelService.login(login, password);
        
        setTimeout(() => {
            this.isProdeskelLoggedIn = true;
            this.isProdeskelProcessed = false;
            this.prodeskelMessage = '';
        }, 4000);    
    }

    async prodeskelSync() {
        if (!this.isAuthenticated()) {
            $('#modal-prodeskel-login')['modal']('show');
            return;
        }
     
        let prodeskelHot = this.hots.prodeskel;

        if(!prodeskelHot.getSelected()) {
            this.toastr.info('Tidak ada keluarga yang dipilih');
            return;
        }

        this.isProdeskelProcessed = true;
        this.prodeskelMessage = 'Sedang Mempersiapkan Data...';

        let index = this.hots.prodeskel.getSelected()[0];
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

        kepalaKeluarga.jenis_kelamin = SidekaProdeskelMapper.mapSyncGender(kepalaKeluarga.jenis_kelamin);
        kepalaKeluarga.kewarganegaraan = SidekaProdeskelMapper.mapSyncNationality(kepalaKeluarga.kewarganegaraan);
        kepalaKeluarga.agama = SidekaProdeskelMapper.mapSyncReligion(kepalaKeluarga.agama);
        kepalaKeluarga.hubungan_keluarga = SidekaProdeskelMapper.mapSyncFamilyRelation(kepalaKeluarga.hubungan_keluarga);
        kepalaKeluarga.pendidikan = SidekaProdeskelMapper.mapSyncEducation(kepalaKeluarga.pendidikan);
        kepalaKeluarga.status_kawin = SidekaProdeskelMapper.mapSyncMaritalStatus(kepalaKeluarga.status_kawin);
        kepalaKeluarga.pekerjaan = SidekaProdeskelMapper.mapSyncJob(kepalaKeluarga.pekerjaan);
        kepalaKeluarga.golongan_darah = SidekaProdeskelMapper.mapBloodType(kepalaKeluarga.golongan_darah);

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

            anggota.jenis_kelamin = SidekaProdeskelMapper.mapSyncGender(anggota.jenis_kelamin);
            anggota.kewarganegaraan = SidekaProdeskelMapper.mapSyncNationality(anggota.kewarganegaraan);
            anggota.agama = SidekaProdeskelMapper.mapSyncReligion(anggota.agama);
            anggota.hubungan_keluarga = SidekaProdeskelMapper.mapSyncFamilyRelation(anggota.hubungan_keluarga);
            anggota.pendidikan = SidekaProdeskelMapper.mapSyncEducation(anggota.pendidikan);
            anggota.status_kawin = SidekaProdeskelMapper.mapSyncMaritalStatus(anggota.status_kawin);
            anggota.pekerjaan = SidekaProdeskelMapper.mapSyncJob(anggota.pekerjaan);
            anggota.golongan_darah = SidekaProdeskelMapper.mapSyncJob(anggota.golongan_darah);
        });

        if(validationMessages.length > 0) {
            validationMessages.forEach(message => { this.toastr.info(message); });
            this.isProdeskelProcessed = false;
            this.prodeskelMessage = null;
            return;
        }

       let kodeDesa = await this.prodeskelService.getKodeDesa();
       let id = await this.getId(kepalaKeluarga.no_kk);
    
       if (!id)
         await this.insertNewKKAK(kodeDesa, kepalaKeluarga, anggotaKeluarga);
       else
         await this.updateKKAK(id, kodeDesa, kepalaKeluarga, anggotaKeluarga);
      
       this.hots.prodeskel.setDataAtCell(index, 5, 'Tersinkronisasi');
       this.hots.prodeskel.setDataAtCell(index, 6, this.settingsService.get('prodeskel.pengisi'));
       this.hots.prodeskel.setDataAtCell(index, 7, this.settingsService.get('prodeskel.regCode'));
       this.hots.prodeskel.setDataAtCell(index, 8, new Date());
    }

    async prodeskelSyncAll() {
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

        let skipHome = false;

        let kepalaCollection = [];
        let anggotaCollection = [];

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

            kepalaKeluarga.jenis_kelamin = SidekaProdeskelMapper.mapSyncGender(kepalaKeluarga.jenis_kelamin);
            kepalaKeluarga.kewarganegaraan = SidekaProdeskelMapper.mapSyncNationality(kepalaKeluarga.kewarganegaraan);
            kepalaKeluarga.agama = SidekaProdeskelMapper.mapSyncReligion(kepalaKeluarga.agama);
            kepalaKeluarga.hubungan_keluarga = SidekaProdeskelMapper.mapSyncFamilyRelation(kepalaKeluarga.hubungan_keluarga);
            kepalaKeluarga.pendidikan = SidekaProdeskelMapper.mapSyncEducation(kepalaKeluarga.pendidikan);
            kepalaKeluarga.status_kawin = SidekaProdeskelMapper.mapSyncMaritalStatus(kepalaKeluarga.status_kawin);
            kepalaKeluarga.pekerjaan = SidekaProdeskelMapper.mapSyncJob(kepalaKeluarga.pekerjaan);
            kepalaKeluarga.golongan_darah = SidekaProdeskelMapper.mapBloodType(kepalaKeluarga.golongan_darah);
            
            kepalaCollection.push(kepalaKeluarga);

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

                anggota.jenis_kelamin = SidekaProdeskelMapper.mapSyncGender(anggota.jenis_kelamin);
                anggota.kewarganegaraan = SidekaProdeskelMapper.mapSyncNationality(anggota.kewarganegaraan);
                anggota.agama = SidekaProdeskelMapper.mapSyncReligion(anggota.agama);
                anggota.hubungan_keluarga = SidekaProdeskelMapper.mapSyncFamilyRelation(anggota.hubungan_keluarga);
                anggota.pendidikan = SidekaProdeskelMapper.mapSyncEducation(anggota.pendidikan);
                anggota.status_kawin = SidekaProdeskelMapper.mapSyncMaritalStatus(anggota.status_kawin);
                anggota.pekerjaan = SidekaProdeskelMapper.mapSyncJob(anggota.pekerjaan);
                anggota.golongan_darah = SidekaProdeskelMapper.mapSyncJob(anggota.golongan_darah);

                anggotaCollection.push(anggota);
            });
  
            if(validationMessages.length > 0) {
                validationMessages.forEach(message => { this.toastr.info(message); });
                kepalaKeluarga['skip'] = true;
                continue;
            }
        }

        for(let i=0; i<kepalaCollection.length; i++) {
            let kepalaKeluarga = kepalaCollection[i];

            if (kepalaKeluarga.skip)
                continue;

            let kodeDesa = await this.prodeskelService.getKodeDesa();
            let id = await this.getId(kepalaKeluarga.no_kk);
            
            let anggotaKeluarga = anggotaCollection.filter(e => e.no_kk === kepalaKeluarga.no_kk);

            if (!id)
                await this.insertNewKKAK(kodeDesa, kepalaKeluarga, anggotaKeluarga);
            else
                await this.updateKKAK(id, kodeDesa, kepalaKeluarga, anggotaKeluarga);

            this.hots.prodeskel.setDataAtCell(i, 5, 'Tersinkronisasi');
            this.hots.prodeskel.setDataAtCell(i, 6, this.settingsService.get('prodeskel.pengisi'));
            this.hots.prodeskel.setDataAtCell(i, 7, this.settingsService.get('prodeskel.regCode'));
            this.hots.prodeskel.setDataAtCell(i, 8, new Date());
        }
    }

    async getId(noKK: string) {
        let response = await this.prodeskelService.getSearchKK(noKK);
        
        try {
            let data = JSON.parse(response.body);
            let count = parseInt(data.setVar[2].value);

            if (count === 1) {
                let htmlTable = data.setValue[2].value.trim();
                let doc = $(htmlTable)[0];
                let firstRow = doc.rows[1];
                let link = 'nmgp_lig_edit_lapis?' + firstRow.getElementsByTagName('a')[1].hash;
                let param = link.replace(/@percent@/g, "%");
                let id = param.split(',')[0].split('id?#?')[1].split('?@?')[0];
                let kodeDesa = param.split(',')[0].split('kode_desa?#?')[1].split('?@?')[0];

                return id;
            }

            else if (count === 16) {
                return this.getId(noKK);
            }

            return null;
        }
        catch(exception) {
            this.toastr.error(exception);
        }
    }

    async getAKParam(noKK: string) {
        let response = await this.prodeskelService.getSearchKK(noKK);
        
        try {
            let data = JSON.parse(response.body);
            let count = parseInt(data.setVar[2].value);
            let htmlTable = data.setValue[2].value.trim();
            let doc = $(htmlTable)[0];
            let rows = doc.rows;

            if (rows.length === 2) {
                let firstRow = doc.rows[1];
                let link = 'nmgp_lig_edit_lapis?' + firstRow.getElementsByTagName('a')[0].hash;
                let param = link.replace(/@percent@/g, "%");
                return param;
            }
            else if(rows.length > 2) {
                return this.getId(noKK);
            }

            return null;
        }
        catch(exception) {
            this.toastr.error('Terjadi Kesalahan Pada Sistem');
        }
    }

    async insertNewKKAK(kodeDesa, kepalaKeluarga, anggotaKeluarga) { 
        this.isProdeskelProcessed = true;
        this.prodeskelMessage = 'Sinkronisasi Kepala Keluarga ' + kepalaKeluarga.nama_penduduk;

        let response = await this.prodeskelService.insertNewKK(kepalaKeluarga);
        let akParam = await this.getAKParam(kepalaKeluarga.no_kk);

        if (!akParam) {
            this.toastr.error('Proses Tidak Dapat Dilanjutkan, Silahkan Tutup dan Buka Kembali Aplikasi Sideka');
            this.isProdeskelProcessed = false;
            this.prodeskelMessage = null;
            return;
        }

        for(let i=0; i<anggotaKeluarga.length; i++) {
            this.prodeskelMessage = 'Sinkronisasi Anggota Keluarga ' + anggotaKeluarga[i].nama_penduduk;
            let response = await this.prodeskelService.insertNewAK(kodeDesa, anggotaKeluarga[i], i + 1);
            this.checkError(response, anggotaKeluarga[i].nama_penduduk);
        }

        this.isProdeskelProcessed = false;
        this.prodeskelMessage = null;
    }

    async updateKKAK(id, kodeDesa, kepalaKeluarga, anggotaKeluarga) {
        this.isProdeskelProcessed = true;
        this.prodeskelMessage = 'Sinkronisasi Kepala Keluarga ' + kepalaKeluarga.nama_penduduk;
        let response = await this.prodeskelService.updateKK(id, kodeDesa, kepalaKeluarga);
        
        this.checkError(response, kepalaKeluarga.nama_penduduk);

        let akParam = await this.getAKParam(kepalaKeluarga.no_kk);

        if (!akParam) {
            this.toastr.error('Proses Tidak Dapat Dilanjutkan');
            return;
        }

        akParam = akParam.split(',')[0];

        response = await this.prodeskelService.getAKList(akParam);
        
        let grid = $(response.body);
        let data = grid[66].getElementsByTagName('tr')[7].getElementsByTagName('table')[0].getElementsByTagName('tr')[1].getElementsByTagName('td')[0];

        if (data.innerText.trim() === 'Tidak ada data untuk ditampilkan') {
            for (let i=0; i<anggotaKeluarga.length; i++) {
                this.prodeskelMessage = 'Sinkronisasi Anggota Keluarga ' + anggotaKeluarga[i].nama_penduduk;
                let response = await this.prodeskelService.insertNewAK(kodeDesa, anggotaKeluarga[i], i + 1);
                this.checkError(response, anggotaKeluarga[i].nama_penduduk);
            }

            this.toastr.success('Keluarga ' + kepalaKeluarga.nama_penduduk + ' Berhasil Disinkronisasi');
        }
        else {
            let rows = Array.prototype.slice.call(grid[66].getElementsByTagName('table')[4].getElementsByTagName('tr'));
            let dataRows = this.rowsToData(rows);

            for (let i=0; i<anggotaKeluarga.length; i++) {
                let anggota = anggotaKeluarga[i];
                let row = dataRows.filter(e => e.nik === anggota.nik)[0];
                
                this.prodeskelMessage = 'Sinkronisasi Anggota Keluarga ' + anggota.nama_penduduk;

                if(!row) 
                    response = await this.prodeskelService.insertNewAK(kodeDesa, anggota, i + 1);
                else {
                    let param = 'id?#?' + row.id + '?@?kodeklg?#?' + anggota.no_kk + '?@?NM_btn_insert?#?S?@?NM_btn_update?#?S?@?NM_btn_delete?#?S?@?NM_btn_navega?#?N?@?';
                    let resp = await this.prodeskelService.openFormDDK02O(param);
                    let doc = $(resp.body);
                    let form = $(doc[83].outerHTML);
                    let scriptCaseInit = $(form[0].getElementsByTagName('input')[8].outerHTML)[0].value;
                    response = await this.prodeskelService.updateAK(kodeDesa, anggota, i + 1, scriptCaseInit); 
                }

                this.checkError(response, anggotaKeluarga[i].nama_penduduk);
            }
           
            this.toastr.success('Keluarga ' + kepalaKeluarga.nama_penduduk + ' Berhasil Disinkronisasi');
            this.isProdeskelProcessed = false;
            this.prodeskelMessage = null;
        }
    }

    rowsToData(rows): any {
        let dataRows = rows.filter(e => e.className === 'scGridFieldOdd' || e.className === 'scGridFieldEven');
        let result = [];

        for (let i=0; i<dataRows.length; i++) {
            let row = dataRows[i];
            let params = row.getElementsByTagName('a')[0].onclick.toString().split('nm_gp_submit3')[1].split(',')[0];
            let nik = row.getElementsByTagName('td')[6].getElementsByTagName('span')[0].innerText;
            let id = params.substr(2, params.length - 3);
            result.push({id: id.trim(), nik: nik });
        }

        return result;
    }

    checkError(response, name) {
       try {
            if($(response.body)[61]['id'] === 'id_error_display_fixed') {
                this.toastr.error('Terjadi Kesalahan Data Pada ' + name)
            }
       }
       catch(exception) {
           let txt = response.body.replace(/^\s*|\s*$/g,"");
           let status = txt.charAt(0);
           let data = txt.substring(2);

           if (status === '-')
              this.toastr.error(data);
       }
    }

    ngOnDestroy(): void {    
        if (this.pendudukSubscription)
            this.pendudukSubscription.unsubscribe();

        document.removeEventListener('keyup', this.keyupListener, false); 
        window.removeEventListener('beforeunload', this.pageSaver.beforeUnloadListener, false);

        if (this.pendudukAfterFilterHook)
            this.hots.penduduk.removeHook('afterFilter', this.pendudukAfterFilterHook);

        if (this.pendudukAfterRemoveRowHook)
            this.hots.penduduk.removeHook('afterRemoveRow', this.pendudukAfterRemoveRowHook); 
        
        if (this.pendudukAfterCreateRow)
            this.hots.penduduk.removeHook('afterCreateRow', this.pendudukAfterCreateRow);

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

        this.hots.penduduk.loadData([newData]);

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
        this.process = true;

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

        this.pageSaver.bundleData['penduduk'] = data;
        this.hots.penduduk.loadData(data);
        this.setPaging(data);
        this.checkPendudukHot();
        this.hots.penduduk.render();
        this.process = false;
    }

    doImportAndMerge(): void {
        $("#modal-import-columns").modal("hide");

        let objData = this.importer.getResults();
        let undefinedIdData = objData.filter(e => !e['id']);
        let hotData = this.hots.penduduk.getSourceData();
        let newData = [];

        for(let i=0; i<objData.length; i++) {
            let data = objData[i];
            let dataInHot = hotData.filter(e => e[1] === data.nik);

            if(dataInHot.length > 1)
                continue;
            
            if(dataInHot.length === 0)
                data.id = base64.encode(uuid.v4());
            else
                data.id = dataInHot[0][0];

           data.jenis_kelamin = SidekaProdeskelMapper.mapGender(data.jenis_kelamin);
           data.kewarganegaraan = SidekaProdeskelMapper.mapNationality(data.kewarganegaraan);
           data.agama = SidekaProdeskelMapper.mapReligion(data.agama);
           data.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(data.hubungan_keluarga);
           data.pendidikan = SidekaProdeskelMapper.mapEducation(data.pendidikan);
           data.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(data.status_kawin);
           data.pekerjaan = SidekaProdeskelMapper.mapJob(data.pekerjaan);
           
           if(dataInHot.length == 0)
              newData.push(schemas.objToArray(data, schemas.penduduk));
           else
              dataInHot = schemas.objToArray(data, schemas.penduduk);
        } 

        let data = hotData.concat(newData);

        this.pageSaver.bundleData['penduduk'] = data;
        this.hots.penduduk.loadData(data);
        this.setPaging(data);
        this.checkPendudukHot();

        let me = this;

        setTimeout(() => {
           me.hots.penduduk.render();
        });
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
                    newMutasiData = [base64.encode(uuid.v4()), this.selectedPenduduk.nik, this.selectedPenduduk.nama_penduduk, 
                        'Pindah Pergi', this.selectedPenduduk.desa, new Date().toUTCString()];
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
                    
                    newMutasiData = [base64.encode(uuid.v4()), this.selectedPenduduk.nik, this.selectedPenduduk.nama_penduduk, 
                        'Pindah Datang', this.selectedPenduduk.desa, new Date().toUTCString()];
                   
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
    
    openProdeskelLoginDialog(): void {
        $('#modal-prodeskel-login')['modal']('show');
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
            if(this.dataApiService.auth.isAllowedToEdit("penduduk")){
                this.pageSaver.onBeforeSave();
                e.preventDefault();
                e.stopPropagation();
            }
        }
        // Ctrl+p
        else if (e.ctrlKey && e.keyCode === 80) {
            this.showSurat(true);
            e.preventDefault();
            e.stopPropagation();
        }
    }
}
