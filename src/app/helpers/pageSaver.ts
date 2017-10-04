import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';
import { Router } from '@angular/router';
import { remote, shell } from 'electron';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';

import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';
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

    constructor(private page: PersistablePage,
        private sharedService: SharedService,
        private settingsService: SettingsService,
        private router: Router) {
        this.diffTracker = new DiffTracker();
    }

    getContent(callback: any): void {
        let me = this;
        let localBundle = this.page.dataApiService.getLocalContent(this.page.type, this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.subscription = this.page.dataApiService.getContent(this.page.type, this.page.subType, changeId, this.page.progressListener.bind(this.page))
            .subscribe(
            result => {
                if (result['change_id'] === localBundle.changeId)
                    mergedResult = this.page.mergeContent(localBundle, localBundle);
                else
                    mergedResult = this.page.mergeContent(result, localBundle);
                let hasAnyDiffs = this.getNumOfModifications(mergedResult) > 0;

                let modifications = this.getNumOfModifications(mergedResult);
                this.page.toastr.info("Terdapat "+modifications+" perubahan pada data");

                if(hasAnyDiffs){
                    this.saveContent(false, 
                        result => {
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
                    callback(mergedResult);
                }
            },
            error => {
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

        localBundle['diffs'] = this.transformDiffs(localBundle['diffs'], localBundle['columns']);

        this.subscription = this.page.dataApiService.saveContent(this.page.type, this.page.subType, localBundle, this.bundleSchemas, this.page.progressListener.bind(this.page))
            .subscribe(
                result => {
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
                    let errors = error.split('-');

                    if (errors[0].trim() === '0')
                        onError('Anda tidak terkoneksi internet, data telah disimpan ke komputer', localBundle);
                    else
                        onError('Terjadi kesalahan pada server', localBundle);
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

    transformDiffs(diffs, oldColumns) {
         let keys = Object.keys(this.bundleSchemas);

         keys.forEach(key => {
            if(!diffs[key])
                return;

             let missingIndexes = this.getMissingIndexes(oldColumns[key], this.bundleSchemas[key].map(e => e.field));
             let currentDiffs = diffs[key];

             for(let i=0; i<currentDiffs.length; i++) {
                 let currentDiff = currentDiffs[i];

                for(let j=0; j<currentDiff.added.length; j++) {
                    let diffItem = currentDiff.added[j];

                    if(diffItem.length === this.bundleSchemas[key].length)
                        continue;
                    
                    for(let k=0; k<missingIndexes.length; k++) {
                        let missingIndex = missingIndexes[k];
                        diffItem.splice(missingIndex, 1);
                    }
                }

                for(let j=0; j<currentDiff.modified.length; j++) {
                    let diffItem = currentDiff.modified[j];

                    if(diffItem.length === this.bundleSchemas[key].length)
                        continue;
                    
                    for(let k=0; k<missingIndexes.length; k++) {
                        let missingIndex = missingIndexes[k];
                        diffItem.splice(missingIndex, 1);
                    }
                }
             }
         });

         return diffs;
    }

    transformBundle(bundleData, updateColumns: boolean) {
        let keys = Object.keys(this.bundleSchemas);

        keys.forEach(key => {
            if(!bundleData['data'][key] || !bundleData['columns'][key])
                return;

            let schema = this.bundleSchemas[key].map(e => e.field);
            let missingIndexes = this.getMissingIndexes(bundleData['columns'][key], schema);
            let data = bundleData['data'][key];
  
            for(let i=0; i<data.length; i++) {
                let dataItem = data[i];

                if(dataItem.length === this.bundleSchemas[key].length)
                    continue;

                for(let j=0; j<missingIndexes.length; j++) {
                    let missingIndex = missingIndexes[j];

                    dataItem.splice(missingIndex, 1);
                }
            }

            if(updateColumns)
                bundleData['columns'][key] = schema;
        });

        return bundleData;
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
            this.router.navigateByUrl('/');
            return;
        }

        this.page.toastr.info('Tidak terdapat perubahaan');
    }

    onAfterSave(): void {
        $('#' + this.page.modalSaveId)['modal']('hide');

        if (this.afterSaveAction == "home") {
            this.router.navigateByUrl('/');
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
            this.router.navigateByUrl('/');
    }

    switchDiff(id: string): boolean {
        this.selectedDiff = id;
        return false;
    }

    forceQuit(): void {
        $('#' + this.page.modalSaveId)['modal']('hide');
        this.router.navigateByUrl('/');
    }
}
