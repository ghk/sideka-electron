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
import { SchemaDict } from '../schemas/schema';
import { PendudukHotComponent } from '../components/handsontables/penduduk';
import { MutasiHotComponent } from '../components/handsontables/mutasi';
import { LogSuratComponent } from '../components/handsontables/logSurat';
import { ProdeskelHotComponent } from '../components/handsontables/prodeskel';
import { NomorSuratHotComponent } from '../components/handsontables/nomorSurat';
import { KeluargaHotComponent } from '../components/handsontables/keluarga';

import schemas from '../schemas';
import titleBar from '../helpers/titleBar';
import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';
import PageSaver from '../helpers/pageSaver';
import PaginationComponent from '../components/pagination';
import SidekaProdeskelMapper from '../helpers/sidekaProdeskelMapper';
import PendudukStatisticComponent from '../components/pendudukStatistic';

import * as $ from 'jquery';
import * as base64 from 'uuid-base64';
import * as uuid from 'uuid';

const FILTER_COLUMNS = [
    schemas.penduduk.filter(e => e.field !== 'id').map(e => e.field),
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "pekerjaan", "kewarganegaraan", "rt", "rw", "nama_dusun", "agama", "alamat_jalan"],
    ["nik", "nama_penduduk", "no_telepon", "email", "rt", "rw", "nama_dusun", "alamat_jalan"],
    ["nik", "nama_penduduk", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu", "hubungan_keluarga", "no_kk"]
];

@Component({
    selector: 'penduduk',
    templateUrl: '../templates/penduduk.html'
})
export default class PendudukComponent implements OnDestroy, OnInit, PersistablePage {
    type: string = 'penduduk';
    subType: string = null;
    modalSaveId: string = 'modal-save-diff';
    progressMessage: string = 'Memuat Data';
    activeSheet: string = null;
    activePageMenu: string = null;
    prodeskelRegCode: string = null;
    prodeskelPassword: string = null;
    prodeskelPengisi: string = null;
    prodeskelJabatan: string = null;
    prodeskelPekerjaan: string = null;
    keluargaSchema = schemas.keluarga;

    progress: Progress = {percentage: 0, event: null, lengthComputable: true, total: 0, loaded: 0};
    bundleSchemas: SchemaDict = {};
    pageSaver: PageSaver = new PageSaver(this);
    importer: Importer;
   
    itemPerPage: number = 0;
    totalItems: number = 0;

    resultBefore: any[] = [];
    details: any[] = [];
    keluargas: any[] = [];
    selectedKeluarga: any = null;
    selectedDetail: any = null;
    
    @ViewChild(PendudukHotComponent)
    pendudukHot: PendudukHotComponent;

    @ViewChild(MutasiHotComponent)
    mutasiHot: MutasiHotComponent;

    @ViewChild(LogSuratComponent)
    logSuratHot: LogSuratComponent;

    @ViewChild(ProdeskelHotComponent)
    prodeskelHot: ProdeskelHotComponent;

    @ViewChild(NomorSuratHotComponent)
    nomorSuratHot: NomorSuratHotComponent;

    @ViewChild(KeluargaHotComponent)
    keluargaHot: KeluargaHotComponent;

    @ViewChild(PaginationComponent)
    pagination: PaginationComponent;

    @ViewChild(PendudukStatisticComponent)
    pendudukStatisticComponent: PendudukStatisticComponent;

    constructor(public toastr: ToastsManager,
                public router: Router,
                public sharedService: SharedService, 
                public settingsService: SettingsService,
                public dataApiService: DataApiService, 
                public vcr: ViewContainerRef,
                public appRef: ApplicationRef) {

        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        titleBar.title("Data Kependudukan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        this.activeSheet = 'penduduk';
        this.pageSaver.bundleData = {penduduk: [], mutasi: [], log_surat: [], nomor_surat: []};
        this.bundleSchemas = {
            penduduk: schemas.penduduk, 
            mutasi: schemas.mutasi, 
            log_surat: schemas.logSurat, 
            prodeskel: schemas.prodeskel,
            nomor_surat: schemas.nomorSurat
        };

        setTimeout(() => {
            this.keluargaHot.initialize();
        }, 200);
    
        this.importer = new Importer(pendudukImporterConfig);

        if (this.settingsService.get('maxPaging'))
            this.itemPerPage = parseInt(this.settingsService.get('maxPaging'));
        
        this.setListeners();
        this.getContent();
    }

    getContent(): void {
        this.pageSaver.getContent(data => {
            this.load(data);
            this.setActiveSheet('penduduk');
        }); 
    }

    saveContent(): void {
        $('#modal-save-diff')["modal"]('hide');

        this.pageSaver.bundleData['penduduk'] = this.pendudukHot.instance.getSourceData();
        this.pageSaver.bundleData['mutasi'] = this.mutasiHot.instance.getSourceData();
        this.pageSaver.bundleData['log_surat'] = this.logSuratHot.instance.getSourceData();
        this.pageSaver.bundleData['prodeskel'] = this.prodeskelHot.instance.getSourceData();
        this.pageSaver.bundleData['nomor_surat'] = this.nomorSuratHot.instance.getSourceData();

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent(true, data => {
           this.load(data);
        });
    }

    load(data): void {
        this.pageSaver.bundleData['penduduk'] = data['data']['penduduk'];
        this.pageSaver.bundleData['mutasi'] = data['data']['mutasi'];
        this.pageSaver.bundleData['log_surat'] = data['data']['log_surat'];
        this.pageSaver.bundleData['prodeskel'] = data['data']['prodeskel'];
        
        this.pendudukHot.load(this.pageSaver.bundleData['penduduk']);
        this.mutasiHot.load(this.pageSaver.bundleData['mutasi']);
        this.logSuratHot.load(this.pageSaver.bundleData['log_surat']);
        this.prodeskelHot.load(this.pageSaver.bundleData['prodeskel']);
        
        if (!data['data']['nomor_surat']) {
            this.pageSaver.bundleData['nomor_surat'] = [];
            this.toastr.info('Anda Belum Mengisi Format Nomor Surat, Silahkan Lakukan Pengisian Format Nomor Surat di Menu Konfigurasi');
        }
        else if (data['data']['nomor_surat']) {
            this.pageSaver.bundleData['nomor_surat'] = data['data']['nomor_surat'];  
        }

        this.nomorSuratHot.load(this.pageSaver.bundleData['nomor_surat']);

        this.pendudukHot.checkPenduduk();
        this.setPaging();
    }

    getCurrentUnsavedData(): any {
        return { 
            "penduduk": this.pendudukHot.instance.getSourceData(), 
            "mutasi": this.mutasiHot.instance.getSourceData(), 
            "log_surat": this.logSuratHot.instance.getSourceData(),
            "prodeskel": this.prodeskelHot.instance.getSourceData(),
            "nomor_surat": this.nomorSuratHot.instance.getSourceData()
        };
    }

    setActiveSheet(sheet: string): boolean {
        if (this.activeSheet === 'penduduk')
            this.pendudukHot.instance.unlisten();
        else if (this.activeSheet === 'mutasi')
            this.mutasiHot.instance.unlisten();
        else if (this.activeSheet === 'prodeskel')
            this.prodeskelHot.instance.unlisten();

        this.activeSheet = sheet;

        if (this.activeSheet === 'penduduk')
            this.pendudukHot.instance.listen();
        else if (this.activeSheet === 'mutasi')
            this.mutasiHot.instance.listen();
        else if (this.activeSheet === 'prodeskel')
            this.prodeskelHot.instance.listen();

        this.selectedDetail = null;
        this.selectedKeluarga = null;
        
        return false;
    }

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
            titleBar.title(null);
            this.pendudukHot.instance.unlisten();

            if(activePageMenu == 'surat')
              setTimeout(()=>{ $("[name='keywordSurat']").focus();}, 0);
        } 
        else {
            titleBar.blue();
            titleBar.title("Data Kependudukan - " + this.dataApiService.auth.desa_name);
            this.pendudukHot.instance.listen();
        }
    }

    setPaging(): void {
        let data = this.pageSaver.bundleData['penduduk'];

        if (this.pagination.itemPerPage && data.length > this.pagination.itemPerPage) {
            this.pagination.setCurrentPage(1);
            this.pagination.totalItems = data.length;
            this.pagination.calculatePages();
            this.pendudukHot.pagingData();
        }
    }

    setListeners(): void {
        document.addEventListener('keyup',this.keyupListener, false);
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);
    }

    removeListener(): void {
        document.removeEventListener('keyup', this.keyupListener, false); 
        window.removeEventListener('beforeunload', this.pageSaver.beforeUnloadListener, false);
    }

    refreshProdeskel(): void {
        this.prodeskelHot.refreshProdeskel(this.pendudukHot.instance.getSourceData());
    }
  
    importExcel(): void {
        let files = remote.dialog.showOpenDialog(null);
        if (files && files.length) {
            this.importer.init(files[0]);
            $("#modal-import-columns")["modal"]("show");
        }
    }

    exportExcel(): void {
        let hot = this.pendudukHot.instance;
        let data = [];

        if (this.pendudukHot.isFiltered)
            data = hot.getData();
        else
            data = hot.getSourceData();

        exportPenduduk(data, "Data Penduduk");
    }

    doImport(overwrite): void {
        $("#modal-import-columns")["modal"]("hide");
       
        let objData = this.importer.getResults();
        let undefinedIdData = objData.filter(e => !e['id']);
        
        for (let i = 0; i < objData.length; i++) {
            let item : any= objData[i];

            item['id'] = base64.encode(uuid.v4());
            item.jenis_kelamin = SidekaProdeskelMapper.mapGender(item.jenis_kelamin);
            item.kewarganegaraan = SidekaProdeskelMapper.mapNationality(item.kewarganegaraan);
            item.agama = SidekaProdeskelMapper.mapReligion(item.agama);
            item.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(item.hubungan_keluarga);
            item.pendidikan = SidekaProdeskelMapper.mapEducation(item.pendidikan);
            item.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(item.status_kawin);
            item.pekerjaan = SidekaProdeskelMapper.mapJob(item.pekerjaan);
        }

        let existing = overwrite ? [] : this.pendudukHot.instance.getSourceData();
        let imported = objData.map(o => schemas.objToArray(o, schemas.penduduk));
        let data = existing.concat(imported);

        this.pageSaver.bundleData['penduduk'] = data;
        this.pendudukHot.instance.loadData(data);
        this.pendudukHot.checkPenduduk();
        this.pendudukHot.render();
        this.setPaging();
    }

    doImportAndMerge(): void {
        $("#modal-import-columns")["modal"]("hide");

        let objData = this.importer.getResults();
        let undefinedIdData = objData.filter(e => !e['id']);
        let hotData = this.pendudukHot.instance.getSourceData();
        let newData = [];

        for(let i=0; i<objData.length; i++) {
            let item: any = objData[i];
            let dataInHot = hotData.filter(e => e[1] === data.nik);

            if(dataInHot.length > 1)
                continue;
            
            if(dataInHot.length === 0)
                item.id = base64.encode(uuid.v4());
            else
                item.id = dataInHot[0][0];

           item.jenis_kelamin = SidekaProdeskelMapper.mapGender(item.jenis_kelamin);
           item.kewarganegaraan = SidekaProdeskelMapper.mapNationality(item.kewarganegaraan);
           item.agama = SidekaProdeskelMapper.mapReligion(item.agama);
           item.hubungan_keluarga = SidekaProdeskelMapper.mapFamilyRelation(item.hubungan_keluarga);
           item.pendidikan = SidekaProdeskelMapper.mapEducation(item.pendidikan);
           item.status_kawin = SidekaProdeskelMapper.mapMaritalStatus(item.status_kawin);
           item.pekerjaan = SidekaProdeskelMapper.mapJob(item.pekerjaan);
           
           if(dataInHot.length == 0)
              newData.push(schemas.objToArray(item, schemas.penduduk));
           else
              dataInHot = schemas.objToArray(item, schemas.penduduk);
        } 

        let data = hotData.concat(newData);

        this.pageSaver.bundleData['penduduk'] = data;
        this.pendudukHot.instance.loadData(data);
        this.pendudukHot.checkPenduduk();
        this.pendudukHot.render();
        this.setPaging();
    } 

    showSurat(show: boolean): void {
        if (!this.pendudukHot.instance.getSelected()) {
            this.toastr.warning('Silahkan Pilih Penduduk');
            return;
        }
        
        this.setActivePageMenu(show ? 'surat' : null);
    }

    createDetail(): void {
        if (!this.pendudukHot.instance.getSelected()) {
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return
        }

        let selectedIndex = this.pendudukHot.instance.getSelected()[0];
        let data = schemas.arrayToObj(this.pendudukHot.instance.getDataAtRow(selectedIndex), schemas.penduduk);
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
    }

    createKeluarga(): void {
        if (!this.pendudukHot.instance.getSelected()) {
            this.toastr.warning('Tidak ada penduduk yang dipilih');
            return;
        }

        let penduduk = schemas.arrayToObj(this.pendudukHot.instance
                .getDataAtRow(this.pendudukHot.instance.getSelected()[0]), schemas.penduduk);

        if (!penduduk.no_kk) {
            this.toastr.error('No KK tidak ditemukan');
            return;
        }

        let keluarga: any[] = this.pendudukHot.instance.getSourceData()
            .filter(e => schemas.arrayToObj(e, schemas.penduduk).no_kk === penduduk.no_kk);

        if (keluarga.length > 0) {
            this.keluargas.push({
                "kk": penduduk.no_kk,
                "data": keluarga
            });
        }

        this.selectedKeluarga = this.keluargas[this.keluargas.length - 1];
        this.keluargaHot.load(this.selectedKeluarga.data);
        this.selectedDetail = null;
        this.activeSheet = null;
        this.keluargaHot.instance.listen();
    }

    switchDetail(detail): boolean {
        this.selectedDetail = detail;
        this.activeSheet = null;
        return false;
    }

    switchKeluarga(keluarga): boolean {
        if (!keluarga || !keluarga.kk) {
            this.toastr.error('KK tidak ditemukan');
            return;
        }

        this.keluargaHot.instance.unlisten();

        this.selectedKeluarga = keluarga;
        this.keluargaHot.load(this.selectedKeluarga.data);

        this.selectedDetail = null;
        this.activeSheet = null;

        this.keluargaHot.instance.listen();

        return false;
    }

    removeDetail(detail): boolean {
        let index = this.details.indexOf(detail);

        if (index > -1)
            this.details.splice(index, 1);

        if (this.details.length === 0)
            this.setActiveSheet('penduduk');
        else
            this.switchDetail(this.details[this.details.length - 1]);

        return false;
    }

    removeKeluarga(keluarga): boolean {
        let index = this.keluargas.indexOf(keluarga);

        if (index > -1) 
            this.keluargas.splice(index, 1);

        if (this.keluargas.length === 0) {
            this.setActiveSheet('penduduk');
            this.keluargaHot.instance.unlisten();
        }
        else {
            this.switchKeluarga(this.keluargas[this.keluargas.length - 1]);
        }

        return false;
    }

    filterContent() {
        let plugin = this.pendudukHot.instance.getPlugin('hiddenColumns');
        let value = parseInt($('input[name=btn-filter]:checked').val().toString());
        let fields = schemas.penduduk.map(c => c.field);
        let result = PageSaver.spliceArray(fields, FILTER_COLUMNS[value]);

        plugin.showColumns(this.resultBefore);
        plugin.hideColumns(result);

        this.pendudukHot.instance.render();
        this.resultBefore = result;
    }

    addMutasiLog(data): void {
        this.toastr.success('Mutasi Penduduk Berhasil');

        if (data.mutasi === 1 || data.mutasi === 4) 
            this.pendudukHot.instance.alter('remove_row', data.index);

        else if (data.mutasi === 2 || data.mutasi === 3) 
            this.pageSaver.bundleData['penduduk'].push(data.data);
        
        this.pendudukHot.load(this.pageSaver.bundleData['penduduk']);
        this.pendudukHot.render();
        this.pendudukHot.checkPenduduk();
    }

    addSuratLog(data): void {
        let log = data.log;
        let nomorSurat = data.nomorSurat;

        nomorSurat[2] += 1;

        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, 'penduduk', null);
        let logSuratDiff: DiffItem = {"modified": [], "added": [], "deleted": [], "total": 0};
        let nomorSuratDiff: DiffItem = {"modified": [], "added": [], "deleted": [], "total": 0};
        
        logSuratDiff.added.push(log);
        logSuratDiff.total = logSuratDiff.deleted.length + logSuratDiff.added.length + logSuratDiff.modified.length;

        nomorSuratDiff.modified.push(nomorSurat);
        nomorSuratDiff.total = nomorSuratDiff.deleted.length + nomorSuratDiff.added.length + nomorSuratDiff.modified.length;
        
        localBundle['diffs']['log_surat'].push(logSuratDiff);
        localBundle['diffs']['nomor_surat'].push(nomorSuratDiff);

        let jsonFile = this.sharedService.getContentFile('penduduk', null);
        let nomorSuratInstance = this.nomorSuratHot.instance;

        this.dataApiService.saveContent('penduduk', null, localBundle, this.bundleSchemas, null)
        .finally(() => {
            this.dataApiService.writeFile(localBundle, jsonFile, null);
        })
        .subscribe(
            result => {  
                let localNomorSurat = localBundle['data']['nomor_surat'].filter(e => e[0] === nomorSurat[0])[0];
                let index = localBundle['data']['nomor_surat'].indexOf(localNomorSurat);

                localBundle['data']['log_surat'] = logSuratDiff.added;
                localBundle['data']['nomor_surat'][index] = nomorSurat;

                localBundle['diffs']['log_surat'] = [];
                localBundle['diffs']['nomor_surat'] = [];

                this.pageSaver.bundleData['nomor_surat'] = localBundle['data']['nomor_surat'];
                nomorSuratInstance.load(this.pageSaver.bundleData['nomor_surat']);
               
                this.toastr.success('Log Surat Berhasil Disimpan');
                this.toastr.success('Counter Surat Berhasil Ditambah');
            },
            error => {
                this.toastr.error('Terjadi kesalahan pada server ketika menyimpan');
            }
        );
    }

    saveProdeskelLogin(): void {
        this.settingsService.set('prodeskel.regCode', this.prodeskelRegCode);
        this.settingsService.set('prodeskel.password', this.prodeskelPassword);
        this.settingsService.set('prodeskel.jabatan', this.prodeskelJabatan);
        this.settingsService.set('prodeskel.pekerjaan', this.prodeskelPekerjaan);
        this.settingsService.set('prodeskel.pengisi', this.prodeskelPengisi);

        $('#modal-prodeskel-login')['modal']('hide');

        this.toastr.success('Data Otentikasi Prodeskel Berhasil Disimpan');
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    ngOnDestroy(): void {
        titleBar.removeTitle();
        
        this.removeListener();
        this.pendudukHot.ngOnDestroy();
        this.mutasiHot.ngOnDestroy();
        this.logSuratHot.ngOnDestroy();
        this.prodeskelHot.ngOnDestroy();
        this.nomorSuratHot.ngOnDestroy();
    }

    keyupListener = (e) => {
        if (e.ctrlKey && e.keyCode === 83) {
            if(this.dataApiService.auth.isAllowedToEdit("penduduk")){
                this.pageSaver.onBeforeSave();
                e.preventDefault();
                e.stopPropagation();
            }
        }
        else if (e.ctrlKey && e.keyCode === 80) {
            this.showSurat(true);
            e.preventDefault();
            e.stopPropagation();
        }
    }
}