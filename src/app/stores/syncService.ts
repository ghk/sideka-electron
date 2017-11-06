import { remote } from 'electron';
import { Injectable, ViewContainerRef } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import * as path from 'path';
import * as os from 'os';
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
import { ToastsManager, Toast } from 'ng2-toastr';
import { DiffTracker, DiffMerger } from '../helpers/diffs';
import { Router, ActivatedRoute } from '@angular/router';
import { LocationStrategy } from '@angular/common';
import { SchemaDict } from '../schemas/schema';
import { Progress } from 'angular-progress-http';


@Injectable()
export default class SyncService {

    private _syncSiskeudesJob: any;
    private _syncMessage: string;
    private _toast: Toast;
    private _spawningToast: boolean;
    private _vcr: ViewContainerRef;
    private _isSynchronizing = false;

    constructor(
        private _dataApiService: DataApiService,
        private _siskeudesService: SiskeudesService,
        private _settingsService: SettingsService,
        private _sharedService: SharedService,
        private _toastr: ToastsManager,
        private _router: Router,
    ) { 
    }

    public setViewContainerRef(vcr: ViewContainerRef){
        this._vcr = vcr;
    }

    async syncPenduduk(): Promise<void> {
        await this.syncContent("penduduk", null, schemas.pendudukBundle);
    }

    async syncPemetaan(): Promise<void> {
        await this.syncContent("pemetaan", null, schemas.pemetaanBundle);
    }

    async syncPerencanaan(): Promise<void> {
        let desa = await this.getDesa();
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new PerencanaanContentManager(this._siskeudesService, desa, null);
        await this.syncSiskeudes('perencanaan', desa, contentManager, schemas.perencanaanBundle);
    }

    async syncPenerimaan(): Promise<void> {
        let desa = await this.getDesa();
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new PenerimaanContentManager(this._siskeudesService, desa, null);
        await this.syncSiskeudes('penerimaan', desa, contentManager, schemas.penerimaanBundle);
    }

    async syncPenganggaran(): Promise<void> {
        let desa = await this.getDesa();
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new PenganggaranContentManager(this._siskeudesService, desa, null);
        await this.syncSiskeudes('penganggaran', desa, contentManager, schemas.penganggaranBundle);
    }

    async syncSpp(): Promise<void> {
        let desa = await this.getDesa();
        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contentManager = new SppContentManager(this._siskeudesService, desa, dataReferences);
        await this.syncSiskeudes('spp', desa, contentManager, schemas.sppBundle);
    }

    private async getDesa(): Promise<any>{
        let kodeDesa =  this._settingsService.get("siskeudes.desaCode");
        if(!kodeDesa)
            return null;
        let desas = await this._siskeudesService.getTaDesa();
        return desas[0];
    }

    private async syncContent(contentType: string, contentSubType: string, bundleSchemas: SchemaDict){
        if(contentType == this.getCurrentUrl()){
            console.log("Skipping. Page is active", contentType);
            return;
        }

        let localBundle = this._dataApiService.getLocalContent(bundleSchemas, contentType, contentSubType);
        let numOfDiffs = DiffTracker.getNumOfDiffs(localBundle);
        if(numOfDiffs == 0){
            console.log("Skipping. Already synchronized: ", contentType, contentSubType);
            return;
        }

        await this.setSyncMessage("Mengirim data "+contentType);
        let result = await this._dataApiService.saveContent(contentType, contentSubType,
            localBundle, bundleSchemas, this.progressListener.bind(this)).toPromise();

        let mergedWithRemote = DiffMerger.mergeContent(bundleSchemas, result, localBundle);
        localBundle = DiffMerger.mergeContent(bundleSchemas, localBundle, mergedWithRemote);

        let keys = Object.keys(bundleSchemas);

        keys.forEach(key => {
            localBundle.diffs[key] = [];
            localBundle.data[key] = localBundle.data[key];
        });

        let jsonFile = this._sharedService.getContentFile(contentType, contentSubType);
        this._dataApiService.writeFile(localBundle, jsonFile, null);
    }

    private async syncSiskeudes(contentType: string, desa, contentManager: ContentManager, bundleSchemas: SchemaDict){
        if(contentType == this.getCurrentUrl()){
            console.log("Skipping. Page is active", contentType);
            return;
        }

        let contentSubType = desa.tahun;
        let localContent = this._dataApiService.getLocalContent(bundleSchemas, contentType, contentSubType);

        let dataReferences = new SiskeudesReferenceHolder(this._siskeudesService);
        let contents = await contentManager.getContents();
        let bundle = {data: contents, rewriteData: true, changeId: 0};

        if(localContent.isServerSynchronized){
            let diffs = DiffTracker.trackDiffs(bundleSchemas, bundle.data, localContent.data);
            if(!DiffTracker.isDiffExists(diffs)){
                console.log("Skipping. Already synchronized: ", contentType);
                return;
            }
        }

        await this.setSyncMessage("Mengirim data "+contentType);
        
        console.log("Will synchronize: ", contentType, desa, bundle);
        await this._dataApiService.saveContent(contentType, contentSubType, bundle, bundleSchemas, this.progressListener.bind(this)).toPromise();

        localContent.isServerSynchronized = true;
        localContent.data = contents;
        let localContentFilename = this._sharedService.getContentFile(contentType, contentSubType);
        this._dataApiService.writeFile(localContent, localContentFilename);
    }

    progressListener(progress: Progress) {
        if(!this._vcr || !progress.percentage)
            return;
        this._toastr.setRootViewContainerRef(this._vcr);

        let message = `${this.syncMessage} (${progress.percentage} %)`;
        if(!this._toast){
            if(!this._spawningToast){
                this._spawningToast = true;
                this._toastr.info(message, "Sinkronisasi", {dismiss: 'controlled' }).then(toast => {
                    this._toast = toast;
                })
            }
        } else {
            this._toast.message = message;
        }
    }

    private getCurrentUrl(){
        let urlTree = this._router.parseUrl(this._router.url);
        return urlTree.root.children['primary'].segments.map(it => it.path).join('/');
    }

    async syncAll(): Promise<void> {
        if(this._isSynchronizing){
            console.log("Skipping, is synchronizing");
            return;
        }
        if(!this._dataApiService.auth){
            return;
        }
        this._isSynchronizing = true;
        try {
            await this.syncPenduduk();
            await this.syncPemetaan();

            let siskeudesAutoSync =  this._settingsService.get("siskeudes.autoSync");
	    if(os.platform() !== "win32")
	    	return;

            if(!siskeudesAutoSync)
                return;

            let desa = await this.getDesa();
            if(!desa)
                return;

            await this.syncPerencanaan();
            await this.syncPenganggaran();
            await this.syncSpp();
            await this.syncPenerimaan();
        } catch(e) {
            console.log("error on sync", e);
        } finally {
            if(this._toast){
                this._toastr.dismissToast(this._toast);
                this._toast = null;
            }
            this._spawningToast = false;
            this._isSynchronizing = false;
        }
    }

    startSync(){
        if(this._syncSiskeudesJob)
            return;    
        this._syncSiskeudesJob = cron.schedule("*/1 * * * *", () => {
            this.syncAll();
        });
    }

    stopSync(): void {       
        if (this._syncSiskeudesJob){
            this._syncSiskeudesJob.destroy();
            this._syncSiskeudesJob = null;
        }
    }

    get syncMessage(): string{
        return this._syncMessage;
    }

    async setSyncMessage(value: string): Promise<void>{
        this._syncMessage = value;
    }
    
}
