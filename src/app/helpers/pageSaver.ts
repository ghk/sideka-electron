import { Diff, DiffTracker } from "../helpers/diffTracker";
import { PersistablePage } from '../pages/persistablePage';
import { Router } from '@angular/router';
import { remote, shell } from 'electron';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';

import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

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
        private router: Router,
        private toastr: ToastsManager) {
        this.diffTracker = new DiffTracker();
    }

    getContent(progressListener: any, callback: any): void {
        let me = this;
        let localBundle = this.page.dataApiService.getLocalContent(this.page.type, this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.subscription = this.page.dataApiService.getContent(this.page.type, this.page.subType, changeId, progressListener)
            .subscribe(
            result => {
                if (result['change_id'] === localBundle.changeId)
                    mergedResult = this.page.mergeContent(localBundle, localBundle);
                else
                    mergedResult = this.page.mergeContent(result, localBundle);

                let notifications = this.notifyDiffs(result);
                let isSynchronizingDiffs = this.isSynchronizingDiffs(mergedResult);

                callback(null, notifications, isSynchronizingDiffs, mergedResult);
            },
            error => {
                let errors = error.split('-');
                let errorMesssage = '';

                if (errors[0].trim() === '0')
                    errorMesssage = 'Anda tidak terhubung internet';
                else
                    errorMesssage = 'Terjadi kesalahan pada server';

                mergedResult = this.page.mergeContent(localBundle, localBundle);
                callback(errorMesssage, [], false, mergedResult);
            }
            )
    }

    saveContent(isTrackingDiff: boolean, progressListener: any, callback: any): void {
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

        this.subscription = this.page.dataApiService.saveContent(this.page.type, this.page.subType, localBundle, this.bundleSchemas, progressListener)
            .subscribe(
                result => {
                    let mergedResult = this.page.mergeContent(result, localBundle);

                    mergedResult = this.page.mergeContent(localBundle, mergedResult);

                    let keys = Object.keys(this.bundleSchemas);

                    keys.forEach(key => {
                        localBundle.diffs[key] = [];
                        localBundle.data[key] = mergedResult.data[key];
                    });

                    callback(null, localBundle);
                },
                error => {
                    let errors = error.split('-');

                    if (errors[0].trim() === '0')
                        callback('Anda tidak terkoneksi internet, data telah disimpan ke komputer', localBundle);
                    else
                        callback('Terjadi kesalahan pada server', localBundle);
                }
            )
    }

    isSynchronizingDiffs(data: any): boolean {
        let result = false;

        if (!data['diffs'])
            return result;

        let diffKeys = Object.keys(data['diffs']);

        diffKeys.forEach(key => {
            if (data['diffs'][key].length > 0)
                result = true;
        });

        return result;
    }

    notifyDiffs(data: any): any {
        if (!data['diffs'])
            return [];

        let result = [];
        let diffKeys = Object.keys(data['diffs']);

        diffKeys.forEach(key => {
            if (data['diffs'][key].length > 0)
                result.push("Terdapat " + data['diffs'][key].length + " perubahan pada data " + key);
        });

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

        if (this.toastr)
            this.toastr.info('Tidak terdapat perubahaan');
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
