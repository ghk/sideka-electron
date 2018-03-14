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
            this.toastr.setRootViewContainerRef(this.vcr);
        }

    ngOnInit(): void {
        this.bundleSchemas =  { 
            "penduduk": schemas.penduduk,
            "mutasi": schemas.mutasi,
            "log_surat": schemas.logSurat,
            "prodeskel": schemas.prodeskel,
            "nomorSurat": schemas.nomorSurat
        };
        
        this.localBundle = this._dataApiService.getLocalContent(this.bundleSchemas, 'penduduk', null);

        if (!this.localBundle) 
            this.localBundle = this._dataApiService.getEmptyContent(this.bundleSchemas);

        if (!this.localBundle['data']['nomorSurat']) {
            this.localBundle['data']['nomorSurat'] = [];
            this.localBundle['diffs']['nomorSurat'] = [];
            this.localBundle['columns'] = schemas.nomorSurat.map(e => e.field);
        }

        let dirFile = path.join(__dirname, 'surat_templates');
        let dirs = jetpack.list(dirFile);

        dirs.forEach(dir => {
            let dirPath = path.join(dirFile, dir, dir + '.json');
            try {
                let data = JSON.parse(jetpack.read(dirPath));
                let existingFormat = this.localBundle['data']['nomorSurat'].filter(e => e[0] === data.code)[0];
                let format = existingFormat ? existingFormat[1] : '';

                this.suratCollection.push({
                    id: data.code,
                    name: data.title,
                    format: format
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
            "nomorSurat": schemas.nomorSurat
        };

        let localBundle = this._dataApiService.getLocalContent(bundleSchemas, 'penduduk', null);

        if (!localBundle) 
            localBundle = this._dataApiService.getEmptyContent(bundleSchemas);
        
        localBundle['data']['nomorSurat'] = [];
        localBundle['diffs']['nomorSurat'] = [];
        localBundle['columns']['nomorSurat'] = schemas.nomorSurat.map(e => e.field);

        let result: DiffItem = { "modified": [], "added": [], "deleted": [], "total": 0 };

        for (let i=0; i<this.suratCollection.length; i++) {
            let surat = this.suratCollection[i];

            if (localBundle['data']['nomorSurat'] && localBundle['data']['nomorSurat'][i]) {
                result.modified.push([surat.id, surat.format, localBundle['data']['nomorSurat'][i][2]]);
            }
            else {
                result.added.push([surat.id, surat.format, 0]);
            }  
        }

        result.total =  result.deleted.length + result.added.length + result.modified.length;

        this.localBundle['diffs']['nomorSurat'].push(result);
        
        let jsonFile = this._sharedService.getContentFile('penduduk', null);

        this._dataApiService.saveContent('penduduk', null, this.localBundle, this.bundleSchemas, null).subscribe(
            result => {
                this._dataApiService.writeFile(localBundle, jsonFile, null);
            },
            error => {}
        )
        this.toastr.success('Nomor Surat Berhasil Disimpan');
    }

    ngOnDestroy(): void {}
}