import { remote, shell } from 'electron';
import { Component, ApplicationRef, ViewChild, ViewContainerRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { pendudukImporterConfig, Importer } from '../helpers/importer';
import { exportPenduduk } from '../helpers/exporter';
import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';

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
import ProdeskelHelper from '../helpers/prodeskelHelper';
import ProdeskelProtocol from '../helpers/prodeskelProtocol';
import PendudukStatisticComponent from '../components/pendudukStatistic';
import PaginationComponent from '../components/pagination';
import ProgressBarComponent from '../components/progressBar';
import PageSaver from '../helpers/pageSaver';
import DataHelper from '../helpers/dataHelper';

var base64 = require("uuid-base64");
var $ = require('jquery');
var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');

const SHOW_COLUMNS = [
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "pekerjaan", "kewarganegaraan", "rt", "rw", "nama_dusun", "agama", "alamat_jalan"],
    ["nik", "nama_penduduk", "no_telepon", "email", "rt", "rw", "nama_dusun", "alamat_jalan"],
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu", "hubungan_keluarga", "no_kk"]
];
const GENDER = {'Laki - laki': 'Laki-Laki', 'Perempuan': 'Perempuan'};
const NATIONALITY = {'WNI': 'Warga Negara Indonesia', 'WNA': 'Warga Negara Asing', 'DWIKEWARGANEGARAAN': 'Dwi Kewarganegaraan'};
const RELIGION = {'Aliran Kepercayaan Lainnya': 'Kepercayaan Kepada Tuhan YME'};
const MARITAL_STATUS = {'Cerai Hidup': 'Janda/Duda', 'Cerai Mati': 'Janda/Duda'};
const BLOOD_TYPE = {'A+': 'A', 'B+': 'B', 'B-': 'B', 'AB+': 'AB', 'AB-': 'AB', 'O-': 'O', 'O+': 'O', 'Tidak Diketahui': 'Tidak Tahu'};
const FAMILY_REL = {'Anak': 'Anak Kandung'};
const EDUCATION =  {'Tidak Pernah Sekolah': 'Tidak pernah sekolah', 
                    'Putus Sekolah': 'Tidak pernah sekolah',
                    'Tidak dapat membaca': 'Tidak pernah sekolah',
                    'Tidak Tamat SD/Sederajat': 'Tidak tamat SD/sederajat',
                    'Belum Masuk TK/PAUD': 'Belum masuk TK/Kelompok Bermain',
                    'Sedang TK/PAUD': 'Sedang TK/Kelompok Bermain',
                    'Sedang SD/Sederajat': 'Sedang SD/sederajat',
                    'Sedang SMP/Sederajat': 'Sedang SLTP/sederajat',
                    'Sedang SMA/Sederajat': 'Sedang SLTA/sederajat',
                    'Sedang D-3/Sederajat': 'Sedang D-3/sederajat',
                    'Sedang S-1/Sederajat': 'Sedang S-1/sederajat',
                    'Sedang S-2/Sederajat': 'Sedang S-2/sederajat',
                    'Sedang S-3/Sederajat': 'Sedang S-3/sederajat',
                    'Tamat SD/Sederajat': 'Tamat SD/sederajat',
                    'Tamat SMP/Sederajat': 'Tamat SLTP/sederajat',
                    'Tamat SMA/Sederajat': 'Tamat SLTA/sederajat',
                    'Tamat D-3/Sederajat': 'Tamat D-3/sedarajat',
                    'Tamat S-1/Sederajat': 'Tamat S-1/sederajat',
                    'Tamat S-2/Sederajat': 'Tamat S-2/sederajat',
                    'Tamat S-3/Sederajat': 'Tamat S-3/sederajat'
                  };

const JOB = {'BELUM/TIDAK BEKERJA': 'Belum Bekerja',
             'MENGURUS RUMAH TANGGA': 'Ibu Rumah Tangga',
             'PELAJAR/MAHASISWA': 'Pelajar',
             'PENSIUNAN': 'Purnawirawan/Pensiunan',
             'PEGAWAI NEGERI SIPIL (PNS)': 'Pegawai Negeri Sipil',
             'TENTARA NASIONAL INDONESIA (TNI)': 'TNI',
             'KEPOLISIAN RI': 'POLRI',
             'PERDAGANGAN': 'Buruh jasa perdagangan hasil bumi',
             'PETANI/PEKEBUN': 'Petani',
             'PETERNAK': 'Peternak',
             'NELAYAN/PERIKANAN': 'Nelayan',
             'INDUSTRI': 'Penrajin industri rumah tangga lainnya',
             'KONSTRUKSI': 'Kontraktor',
             'TRANSPORTASI': 'Buruh usaha jasa transportasi dan perhubungan',
             'KARYAWAN SWASTA': 'Karyawan Perusahaan Swasta',
             'KARYAWAN BUMN': 'Karyawan Perusahaan Pemerintah',
             'KARYAWAN HONORER': 'Karyawan Honorer',
             'BURUH HARIAN LEPAS': 'Buruh Harian Lepas',
             'BURUH TANI/PERKEBUNAN': 'Buruh Tani',
             'BURUH NELAYAN/PERIKANAN': 'Nelayan',
             'BURUH PETERNAKAN': 'Peternak',
             'PEMBANTU RUMAH TANGGA': 'Pembantu rumah tangga',
             'TUKANG CUKUR': 'Tukang Cukur',
             'TUKANG BATU': 'Tukang Batu',
             'TUKANG LISTRIK': 'Tukang Listrik',
             'TUKANG KAYU': 'Tukang Kayu',
             'TUKANG SOL SEPATU': 'Wiraswasta',
             'TUKANG LAS/PANDAI BESI': 'Tukang Las',
             'TUKANG JAIT': 'Tukang Jahit',
             'TUKANG GIGI': 'Tukang Gigi',
             'PENATA RIAS': 'Tukang Rias',
             'PENATA BUSANA': 'Wiraswasta',
             'PENATA RAMBUT': 'Tukang Rias',
             'MEKANIK': 'Montir',
             'SENIMAN': 'Seniman/artis',
             'TABIB': 'Dokter swasta',
             'PARAJI': 'Dukun Tradisional',
             'PERANCANG BUSANA': 'Arsitektur/Desainer',
             'PENTERJEMAH': 'Wiraswasta',
             'IMAM MASJID': 'Pemuka Agama',
             'PENDETA': 'Pemuka Agama',
             'PASTOR': 'Pemuka Agama',
             'WARTAWAN': 'Wartawan',
             'USTADZ/MUBALIGH': 'Pemuka Agama',
             'JURU MASAK': 'Juru Masak',
             'PROMOTOR ACARA': 'Wiraswasta',
             'ANGGOTA DPR RI': 'Anggota Legislatif',
             'ANGGOTA DPD': 'Anggota Legislatif',
             'ANGGOTA BPK': 'Anggota Legislatif',
             'PRESIDEN': 'Presiden',
             'WAKIL PRESIDEN': 'Wakil presiden',
             'ANGGOTA MAHKAMAH KONSTITUSI': 'Anggota mahkamah konstitusi',
             'DUTA BESAR': 'Duta besar',
             'GUBERNUR': 'Gubernur',
             'WAKIL GUBERNUR': 'Wakil Gubernur',
             'BUPATI': 'Bupati/walikota',
             'WAKIL BUPATI': 'Wakil bupati',
             'WALIKOTA': 'Bupati/walikota',
             'WAKIL WALIKOTA': 'Wakil bupati',
             'ANGGOTA DPRD PROP': 'Anggota Legislatif',
             'ANGGOTA DPRD KAB. KOTA': 'Anggota Legislatif',
             'DOSEN': 'Dosen swasta',
             'GURU': 'Guru swasta',
             'PILOT': 'Pilot',
             'PENGACARA': 'Pengacara',
             'NOTARIS': 'Notaris',
             'ARSITEK': 'Arsitektur/Desainer',
             'AKUNTAN': 'Akuntan',
             'KONSULTAN': 'Konsultan Managemen dan Teknis',
             'DOKTER': 'Dokter Swasta',
             'BIDAN': 'Bidan swasta',
             'PERAWAT': 'Perawat swasta',
             'APOTEKER': 'Apoteker',
             'PSIKIATER/PSIKOLOG': 'Psikiater/Psikolog',
             'PENYIAR TELEVISI': 'Penyiar radio',
             'PENYIAR RADIO': 'Penyiar radio',
             'PELAUT': 'Nelayan',
             'PENELITI': 'Dosen swasta',
             'SOPIR': 'Sopir',
             'PIALANG': 'Pialang',
             'PARANORMAL': 'Dukun/paranormal/supranatural',
             'PEDAGANG': 'Pedagang Keliling',
             'PERANGKAT DESA': 'Perangkat Desa',
             'KEPALA DESA': 'Kepala Daerah',
             'BIARAWATI': 'Pemuka Agama',
             'WIRASWASTA': 'Wiraswasta',
             'BURUH MIGRAN': 'Buruh Migran'
            };
enum Mutasi { pindahPergi = 1, pindahDatang = 2, kelahiran = 3, kematian = 4 };

@Component({
    selector: 'penduduk',
    templateUrl: '../templates/penduduk.html'
})
export default class PendudukComponent implements OnDestroy, OnInit, PersistablePage {
    type = "penduduk";
    subType = null;
    bundleSchemas = { "penduduk": schemas.penduduk, 
                      "mutasi": schemas.mutasi, 
                      "log_surat": schemas.logSurat, 
                      "prodeskel": schemas.prodeskel 
                    };
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
    diffTracker: DiffTracker;
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
        titleBar.title("Data Kependudukan - " + this.dataApiService.getActiveAuth()['desa_name']);
        titleBar.blue();

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
        this.diffTracker = new DiffTracker();

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
        } else {
            titleBar.blue();
            titleBar.title("Data Kependudukan - " + this.dataApiService.getActiveAuth()['desa_name']);
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

        let keluarga: any[] = hot.getSourceData().filter(e => e['22'] === penduduk.no_kk);

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
        this.appRef.tick();

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
        hot.alter('insert_row', 0);
        hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));

        this.checkPendudukHot();
    }

    reloadSurat(data): void {
        let localBundle = this.dataApiService.getLocalContent('penduduk', this.bundleSchemas);
        let diffs = this.diffTracker.trackDiff(localBundle['data']['log_surat'], data);
        localBundle['diffs']['log_surat'] = localBundle['diffs']['log_surat'].concat(diffs);
        this.pageSaver.writeContent(localBundle);
        let mergedResult = this.pageSaver.mergeContent(localBundle, localBundle);
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

            item.kewarganegaraan = this.getProdeskelDataForm(item.kewarganegaraan, 'NATIONALITY');
            item.agama = this.getProdeskelDataForm(item.agama, 'RELIGION');
            item.status_kawin = this.getProdeskelDataForm(item.status_kawin, 'MARITAL_STATUS');
            item.golongan_darah = this.getProdeskelDataForm(item.golongan_darah, 'BLOOD_TYPE');
            item.pekerjaan = this.getProdeskelDataForm(item.pekerjaan, 'JOB');
            item.hubungan_keluarga = this.getProdeskelDataForm(item.hubungan_keluarga, 'FAMILY_REL');
            item.pendidikan = this.getProdeskelDataForm(item.pendidikan, 'EDUCATION');
        }
        let existing = overwrite ? [] : this.hots.penduduk.getSourceData();
        let imported = objData.map(o => schemas.objToArray(o, schemas.penduduk));
        let data = existing.concat(imported);

        this.hots.penduduk.loadData(data);
        this.setPaging(data);
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

        try {
            switch (this.selectedMutasi) {
                case Mutasi.pindahPergi:
                    hot.alter('remove_row', hot.getSelected()[0]);

                    mutasiHot.alter('insert_row', 0);
                    mutasiHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                    mutasiHot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                    mutasiHot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                    mutasiHot.setDataAtCell(0, 3, 'Pindah Pergi');
                    mutasiHot.setDataAtCell(0, 4,  this.selectedPenduduk.desa);
                    mutasiHot.setDataAtCell(0, 5, new Date());

                    break;
                case Mutasi.pindahDatang:
                    hot.alter('insert_row', 0);
                    hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                    hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                    hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);

                    mutasiHot.alter('insert_row', 0);
                    mutasiHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                    mutasiHot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                    mutasiHot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                    mutasiHot.setDataAtCell(0, 3, 'Pindah Datang');
                    mutasiHot.setDataAtCell(0, 4,  this.selectedPenduduk.desa);
                    mutasiHot.setDataAtCell(0, 5, new Date());
                    
                    break;
                case Mutasi.kematian:
                    hot.alter('remove_row', hot.getSelected()[0]);

                    mutasiHot.alter('insert_row', 0);
                    mutasiHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                    mutasiHot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                    mutasiHot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                    mutasiHot.setDataAtCell(0, 3, 'Kematian');
                    mutasiHot.setDataAtCell(0, 4, '-');
                    mutasiHot.setDataAtCell(0, 5, new Date());

                    break;
                case Mutasi.kelahiran:
                    hot.alter('insert_row', 0);
                    hot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                    hot.setDataAtCell(0, 1, this.selectedPenduduk.nik);
                    hot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                   
                    mutasiHot.alter('insert_row', 0);
                    mutasiHot.setDataAtCell(0, 0, base64.encode(uuid.v4()));
                    mutasiHot.setDataAtCell(0, 1, '');
                    mutasiHot.setDataAtCell(0, 2, this.selectedPenduduk.nama_penduduk);
                    mutasiHot.setDataAtCell(0, 3, 'Kelahiran');
                    mutasiHot.setDataAtCell(0, 4, '-');
                    mutasiHot.setDataAtCell(0, 5, new Date());
                    break;
            }

            this.pageSaver.bundleData['mutasi'] = mutasiHot.getSourceData();
            
            if (!isMultiple)
                $('#mutasi-modal').modal('hide');

            this.toastr.success('Mutasi penduduk berhasil');
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

    initProdeskel(): void {
        let hot = this.hots.keluarga;
        let penduduks = hot.getSourceData().map(p => schemas.arrayToObj(p, schemas.penduduk));

        /*
        let prodeskelWebDriver = new ProdeskelWebDriver();
        prodeskelWebDriver.openSite();
        prodeskelWebDriver.login(this.settingsService.get('prodeskelRegCode'), this.settingsService.get('prodeskelPassword'));
        prodeskelWebDriver.addNewKK(penduduks.filter(p => p.hubungan_keluarga == 'Kepala Keluarga')[0], penduduks);
        */
    }
    
    refreshProdeskelData(): void {
       let pendudukData: any[] = this.hots.penduduk.getSourceData().map(e => { return schemas.arrayToObj(e, schemas.penduduk) });
       let prodeskelData: any[] = this.hots.prodeskel.getSourceData();

       pendudukData.filter(e => e.hubungan_keluarga === 'Kepala Keluarga').forEach(penduduk => {
            let currentData = prodeskelData.filter(e => e[1] === penduduk.no_kk)[0];
            let anggota = pendudukData.filter(e => e.no_kk === penduduk.no_kk);

            if(!currentData) {
                prodeskelData.push(this.addNewProdeskelData(penduduk.no_kk, penduduk.nama_penduduk, anggota));
                return;
            }

            currentData[1] = penduduk.no_kk;
            currentData[2] = penduduk.nama_penduduk;
            currentData[3] = anggota;
            currentData[5] = 'Belum Terupload';
        });

        this.hots.prodeskel.loadData(prodeskelData);
    }

    addNewProdeskelData(noKK, namaPenduduk, anggota): any {
        let id = base64.encode(uuid.v4());
        return [id, noKK, namaPenduduk, anggota, null, 'Belum Terupload', null, null, null, null];
    }

    saveProdeskelLogin(): void {
       this.settingsService.set('prodeskelRegCode', this.prodeskelRegCode);
       this.settingsService.set('prodeskelPassword', this.prodeskelPassword);

       $('#modal-prodeskel-login')['modal']('hide');
    }

    syncProdeskel(): void {
        if(!this.settingsService.get('prodeskelRegCode') || !this.settingsService.get('prodeskelPassword')) {
            $('#modal-prodeskel-login')['modal']('show');
            return;
        }

        let hot = this.hots.prodeskel;

        if(!hot.getSelected()) {
            this.toastr.info('Tidak ada data yang dipilih');
            return;
        }

        let selectedData = hot.getDataAtRow(hot.getSelected()[0]);
        let anggota = selectedData[3];
        let kepala = anggota.filter(e => e.hubungan_keluarga === 'Kepala Keluarga')[0];

        kepala.jenis_kelamin = this.getProdeskelDataForm(kepala.jenis_kelamin, 'GENDER');
        kepala.kewarganegaraan = this.getProdeskelDataForm(kepala.kewarganegaraan, 'NATIONALITY');
        kepala.agama = this.getProdeskelDataForm(kepala.agama, 'RELIGION');
        kepala.golongan_darah = this.getProdeskelDataForm(kepala.golongan_darah, 'BLOOD_TYPE');
        kepala.hubungan_keluarga = this.getProdeskelDataForm(kepala.hubungan_keluarga, 'FAMILY_REL');
        kepala.pendidikan = this.getProdeskelDataForm(kepala.pendidikan, 'EDUCATION');
        kepala.status_kawin = this.getProdeskelDataForm(kepala.status_kawin, 'MARITAL_STATUS');
        kepala.pekerjaan = this.getProdeskelDataForm(kepala.pekerjaan, 'JOB');

        if(kepala.status_kawin === 'Tidak Diketahui') {
            this.toastr.info('Status kawin penduduk ' + kepala.nama_penduduk + ' Tidak dapat disinkronisasi');
            return;
        }

        if(kepala.pekerjaan === 'Tidak Diketahui') {
          this.toastr.info('pekerjaan ' + kepala.nama_penduduk + ' Tidak dapat disinkronisasi');
          return;
        }

        anggota.forEach(item => {
          item.jenis_kelamin = this.getProdeskelDataForm(item.jenis_kelamin, 'GENDER');
          item.kewarganegaraan = this.getProdeskelDataForm(item.kewarganegaraan, 'NATIONALITY');
          item.agama = this.getProdeskelDataForm(item.agama, 'RELIGION');
          item.golongan_darah = this.getProdeskelDataForm(item.golongan_darah, 'BLOOD_TYPE');
          item.hubungan_keluarga = this.getProdeskelDataForm(item.hubungan_keluarga, 'FAMILY_REL');
          item.pendidikan = this.getProdeskelDataForm(item.pendidikan, 'EDUCATION');
          item.status_kawin = this.getProdeskelDataForm(item.status_kawin, 'MARITAL_STATUS');
          item.pekerjaan = this.getProdeskelDataForm(item.pekerjaan, 'JOB');

          if(item.status_kawin === 'Tidak Diketahui') {
            this.toastr.info('Status kawin penduduk ' + item.nama_penduduk + ' Tidak dapat disinkronisasi');
            return;
          }

          if(item.pekerjaan === 'Tidak Diketahui') {
            this.toastr.info('pekerjaan ' + item.nama_penduduk + ' Tidak dapat disinkronisasi');
            return;
          }
        });

        let prodeskelProtocol = new ProdeskelProtocol();

        prodeskelProtocol.login(this.settingsService.get('prodeskelRegCode'), this.settingsService.get('prodeskelPassword'));
        
        prodeskelProtocol.run(kepala, anggota).then(() => {
           this.toastr.success('Data berhasil disinkronisasi');
           selectedData[5] = 'Terupload';
        }).catch(err => {
            console.log(err);
            this.toastr.error('Data gagal disinkronisasi');
        });
    }

    getProdeskelDataForm(data, key): any {
        switch(key) {
           case 'GENDER': 
             if(GENDER[data])
                return GENDER[data];
            break;
            case 'NATIONALITY':
             if(NATIONALITY[data])
                return NATIONALITY[data];
            case 'RELIGION':
              if(RELIGION[data])
                return RELIGION[data];
            case 'MARITAL_STATUS':
              if(MARITAL_STATUS[data])
                return MARITAL_STATUS[data];
            case 'BLOOD_TYPE':
              if(BLOOD_TYPE[data])
                return BLOOD_TYPE[data];
            case 'FAMILY_REL':
              if(FAMILY_REL[data])
                 return FAMILY_REL[data];
            case 'EDUCATION':
              if(EDUCATION[data])
                 return EDUCATION[data];
             case 'JOB':
              if(JOB[data])
                 return JOB[data];
            default:
              return data;
        }
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
