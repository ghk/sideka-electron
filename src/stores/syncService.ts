import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import * as path from 'path';
const cron = require('node-cron');

import schemas from '../schemas';
import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';
import {PenganggaranContentManager} from '../stores/siskeudesContentManager';
import SharedService from '../stores/sharedService';
import PageSaver from '../helpers/pageSaver';
import ContentMerger from '../helpers/contentMerger';


@Injectable()
export default class SyncService {

    private _syncSiskeudesJob: any;
    private _contentMerger: ContentMerger;

    constructor(
        private _dataApiService: DataApiService,
        private _siskeudesService: SiskeudesService,
        private _sharedService: SharedService
    ) { 
        this._contentMerger = new ContentMerger(this._dataApiService);           
    }

    syncPenerimaan(): void {
        let desa$ = new ReplaySubject(1);
        let bundleSchemas = {
            "penerimaanTunai": schemas.penerimaan,
            "penerimaanBank": schemas.penerimaan,
            "penyetoran": schemas.penyetoran,
            "swadaya": schemas.swadaya
        };
        let localBundle = this._dataApiService.getLocalContent('penerimaan', bundleSchemas);

        this._siskeudesService.getTaDesa(null).then(details => {
            desa$.next(details[0]);
        });

        desa$.subscribe((desa: any) => {
            this._dataApiService.saveContent('penerimaan', desa.Tahun, localBundle, bundleSchemas, null)
            .subscribe(
            result => {
                let keys = Object.keys(bundleSchemas);
                let mergedResult = this._contentMerger.mergeSiskeudesContent(result, localBundle, keys);
                mergedResult = this._contentMerger.mergeSiskeudesContent(localBundle, mergedResult, keys);
                keys.forEach(key => {
                    localBundle.diffs[key] = [];
                    localBundle.data[key] = mergedResult.data[key];
                });
                this._dataApiService.writeFile(localBundle, this._sharedService.getPenerimaanFile(), null);
            },
            error => {
                console.log(error);
            }
            )
        });               
    }

    async syncPenganggaran(): Promise<void> {
        let bundleSchemas = { kegiatan: schemas.kegiatan, rab: schemas.rab }

        let desa = await this._siskeudesService.getTaDesa(null);

        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new PenganggaranContentManager(this._siskeudesService, desa, null, null);
        let contents = await contentManager.getContents();
        let bundle = {data: contents, rewriteData: true};
        
        this._dataApiService.saveContent('penganggaran', desa.Tahun, bundle, bundleSchemas, null);
    }

    syncSiskeudes() {
        this.syncPenerimaan();
        this.syncPenganggaran();
        this._syncSiskeudesJob = cron.schedule(
            '* 5 * * *',
            () => {
                this.syncPenerimaan();
                this.syncPenganggaran();
            },
            false
        );
        this._syncSiskeudesJob.start();
    }

    unsyncAll(): void {       
        if (this._syncSiskeudesJob)
            this._syncSiskeudesJob.destroy();
    }
    
}
