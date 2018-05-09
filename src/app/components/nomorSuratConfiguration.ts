import { Component, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';

import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import schemas from '../schemas';

import * as jetpack from 'fs-jetpack';
import * as path from 'path';
import { DiffItem } from '../stores/bundle';

@Component({
    selector: 'nomorSurat-configuration',
    templateUrl: '../templates/nomorSuratConfiguration.html',
})
export default class NomorSuratConfiguration implements OnInit, OnDestroy {
    bundleSchemas: any;
    localBundle: any;

    suratCollection: any[] = [];
    selectedSurat: any = null;

    constructor(private _dataApiService: DataApiService, 
        private _sharedService: SharedService, 
        private toastr: ToastsManager,
        private vcr: ViewContainerRef) {
            this.toastr.setRootViewContainerRef(vcr);
        }

    ngOnInit(): void {
        this.bundleSchemas =  { 
            "penduduk": schemas.penduduk,
            "mutasi": schemas.mutasi,
            "log_surat": schemas.logSurat,
            "prodeskel": schemas.prodeskel,
            "nomor_surat": schemas.nomorSurat
        };
        
        this.localBundle = this._dataApiService.getLocalContent(this.bundleSchemas, 'penduduk', null);

        if (!this.localBundle) 
            this.localBundle = this._dataApiService.getEmptyContent(this.bundleSchemas);

        if (!this.localBundle['data']['nomor_surat']) {
            this.localBundle['data']['nomor_surat'] = [];
            this.localBundle['diffs']['nomor_surat'] = [];
            this.localBundle['columns'] = schemas.nomorSurat.map(e => e.field);
        }

        let dirFile = path.join(__dirname, 'surat_templates');
        let dirs = jetpack.list(dirFile);

        dirs.forEach(dir => {
            let dirPath = path.join(dirFile, dir, dir + '.json');
            try {
                let data = JSON.parse(jetpack.read(dirPath));
                let existingFormat = this.localBundle['data']['nomor_surat'].filter(e => e[0] === data.code)[0];
                let format = existingFormat ? existingFormat[1] : '';
                let counterType = existingFormat ? existingFormat[3] : null;
                let lastCounter = existingFormat ? existingFormat[4] : new Date();

                this.suratCollection.push({
                    id: data.code,
                    name: data.title,
                    format: format,
                    counterType: counterType,
                    lastCounter: lastCounter
                });
            }
            catch (ex) {
                console.log('Surat error: ', ex, dirPath);
            }
        });
    }

    selectSurat(surat): void {
        this.selectedSurat = surat;
    }

    addFormat(format): void {
        this.selectedSurat.format +=  '/' + format;
    }

    save(): void {
        let bundleSchemas = { 
            "penduduk": schemas.penduduk,
            "mutasi": schemas.mutasi,
            "log_surat": schemas.logSurat,
            "prodeskel": schemas.prodeskel,
            "nomor_surat": schemas.nomorSurat
        };

        let localBundle = this._dataApiService.getLocalContent(bundleSchemas, 'penduduk', null);

        if (!localBundle) {
            localBundle = this._dataApiService.getEmptyContent(bundleSchemas);

            //Nomor surat to be added manually
            localBundle['data']['nomor_surat'] = [];
            localBundle['diffs']['nomor_surat'] = [];
            localBundle['columns']['nomor_surat'] = schemas.nomorSurat.map(e => e.field);
        }

        let diff: DiffItem = { "modified": [], "added": [], "deleted": [], "total": 0 };

        for (let i=0; i<this.suratCollection.length; i++) {
            let surat = this.suratCollection[i];

            if (localBundle['data']['nomor_surat'] && localBundle['data']['nomor_surat'][i]) 
                diff.modified.push([surat.id, surat.format, localBundle['data']['nomor_surat'][i][2], 
                    localBundle['data']['nomor_surat'][i][3], new Date(localBundle['data']['nomor_surat'][i][4])]);
            else 
                diff.added.push([surat.id, surat.format, 0, surat.counterType, new Date(surat.lastCounter)]);
        }

        diff.total = diff.deleted.length + diff.added.length + diff.modified.length;

        this.localBundle['diffs']['nomor_surat'].push(diff);
        
        this.saveContent(localBundle, diff);   
    }

    saveContent(localBundle, diff) {
        let jsonFile = this._sharedService.getContentFile('penduduk', null);

        this._dataApiService.saveContent('penduduk', null, this.localBundle, this.bundleSchemas, null)
            .finally(() => {
                this._dataApiService.writeFile(localBundle, jsonFile, null);
            })
            .subscribe(
                result => {
                    localBundle.changeId = result.changeId;
                    localBundle['data']['nomor_surat'] = diff.added.length > 0 ? diff.added : diff.modified;
                    localBundle['diffs']['nomor_surat'] = [];
                    this.toastr.success('Nomor Surat Berhasil Disimpan');
                },
                error => {
                    this.toastr.error('Terjadi kesalahan pada server ketika menyimpan');
                }
            );
    }

    reset(): void {
        let selectedSurat = this.localBundle['data']['nomor_surat'].filter(e => e[0] === this.selectedSurat.id)[0];

        if (selectedSurat) {
            selectedSurat[2] = 0;
            let diff: DiffItem = { "modified": [], "added": [], "deleted": [], "total": 0 };

            diff.modified.push(selectedSurat);
            diff.total = diff.deleted.length + diff.added.length + diff.modified.length;

            this.localBundle['diffs']['nomor_surat'].push(diff);

            this.saveContent(this.localBundle, diff);
        }
    }

    ngOnDestroy(): void {}
}