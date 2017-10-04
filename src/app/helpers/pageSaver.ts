import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';
import { Router } from '@angular/router';
import { remote, shell } from 'electron';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';

import DataApiService from '../stores/dataApiService';
import * as path from 'path';

const APP = remote.app;
const DATA_DIR = APP.getPath('userData');
const CONTENT_DIR = path.join(DATA_DIR, 'contents');

var $ = require('jquery');

export default class PageSaver {
    mergeContent: any;
    diffTracker: DiffTracker;
    trackDiffsMethod: any;
    bundleSchemas = {};
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
        let localBundle = this.page.dataApiService.getLocalContent(this.page.type, this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        console.log("getContent local bundle is: ")
        console.dir(localBundle);
        this.subscription = this.page.dataApiService.getContent(this.page.type, this.page.subType, changeId, this.page.progressListener.bind(this.page))
            .subscribe(
            result => {
                console.log("getContent succeed with result:");
                console.dir(result);

                if (result['change_id'] === localBundle.changeId)
                    mergedResult = this.page.mergeContent(localBundle, localBundle);
                else
                    mergedResult = this.page.mergeContent(result, localBundle);

                console.log("content merged:");
                console.dir(mergedResult);

                let modifications = this.getNumOfModifications(mergedResult);
                let hasAnyDiffs = modifications > 0;
                if(hasAnyDiffs){
                    this.page.toastr.info("Terdapat "+modifications+" perubahan pada data");
                    this.saveContent(false, 
                        result => {
                            console.log("saveContent succeed");
                            let jsonFile = path.join(CONTENT_DIR, this.page.type + '.json');
                            this.page.dataApiService.writeFile(result, jsonFile, null);
                            callback(result);
                        },
                        error => {
                            /* If save failed, act like get content failed, return the local bundle */
                            mergedResult = this.page.mergeContent(localBundle, localBundle);
                            callback(mergedResult);
                        }
                    );
                } else {
                    console.log("doesn't have any diff, don't need to saveContent");
                    let jsonFile = path.join(CONTENT_DIR, this.page.type + '.json');
                    this.page.dataApiService.writeFile(mergedResult, jsonFile, null);
                    callback(mergedResult);
                }
            },
            error => {
                console.error("getContent failed with error", error);

                let errors = error.split('-');
                let errorMesssage = '';
                if (errors[0].trim() === '0')
                    errorMesssage = 'Anda tidak terhubung internet';
                else
                    errorMesssage = 'Terjadi kesalahan pada server';
                this.page.toastr.error(errorMesssage);

                mergedResult = this.page.mergeContent(localBundle, localBundle);
                callback(mergedResult);
            }
        )
    }

    saveContent(isTrackingDiff: boolean, onSuccess: any, onError?: any): void {
        let localBundle = this.page.dataApiService.getLocalContent(this.page.type, this.bundleSchemas);

        if (isTrackingDiff) {
            let diffs = this.page.trackDiffs(localBundle["data"], this.bundleData);
            let keys = Object.keys(diffs);

            keys.forEach(key => {
                localBundle['diffs'][key] = localBundle['diffs'][key] ? localBundle['diffs'][key] : [];

                if (diffs[key].total > 0)
                    localBundle['diffs'][key] = localBundle['diffs'][key].concat(diffs[key]);
            });     
        }
        console.log("Will saveContent this bundle:" + localBundle);

        this.subscription = this.page.dataApiService.saveContent(this.page.type, this.page.subType, localBundle, this.bundleSchemas, this.page.progressListener.bind(this.page))
            .subscribe(
                result => {
                    console.log("Save content succeed with result:"+result);
                    let mergedResult = this.page.mergeContent(result, localBundle);
                    mergedResult = this.page.mergeContent(localBundle, mergedResult);

                    let keys = Object.keys(this.bundleSchemas);

                    keys.forEach(key => {
                        localBundle.diffs[key] = [];
                        localBundle.data[key] = mergedResult.data[key];
                    });

                    onSuccess(localBundle);
                    this.onAfterSave();
                },
                error => {
                    console.error("saveContent failed with error", error);
                    let errors = error.split('-');
                    if (errors[0].trim() === '0')
                        this.page.toastr.info('Anda tidak terkoneksi internet, data telah disimpan ke komputer');
                    else
                        this.page.toastr.error('Terjadi kesalahan pada server ketika menyimpan');

                    if(onError)
                        onError(error);
                }
            )
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
        let diffs = this.page.getCurrentDiffs();
        let keys = Object.keys(diffs);
        let diffExists = false;

        keys.forEach(key => {
            if (diffs[key].total > 0) {
                this.selectedDiff = key;
                diffExists = true;
                return;
            }
        });

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
}
