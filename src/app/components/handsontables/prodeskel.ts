import { remote } from 'electron';
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewContainerRef } from "@angular/core";
import { BaseHotComponent } from './base';
import { ToastsManager } from 'ng2-toastr';

import schemas from '../../schemas';
import SettingService from '../../stores/settingsService';
import ProdeskelService from '../../stores/prodeskelService';
import TableHelper from '../../helpers/table';
import SidekaProdeskelMapper from '../../helpers/sidekaProdeskelMapper';

import * as base64 from 'uuid-base64';
import * as uuid from 'uuid';
import * as _ from 'lodash';

@Component({
    selector: 'prodeskel-hot',
    template: ''
})
export class ProdeskelHotComponent extends BaseHotComponent implements OnInit, OnDestroy {
    private _sheet;
    private _schema;

    prodeskelRegCode: string = null;
    prodeskelPassword: string = null;
    prodeskelPengisi: string = null;
    prodeskelJabatan: string = null;
    prodeskelPekerjaan: string = null;
    prodeskelViewerHTML = "";

    @Input()
    set sheet(value) {
        this._sheet = value;
    }
    get sheet() {
        return this._sheet;
    }

    @Input()
    set schema(value) {
        this._schema = value;
    }
    get schema() {
        return this._schema;
    }

    prodeskelMessage: string = null;
    isProdeskelProcessed: boolean = false;
    isProdeskelLoggedIn: boolean = false;
    isLoaderShown: boolean = false;

    constructor(public prodeskelService: ProdeskelService, 
                public settingsService: SettingService,
                public toastr: ToastsManager,
                public vcr: ViewContainerRef) {
        super();
        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        let schema = this.schema;
        let element = $('.' + this.sheet + '-sheet')[0];

        if (!element || !schema)
            return;

        let options = {
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
        };

        this.createHot(element, options);
        this.setProdeskelCookie();
    }

    async setProdeskelCookie() {
        let result = await this.prodeskelService.getInitialCookie();
        let cookie = result.headers['set-cookie'][0];
        let phpsessid = cookie.split(';')[0];
        let sessId = phpsessid.substr(10, phpsessid.length -1);
        let data: Electron.Details = { url: 'http://localhost:3000', name: 'PHPSESSID', value: sessId };

        remote.getCurrentWebContents().session.cookies.set(data, (error) => {});
    }

    saveProdeskelLogin(): void {
        this.settingsService.set('prodeskel.regCode', this.prodeskelRegCode);
        this.settingsService.set('prodeskel.password', this.prodeskelPassword);
        this.settingsService.set('prodeskel.jabatan', this.prodeskelJabatan);
        this.settingsService.set('prodeskel.pekerjaan', this.prodeskelPekerjaan);
        this.settingsService.set('prodeskel.pengisi', this.prodeskelPengisi);

        if (this.isAuthenticated()) {
            this.toastr.success('Data Otentikasi Prodeskel Berhasil Disimpan');
            $('#modal-prodeskel-login')['modal']('hide');
            this.prodeskelLogin();
        }
    }


    async prodeskelLogin() {
        if (!this.isAuthenticated()) {
            this.prodeskelRegCode = this.settingsService.get('prodeskel.regCode');
            this.prodeskelPassword = this.settingsService.get('prodeskel.password');
            this.prodeskelJabatan = this.settingsService.get('prodeskel.jabatan');
            this.prodeskelPekerjaan = this.settingsService.get('prodeskel.pekerjaan');
            this.prodeskelPengisi = this.settingsService.get('prodeskel.pengisi');
            $('#modal-prodeskel-login')['modal']('show');
            return;
        }

        this.isProdeskelProcessed = false;
        this.isLoaderShown = true;

        this.prodeskelMessage = 'Sedang Login Prodeskel...';
        let login = this.settingsService.get('prodeskel.regCode');
        let password = this.settingsService.get('prodeskel.password');
        let result = await this.prodeskelService.login(login, password);
        
        setTimeout(() => {
            this.isProdeskelLoggedIn = true;
            this.isProdeskelProcessed = false;
            this.isLoaderShown = false;
            this.prodeskelMessage = '';
        }, 4000);    
    }

    async sync() {
        try {
            if (!this.isAuthenticated()) {
                $('#modal-prodeskel-login')['modal']('show');
                return;
            }
            
            if(!this.instance.getSelected()) {
                this.toastr.info('Tidak ada keluarga yang dipilih');
                return;
            }
    
            this.isProdeskelProcessed = true;
            this.isLoaderShown = true;

            this.prodeskelMessage = 'Sedang Mempersiapkan Data...';
    
            let index = this.instance.getSelected()[0];
            let selectedKeluarga = this.instance.getDataAtRow(this.instance.getSelected()[0]);
    
            if (!selectedKeluarga) 
                return;
    
            let anggotaKeluarga = selectedKeluarga[3];
            let kepalaKeluarga = anggotaKeluarga.filter(e => e.hubungan_keluarga === 'Kepala Keluarga')[0];
    
            if (!kepalaKeluarga) {
                this.toastr.info('Kepala keluarga tidak ditemukan, silahkan perbaharui data');
                this.isLoaderShown = false;
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
          
           this.instance.setDataAtCell(index, 5, 'Tersinkronisasi');
           this.instance.setDataAtCell(index, 6, this.settingsService.get('prodeskel.pengisi'));
           this.instance.setDataAtCell(index, 7, this.settingsService.get('prodeskel.regCode'));
           this.instance.setDataAtCell(index, 8, new Date());

           this.isProdeskelProcessed = false;
           this.isLoaderShown = false;
        }
        catch(exception) {
            this.isProdeskelProcessed = false;
            this.isLoaderShown = false;
        }
    }

    async syncAll() {
        try {
            if (!this.isAuthenticated()) {
                $('#modal-prodeskel-login')['modal']('show');
                return;
            }

            this.isProdeskelProcessed = true;
            this.isLoaderShown = true;

            let data = this.instance.getSourceData();
            let kepalaCollection = [];
            let anggotaCollection = [];

            for (let i=0; i<data.length; i++) {
                let selectedKeluarga = data[i];
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
                
                for(let j=0; j<kepalaCollection.length; j++) {
                    let kepalaKeluarga = kepalaCollection[j];
        
                    if (kepalaKeluarga.skip)
                        continue;
        
                    let kodeDesa = await this.prodeskelService.getKodeDesa();
                    let id = await this.getId(kepalaKeluarga.no_kk);
                    
                    let anggotaKeluarga = anggotaCollection.filter(e => e.no_kk === kepalaKeluarga.no_kk);
        
                    if (!id)
                        await this.insertNewKKAK(kodeDesa, kepalaKeluarga, anggotaKeluarga);
                    else
                        await this.updateKKAK(id, kodeDesa, kepalaKeluarga, anggotaKeluarga);
        
                    this.instance.setDataAtCell(i, 5, 'Tersinkronisasi');
                    this.instance.setDataAtCell(i, 6, this.settingsService.get('prodeskel.pengisi'));
                    this.instance.setDataAtCell(i, 7, this.settingsService.get('prodeskel.regCode'));
                    this.instance.setDataAtCell(i, 8, new Date());
                }
            }
             
            this.isProdeskelProcessed = false;
            this.isLoaderShown = false;
        }
        catch(exception) {
            this.isProdeskelProcessed = false;
            this.isLoaderShown = false;
        }
    }

    async stopSync() {}

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
            this.prodeskelMessage = 'Sinkronisasi Data Anggota ' + anggotaKeluarga[i].nama_penduduk;
            let response = await this.prodeskelService.insertNewAK(kodeDesa, anggotaKeluarga[i], i + 1);
            this.checkError(response, anggotaKeluarga[i].nama_penduduk);
        }

        this.isProdeskelProcessed = false;
        this.prodeskelMessage = null;
    }

    async getAKParam(noKK: string) {
        let response = await this.prodeskelService.getSearchKK(noKK);
        
        try {
            let data = JSON.parse(response.body);
            let count = parseInt(data.setVar[2].value);
            let htmlTable = data.setValue[2].value.trim();
            let doc: any = $(htmlTable)[0];
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
                    let scriptCaseInit = $(form[0].getElementsByTagName('input')[8].outerHTML)[0]['value'];
                    response = await this.prodeskelService.updateAK(kodeDesa, anggota, i + 1, scriptCaseInit); 
                }

                this.checkError(response, anggotaKeluarga[i].nama_penduduk);
            }
           
            this.toastr.success('Keluarga ' + kepalaKeluarga.nama_penduduk + ' Berhasil Disinkronisasi');
            this.isProdeskelProcessed = false;
            this.prodeskelMessage = null;
        }
    }

    async getId(noKK: string) {
        let response = await this.prodeskelService.getSearchKK(noKK);
        
        try {
            let data = JSON.parse(response.body);
            let count = parseInt(data.setVar[2].value);

            if (count === 1) {
                let htmlTable = data.setValue[2].value.trim();
                let doc: any = $(htmlTable)[0];
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
    
    async showAKList(){
        let selectedKeluarga = this.instance.getDataAtRow(this.instance.getSelected()[0]);

        if (!selectedKeluarga) 
            return;

        let anggotaKeluarga = selectedKeluarga[3];
        let kepalaKeluarga = anggotaKeluarga.filter(e => e.hubungan_keluarga === 'Kepala Keluarga')[0];
        let kodeDesa = await this.prodeskelService.getKodeDesa();
        let id = await this.getId(kepalaKeluarga.no_kk);
        let akParam = await this.getAKParam(kepalaKeluarga.no_kk);
        let result = await this.prodeskelService.getAKList(akParam);

        var el = document.createElement("html");
        el.innerHTML = result.body;
        this.prodeskelViewerHTML = $(".scGridTabela", el)[0].outerHTML;

        $('#modal-prodeskel-viewer')['modal']('show');

    }

    refreshProdeskel(data): void {
        let totalUpdated = 0;
        let pendudukData: any[] = data.map(e => { return schemas.arrayToObj(e, schemas.penduduk) }); 
        let prodeskelData: any[] = this.instance.getSourceData().map(e => { return schemas.arrayToObj(e, schemas.prodeskel) });
        let kepalaKeluargaCollection = pendudukData.filter(e => e.no_kk && e.no_kk.length >= 16 && e.hubungan_keluarga === 'Kepala Keluarga');
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

        this.load(newProdeskelData);
        this.toastr.success('Data Berhasil Diperbaharui');
        this.toastr.info('Terdapat ' + totalUpdated + ' data yang diperbaharui');
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

    ngOnDestroy(): void {

    }
}