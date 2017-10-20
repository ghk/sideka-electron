import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';
import { Router } from '@angular/router';
import { remote, shell } from 'electron';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';

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
    diffTracker: DiffTracker;
    bundleData = {};
    afterSaveAction: string;
    currentDiffs: any;
    selectedDiff: string;
    subscription: Subscription;

    constructor(private page: PersistablePage) {
        this.diffTracker = new DiffTracker();
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

                let serverModifications = this.getNumOfModifications(serverBundle);
                if(serverModifications > 0)
                    this.page.toastr.info("Memuat "+serverModifications+" perubahan dari server");

                let mergedBundle = null;
                if (serverBundle.changeId === localBundle.changeId)
                    mergedBundle = this.mergeContent(localBundle, localBundle);
                else
                    mergedBundle = this.mergeContent(serverBundle, localBundle);

                console.log("content merged:");
                console.dir(mergedBundle);

                let modifications = this.getNumOfModifications(mergedBundle);
                if(modifications > 0){
                    this.saveContent(false, 
                        result => {
                            console.log("saveContent succeed");
                            this.writeContent(result);
                            callback(result);
                        },
                        error => {
                            /* If save failed, act like get content failed, return the local bundle */
                            mergedBundle = this.mergeContent(localBundle, localBundle);
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
                    let mergedResult = this.mergeContent(localBundle, localBundle);
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

    saveContent(isTrackingDiff: boolean, onSuccess: any, onError?: any): void {
        let localBundle = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);

        if (isTrackingDiff) {
            let diffs = this.trackDiffs(localBundle["data"], this.bundleData);
            let keys = Object.keys(diffs);

            keys.forEach(key => {
                localBundle['diffs'][key] = localBundle['diffs'][key] ? localBundle['diffs'][key] : [];

                if (diffs[key].total > 0)
                    localBundle['diffs'][key] = localBundle['diffs'][key].concat(diffs[key]);
            });     
        }
        console.log("Will saveContent this bundle:" + localBundle);

        this.subscription = this.page.dataApiService.saveContent(this.page.type, this.page.subType, 
            localBundle, this.page.bundleSchemas, this.page.progressListener.bind(this.page))
            .subscribe(
                result => {
                    console.log("Save content succeed with result:"+result);
                    let mergedWithRemote = this.mergeContent(result, localBundle);
                    localBundle = this.mergeContent(localBundle, mergedWithRemote);

                    let keys = Object.keys(this.page.bundleSchemas);

                    keys.forEach(key => {
                        localBundle.diffs[key] = [];
                        localBundle.data[key] = localBundle.data[key];
                    });

                    if(isTrackingDiff){
                        this.writeContent(localBundle)
                    }
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

                    if(isTrackingDiff){
                        this.writeContent(localBundle)
                    }
                    if(onError)
                        onError(error);
                }
            )
    }

    saveSiskeudesData(data): void {
        let localBundle = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
        localBundle["data"] = data;
        localBundle["rewriteData"] = true;

        this.subscription = this.page.dataApiService.saveContent(this.page.type, this.page.subType, 
            localBundle, this.page.bundleSchemas, this.page.progressListener.bind(this.page))
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
                    if (error.split('-')[0].trim() === '0')
                        this.page.toastr.success('Anda tidak terkoneksi internet, data disimpan secara lokal');
                    else
                        this.page.toastr.error('Terjadi kesalahan pada server ketika menyimpan');
                }
            )
    }

    writeContent(content){
        let jsonFile = this.page.sharedService.getContentFile(this.page.type, this.page.subType);
        this.page.dataApiService.writeFile(content, jsonFile, null);
    }

    writeSiskeudesData(data){
        /* If the data is the same with local one and isServerSynchronized set to true in the local bundle, 
        don't write the new one
        */
        let localContent = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);
        if(localContent.isServerSynchronized){
            let diffs = this.trackDiffs(data, localContent.data);
            if(!this.isDiffExists(diffs)){
                return;
            }
        }

        let content = this.page.dataApiService.getEmptyContent(this.page.bundleSchemas);
        content["data"] = data;
        let jsonFile = this.page.sharedService.getContentFile(this.page.type, this.page.subType);
        this.page.dataApiService.writeFile(content, jsonFile, null);
    }

    mergeContent(newBundle, oldBundle): any {
        console.log("Merge"); console.dir(newBundle); console.dir(oldBundle);
        let condition = newBundle['diffs'] ? 'has_diffs' : 'new_setup';
        let keys = Object.keys(this.page.bundleSchemas);

        switch(condition){
            case 'has_diffs':
                DataHelper.transformBundleToNewSchema(newBundle, this.page.bundleSchemas);
                DataHelper.transformBundleToNewSchema(oldBundle, this.page.bundleSchemas);
                keys.forEach(key => {
                    let newDiffs = newBundle['diffs'][key] ? newBundle['diffs'][key] : [];
                    if(!oldBundle['data'][key])
                        oldBundle['data'][key] = [];
                    
                    if(oldBundle['columns'][key] === 'dict')
                        oldBundle['data'][key] = this.page.dataApiService.mergeDiffsMap(newDiffs, oldBundle['data'][key]);
                    else
                        oldBundle['data'][key] = this.page.dataApiService.mergeDiffs(newDiffs, oldBundle['data'][key]);
                });
                break;
            case 'new_setup':
                DataHelper.transformBundleToNewSchema(newBundle, this.page.bundleSchemas);
                keys.forEach(key => {
                    oldBundle['data'][key] = newBundle['data'][key] ? newBundle['data'][key] : [];
                    oldBundle['columns'][key] = newBundle['columns'][key];
                });
                break;
        }

        oldBundle.changeId = newBundle.changeId;

        console.dir(oldBundle);

        return oldBundle;
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

    trackDiffs(localData, currentUnsavedData){
        let results = {};
        let tabs = Object.keys(this.page.bundleSchemas);
        for (let tab of tabs){
            if(!localData[tab])
                localData[tab] = [];

            if(this.page.bundleSchemas[tab] === 'dict')
                results[tab] = this.diffTracker.trackDiffMapping(localData[tab], currentUnsavedData[tab]);
            else
                results[tab] = this.diffTracker.trackDiff(localData[tab], currentUnsavedData[tab]);
        }
        return results;
    }

    getCurrentDiffs(){
        let localBundle = this.page.dataApiService.getLocalContent(this.page.bundleSchemas, this.page.type, this.page.subType);

        /* Merge data and diff */
        this.mergeContent(localBundle, localBundle);

        return this.trackDiffs(localBundle["data"], this.page.getCurrentUnsavedData());
    }

    getNumOfModifications(data: any): any {
        let result = 0;

        if(data["diffs"]){
            let diffKeys = Object.keys(data['diffs']);
            diffKeys.forEach(key => {
                result += data['diffs'][key].length;
            });
        }

        return result;
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
        let diffExists = this.isDiffExists(diffs);

        if (diffExists) {
            this.currentDiffs = diffs;
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

    switchDiff(id: string): boolean {
        this.selectedDiff = id;
        return false;
    }

    forceQuit(): void {
        $('#' + this.page.modalSaveId)['modal']('hide');
        this.page.router.navigateByUrl('/');
    }

    isDiffExists(diffs): boolean{
        let keys = Object.keys(diffs);
        let diffExists = false;

        keys.forEach(key => {
            if (diffs[key].total > 0) {
                this.selectedDiff = key;
                diffExists = true;
                return;
            }
        });
        return diffExists;
    }
}
