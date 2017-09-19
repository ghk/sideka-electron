import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import * as path from 'path';
const cron = require('node-cron');

import schemas from '../schemas';
import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';
import PageSaver from '../helpers/pageSaver';
import ContentMerger from '../helpers/contentMerger';


@Injectable()
export default class SyncService {

    private _syncPenerimaanJob: any;
    private _syncPenganggaranJob: any;
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

        this._siskeudesService.getTaDesa(null, details => {
            desa$.next(details[0]);
        })

        desa$.subscribe((desa: any) => {
            let task = () => {
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
            }
    
            task();
    
            // Every 5 hours
            this._syncPenerimaanJob = cron.schedule(
                '* 5 * * *',
                () => {
                    task();    
                },
                false
            );
            this._syncPenerimaanJob.start();
        })       
    }

    syncPenganggaran(): void {
        let desa$ = new ReplaySubject(1);
        let bundleSchemas = { kegiatan: schemas.kegiatan, rab: schemas.rab }
        let localBundle = this._dataApiService.getLocalContent('penganggaran', bundleSchemas);

        this._siskeudesService.getTaDesa(null, details => {
            desa$.next(details[0]);
        })

        desa$.subscribe((desa: any) => {
            let task = () => {
                this._dataApiService.saveContent('penganggaran', desa.Tahun, localBundle, bundleSchemas, null)
                .subscribe(
                result => {
                    let keys = Object.keys(bundleSchemas);
                    let mergedResult = this._contentMerger.mergeSiskeudesContent(result, localBundle, keys);
                    mergedResult = this._contentMerger.mergeSiskeudesContent(localBundle, mergedResult, keys);
                    keys.forEach(key => {
                        localBundle.diffs[key] = [];
                        localBundle.data[key] = mergedResult.data[key];
                    });
                    this._dataApiService.writeFile(localBundle, this._sharedService.getPenganggaranFile(), null);
                },
                error => {
                    console.log(error);
                }
                )
            }
    
            task();
    
            // Every 5 hours
            this._syncPenganggaranJob = cron.schedule(
                '* 5 * * *',
                () => {
                    task();    
                },
                false
            );
            this._syncPenganggaranJob.start();
        })      
    }

    unsyncAll(): void {
        if (this._syncPenerimaanJob)
            this._syncPenerimaanJob.destroy();
        if (this._syncPenganggaranJob)
            this._syncPenganggaranJob.destroy();
    }
    
}
