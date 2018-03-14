import {  DiffTracker, DiffMerger } from "../helpers/diffs";
import { PersistablePage } from '../pages/persistablePage';
import { Router } from '@angular/router';
import { remote, shell } from 'electron';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';

import { DiffItem, DiffDict, BundleData, Bundle } from '../stores/bundle';
import DataApiService from '../stores/dataApiService';
import * as path from 'path';
import * as uuid from 'uuid';
import DataHelper from "./dataHelper";

const APP = remote.app;
const DATA_DIR = APP.getPath('userData');
const CONTENT_DIR = path.join(DATA_DIR, 'contents');

var $ = require('jquery');
var base64 = require("uuid-base64");

export default class PageSaver {
    bundleData = {};
    afterSaveAction: string;
    currentDiffs: any;
    selectedDiff: string;
    subscription: Subscription;
    saveSiskeudesDone: boolean;
    quitAction: string;

    constructor(private page: PersistablePage) {
    }

    getContent(callback: any): void {
        let me = this;
        let localBundle = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;

        console.log("getContent local bundle is: ")
        console.dir(localBundle);
        
        this.subscription = this.page.dataApiService.getContent(this.page.type, this.page.subType, changeId, this.page.progressListener.bind(this.page))
            .subscribe(
            serverBundle => {
                console.log("getContent succeed with result:");
                console.dir(serverBundle);

                if(localBundle.apiVersion == "1.0" || serverBundle.apiVersion == "1.0"){
                    let bundles = this.handleV1Content(localBundle, serverBundle);
                    localBundle = bundles[0];
                    serverBundle = bundles[1];
                    this.writeContent(localBundle);
                }

                let serverModifications = DiffTracker.getNumOfDiffs(serverBundle);
                if(serverModifications > 0)
                    this.page.toastr.info("Memuat "+serverModifications+" perubahan dari server");

                let mergedBundle = null;
                if (serverBundle.changeId === localBundle.changeId)
                    mergedBundle = DiffMerger.mergeContent(this.page.bundleSchemas, localBundle, localBundle);
                else
                    mergedBundle = DiffMerger.mergeContent(this.page.bundleSchemas, serverBundle, localBundle);

                console.log("content merged:");
                console.dir(mergedBundle);

                let modifications = DiffTracker.getNumOfDiffs(mergedBundle);
                if(modifications > 0){
                    this.saveContent(false, 
                        result => {
                            console.log("saveContent succeed");
                            callback(result);
                        },
                        error => {
                            /* If save failed, act like get content failed, return the local bundle */
                            mergedBundle = DiffMerger.mergeContent(this.page.bundleSchemas, localBundle, localBundle);
                            callback(mergedBundle);
                        }
                    );
                } else {
                    console.log("doesn't have any diff, doesn't need to saveContent");
                    this.writeContent(mergedBundle);
                    callback(mergedBundle);
                }
            },
            error => {
                console.error("getContent failed with error", error);

                let errors = error.split('-');
                let errorMesssage = '';

                if (errors[0].trim() === '0'){
                    this.page.toastr.warning('Anda tidak terhubung internet');
                    if(localBundle.apiVersion == "1.0"){
                        localBundle = this.upgradeV1Content(localBundle);
                        this.writeContent(localBundle);
                    }
                    let mergedResult = DiffMerger.mergeContent(this.page.bundleSchemas, localBundle, localBundle);
                    callback(mergedResult);
                } else if (errors[0].trim() === '404'){
                    let emptyContent = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
                    callback(emptyContent);
                } else {
                    this.page.toastr.error('Terjadi kesalahan pada server');
                    throw new Error("Cannot do anything since the server is error");
                }
            }
        )
    }

    saveContent(isTrackingDiff: boolean, onSuccess: any, onError?: any, types?: string[]): void {
        let localBundle = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);

        if (isTrackingDiff) {
            let diffs = DiffTracker.trackDiffs(this.page.bundleSchemas, localBundle["data"], this.bundleData);
            let keys = Object.keys(diffs);

            if (types) {
                keys.forEach(key => {
                    let keyInType = types.filter(e => e === key)[0];
                    if (keyInType) {
                        localBundle['diffs'][key] = localBundle['diffs'][key] ? localBundle['diffs'][key] : [];
    
                        if (diffs[key].total > 0)
                            localBundle['diffs'][key] = localBundle['diffs'][key].concat(diffs[key]);
                    }
                });      
            }
           else {
                keys.forEach(key => {
                    localBundle['diffs'][key] = localBundle['diffs'][key] ? localBundle['diffs'][key] : [];

                    if (diffs[key].total > 0)
                        localBundle['diffs'][key] = localBundle['diffs'][key].concat(diffs[key]);
                });     
           }
        }

        console.log("Will saveContent this bundle:" + localBundle);

        this.subscription = this.page.dataApiService.saveContent(this.page.type, this.page.subType, 
            localBundle, this.page.bundleSchemas, this.page.progressListener.bind(this.page))
            .subscribe(
                result => {
                    console.log("Save content succeed with result:"+result);
                    let mergedWithRemote = DiffMerger.mergeContent(this.page.bundleSchemas, result, localBundle);
                    localBundle = DiffMerger.mergeContent(this.page.bundleSchemas, localBundle, mergedWithRemote);

                    let keys = Object.keys(this.page.bundleSchemas);

                    keys.forEach(key => {
                        localBundle.diffs[key] = [];
                        localBundle.data[key] = localBundle.data[key];
                    });

                    this.writeContent(localBundle)

                    onSuccess(localBundle);
                    this.page.toastr.success('Data berhasil tersinkronisasi');
                    this.onAfterSave();
                },
                error => {
                    console.error("saveContent failed with error", error);
                    if (error.split('-')[0].trim() === '0')
                        this.page.toastr.success('Anda tidak terkoneksi internet, data disimpan secara lokal');
                    else
                        this.page.toastr.error('Terjadi kesalahan pada server ketika menyimpan');

                    if (isTrackingDiff && error.split('-')[0].trim() === '0'){
                        this.writeContent(localBundle)
                    }
                    if(onError)
                        onError(error);
                }
            )
    }

    saveSiskeudesDataPromise(data): Promise<void> {
        let localBundle = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
        localBundle["data"] = data;
        localBundle["rewriteData"] = true;

        return this.page.dataApiService.saveContent(this.page.type, this.page.subType, localBundle, this.page.bundleSchemas, 
            this.page.progressListener.bind(this.page)).toPromise().then(result => {
                console.log("Save content succeed with result:"+result);
                this.page.toastr.success('Data berhasil tersinkronisasi');

                /* Mark is server synchronized */
                let localContent = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);
                localContent.isServerSynchronized = true;
                let localContentFilename = this.page.sharedService.getContentFile(this.page.type, this.page.subType);
                this.page.dataApiService.writeFile(localContent, localContentFilename);
                
            }).catch(error => {
                console.error("saveContent failed with error", error);
                if (error.split && error.split('-')[0].trim() === '0')
                    this.page.toastr.success('Anda tidak terkoneksi internet, data disimpan secara lokal');
                else
                    this.page.toastr.error('Terjadi kesalahan pada server ketika menyimpan');
            });
    }

    saveSiskeudesData(data): void {
        this.saveSiskeudesDone = false;

        let localBundle = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
        localBundle["data"] = data;
        localBundle["rewriteData"] = true;

        this.subscription = this.page.dataApiService.saveContent(this.page.type, this.page.subType, 
            localBundle, this.page.bundleSchemas, this.page.progressListener.bind(this.page))
            .finally(() => {   this.saveSiskeudesDone = true; })
            .subscribe(
                result => {
                    console.log("Save content succeed with result:"+result);
                    this.page.toastr.success('Data berhasil tersinkronisasi');

                    /* Mark is server synchronized */
                    let localContent = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);
                    localContent.isServerSynchronized = true;
                    let localContentFilename = this.page.sharedService.getContentFile(this.page.type, this.page.subType);
                    this.page.dataApiService.writeFile(localContent, localContentFilename);
                },
                error => {
                    console.error("saveContent failed with error", error);
                    if (error.split && error.split('-')[0].trim() === '0')
                        this.page.toastr.success('Anda tidak terkoneksi internet, data disimpan secara lokal');
                    else
                        this.page.toastr.error('Terjadi kesalahan pada server ketika menyimpan');
                }
            )
    }

    writeContent(content: Bundle){
        let jsonFile = this.page.sharedService.getContentFile(this.page.type, this.page.subType);
        this.page.dataApiService.writeFile(content, jsonFile, null);
    }

    writeSiskeudesData(data: BundleData){
        /* If the data is the same with local one and isServerSynchronized getCurrentUnsavedData to true in the local bundle, 
        don't write the new one
        */
        let localContent = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);
        if(localContent.isServerSynchronized){
            let diffs = DiffTracker.trackDiffs(this.page.bundleSchemas, data, localContent.data);
            if(!DiffTracker.isDiffExists(diffs)){
                return;
            }
        }

        let content = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
        content["data"] = data;
        let jsonFile = this.page.sharedService.getContentFile(this.page.type, this.page.subType);
        this.page.dataApiService.writeFile(content, jsonFile, null);
    }


    handleV1Content(localBundle, serverBundle){
        /* Transform any v1 bundle */
        if (localBundle.apiVersion == "1.0"){
            if(serverBundle.apiVersion == "1.0"){
                //Both are old version, use the greater timestamp
                let greaterTimestamp = localBundle["timestamp"] 
                            && serverBundle["timestamp"] 
                            && (localBundle["timestamp"] > serverBundle["timestamp"]) 
                            ? localBundle 
                            : serverBundle;
                localBundle = this.upgradeV1Content(greaterTimestamp);
                serverBundle = this.upgradeV1Content(greaterTimestamp);
            } else {
                //Server is already transformed to new version 
                //and have all the new data so discards the local bundle
                localBundle = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
            }
        } else {
            if(serverBundle.apiVersion == "1.0"){
                if(localBundle.diffs["penduduk"] && localBundle.diffs["penduduk"].length){
                    // Server version still v1, local version have transformed
                    // discard the server version 
                    serverBundle = localBundle;
                } else {
                    // The local data is empty (this is an empty local bundle), 
                    // use server content
                    localBundle = this.upgradeV1Content(serverBundle);
                    serverBundle = this.upgradeV1Content(serverBundle);
                }
            }
        }
        return [localBundle, serverBundle];
    }

    upgradeV1Content(v1Bundle){
        let result = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
        result["data"]["penduduk"] = [];
        result["columns"]["penduduk"] = v1Bundle["columns"];
        result["diffs"]["penduduk"].push({"added": v1Bundle["data"], "modified": [], "deleted":[], total: v1Bundle.data.length});
        DataHelper.transformBundleToNewSchema(result, this.page.bundleSchemas);
        for(let row of result["diffs"]["penduduk"][0]["added"]){
            row[0] = base64.encode(uuid.v4());
        }
        return result;
    }

    getCurrentDiffs(): DiffDict{
        let localBundle = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);

        /* Merge data and diff */
        DiffMerger.mergeContent(this.page.bundleSchemas, localBundle, localBundle);

        return DiffTracker.trackDiffs(this.page.bundleSchemas,
            localBundle["data"], this.page.getCurrentUnsavedData());
    }

    static spliceArray(fields, showColumns): any {
        let result = [];
        for (var i = 0; i != fields.length; i++) {
            var index = showColumns.indexOf(fields[i]);
            if (index == -1) result.push(i);
        }
        return result;
    }

    getMissingIndexes(oldColumns: any[], newColumns: any[]): any[] {
        let indexAtNewColumn: number = 0;
        let missingIndexes: any[] = [];

        for(let i=0; i<oldColumns.length; i++) {
            if(oldColumns[i] !== newColumns[indexAtNewColumn]) {
                missingIndexes.push(i);
                continue;
            }    

            indexAtNewColumn++;
        }

        return missingIndexes;
    }

    onBeforeSave(): void {
        let diffs = this.getCurrentDiffs();
        let diffExists = DiffTracker.isDiffExists(diffs);

        this.quitAction = 'home';

        if (diffExists) {
            this.currentDiffs = diffs;
            this.selectedDiff = Object.keys(diffs)[0];
            $('#' + this.page.modalSaveId)['modal']('show');
            return;
        }

        if (this.afterSaveAction === 'home') {
            this.page.router.navigateByUrl('/');
            return;
        }

        this.page.toastr.info('Tidak terdapat perubahaan');
    }

    onAfterSave(): void {
        $('#' + this.page.modalSaveId)['modal']('hide');

        if (this.afterSaveAction == "home") {
            this.page.router.navigateByUrl('/');
        } else if (this.afterSaveAction == "quit")
            remote.app.quit();
    }

    beforeUnloadListener = (e) => {
        let diffs = this.getCurrentDiffs();
        let diffExists = DiffTracker.isDiffExists(diffs);
        
        this.quitAction = 'close';
        this.afterSaveAction = 'quit';

        if (diffExists) {
            this.currentDiffs = diffs;
            this.selectedDiff = Object.keys(diffs)[0];
            $('#' + this.page.modalSaveId)['modal']('show');
            e.returnValue = "not closing";
            this.afterSaveAction = 'quit';
        }
    }

    redirectMain(): void {
        this.afterSaveAction = 'home';
        let keys = Object.keys(this.bundleData);
        let dataInitiated = false;

        for(let i=0; i<keys.length; i++) {
            let data = this.bundleData[keys[i]];

            if(data.length > 0) {
                dataInitiated = true;
                break;
            }
        }

        if(dataInitiated)
            this.onBeforeSave();
        else 
            this.page.router.navigateByUrl('/');
    }

    cancelSave(): void {
        this.afterSaveAction = null;
        $('#' + this.page.modalSaveId)['modal']('hide');
    }

    switchDiff(id: string): boolean {
        this.selectedDiff = id;
        return false;
    }

    forceQuit(): void {
        $('#' + this.page.modalSaveId)['modal']('hide');

        if(this.quitAction === 'home')
            this.page.router.navigateByUrl('/');
        else if(this.quitAction === 'close') {
            window.removeEventListener('beforeunload', this.beforeUnloadListener);
            remote.app.quit();
        }       
    }
}
