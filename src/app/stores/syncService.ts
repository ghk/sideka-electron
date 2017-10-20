import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import * as path from 'path';
const cron = require('node-cron');

import schemas from '../schemas';
import DataApiService from '../stores/dataApiService';
import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import SiskeudesReferenceHolder from '../stores/siskeudesReferenceHolder';
import {ContentManager, PerencanaanContentManager, PenganggaranContentManager, SppContentManager, PenerimaanContentManager} from '../stores/siskeudesContentManager';
import SharedService from '../stores/sharedService';
import PageSaver from '../helpers/pageSaver';
import { fromSiskeudes } from '../stores/siskeudesFieldTransformer';


@Injectable()
export default class SyncService {

    private _syncSiskeudesJob: any;
    syncMessage: string;

    constructor(
        private _dataApiService: DataApiService,
        private _siskeudesService: SiskeudesService,
        private _settingsService: SettingsService,
        private _sharedService: SharedService
    ) { 
    }

    async syncPerencanaan(): Promise<void> {
        let desa = await this.getDesa();
        let bundleSchemas = { renstra: schemas.renstra, rpjm: schemas.rpjm, 
            rkp1: schemas.rkp, 
            rkp2: schemas.rkp, 
            rkp3: schemas.rkp, 
            rkp4: schemas.rkp, 
            rkp5: schemas.rkp, 
            rkp6: schemas.rkp, 
        };
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new PerencanaanContentManager(this._siskeudesService, desa, null);
        await this.sync('perencanaan', desa, contentManager, bundleSchemas);
    }

    async syncPenerimaan(): Promise<void> {
        let desa = await this.getDesa();
        let bundleSchemas = { tbp: schemas.tbp, tbp_rinci: schemas.tbp_rinci};
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new PenerimaanContentManager(this._siskeudesService, desa, null);
        await this.sync('penerimaan', desa, contentManager, bundleSchemas);
    }

    async syncPenganggaran(): Promise<void> {
        let desa = await this.getDesa();
        let bundleSchemas = { kegiatan: schemas.kegiatan, rab: schemas.rab }
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new PenganggaranContentManager(this._siskeudesService, desa, null, null);
        await this.sync('penganggaran', desa, contentManager, bundleSchemas);
    }

    async syncSpp(): Promise<void> {
        let desa = await this.getDesa();
        let bundleSchemas = { spp: schemas.spp, spp_rinci: schemas.spp_rinci, spp_bukti: schemas.spp_bukti };
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new SppContentManager(this._siskeudesService, desa, dataReferences);
        await this.sync('spp', desa, contentManager, bundleSchemas);
    }

    private async getDesa(): Promise<any>{
        let settings =  this._settingsService.get("kodeDesa");
        let desas = await this._siskeudesService.getTaDesa(settings.kodeDesa);
        return desas[0];
    }

    private async sync(contentType, desa, contentManager, bundleSchemas){
        let contentSubType = desa.tahun;
        let localContent = this._dataApiService.getLocalContent(contentType, {}, contentSubType);
        if(localContent.isServerSynchronized){
            console.log("Skipping. Already synchronized: ", contentType, desa, localContent);
            return;
        }

        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contents = await contentManager.getContents();
        let bundle = {data: contents, rewriteData: true, changeId: 0};
        
        console.log("Will synchronize: ", contentType, desa, bundle);
        await this._dataApiService.saveContent(contentType, contentSubType, bundle, bundleSchemas, null).toPromise();
    }

    async syncSiskeudes(): Promise<void> {
        this.syncMessage = "Mengirim Perencanaan";
        await this.syncPerencanaan();

        this.syncMessage = "Mengirim Penganggaran";
        await this.syncPenganggaran();

        this.syncMessage = "Mengirim SPP";
        await this.syncSpp();

        this.syncMessage = "Mengirim Penerimaan";
        await this.syncPenerimaan();

        this.syncMessage = "Sinkorinisasi Selesai";
        /*
        this._syncSiskeudesJob = cron.schedule(
            '* 5 * * *',
            () => {
                //this.syncPenerimaan();
                this.syncPenganggaran();
            },
            false
        );
        this._syncSiskeudesJob.start();
        */
    }

    unsyncAll(): void {       
        if (this._syncSiskeudesJob)
            this._syncSiskeudesJob.destroy();
    }
    
}
