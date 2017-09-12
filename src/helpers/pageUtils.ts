import { Diff, DiffTracker } from "../helpers/diffTracker";

import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

export default class PageUtils {
    mergeContent: any;
    diffTracker: DiffTracker;
    trackDiffsMethod: any;
    bundleSchemas: any;
    bundleData: any;

    constructor(private dataApiService: DataApiService, 
                private sharedService: SharedService, 
                private settingsService: SettingsService){
                
                this.diffTracker = new DiffTracker();
    }
    
    getContent(type: string, subType: string, progressListener: any, callback: any): void {
        let me = this;
        let localBundle = this.dataApiService.getLocalContent(type, this.bundleSchemas);
        let changeId = localBundle.changeId ? localBundle.changeId : 0;
        let mergedResult = null;

        this.dataApiService.getContent(type, subType, changeId, progressListener)
            .subscribe(
                result => {
                    if (result['change_id'] === localBundle.changeId) 
                        mergedResult = this.mergeContent(localBundle, localBundle);
                    else
                        mergedResult = this.mergeContent(result, localBundle);

                    let notifications = this.notifyDiffs(result);
                    let isSynchronizingDiffs = this.isSynchronizingDiffs(mergedResult);
                    
                    callback(null, notifications, isSynchronizingDiffs, mergedResult);
                },
                error => {
                    let errors = error.split('-');
                    let errorMesssage = '';

                    if(errors[0].trim() === '0')
                        errorMesssage = 'Anda tidak terhubung internet';
                    else
                        errorMesssage = 'Terjadi kesalahan pada server';

                    mergedResult = this.mergeContent(localBundle, localBundle);
                    callback(errorMesssage, [], false, mergedResult);
                }
            )
    }

    saveContent(type: string, subType: string, isTrackingDiff: boolean, progressListener: any, callback: any): void {
        let localBundle = this.dataApiService.getLocalContent(type, this.bundleSchemas);

        if(isTrackingDiff){
            let diffs = this.trackDiffsMethod(localBundle["data"], this.bundleData);
            let keys = Object.keys(diffs);

            keys.forEach(key => {
                if(diffs[key].total > 0)
                    localBundle['diffs'][key] = localBundle['diffs'][key].concat(diffs[key]);
            });
        }

        this.dataApiService.saveContent(type, subType, localBundle, this.bundleSchemas, progressListener)
            .subscribe(
                result => {
                    let mergedResult = this.mergeContent(result, localBundle);

                    mergedResult = this.mergeContent(localBundle, mergedResult);

                    let keys = Object.keys(this.bundleSchemas);

                    keys.forEach(key => {
                        localBundle.diffs[key] = [];
                        localBundle.data[key] = mergedResult.data[key];
                    });

                    callback(null, localBundle);
                },
                error => {
                    let errors = error.split('-');
                    
                    if(errors[0].trim() === '0')
                        callback('Anda tidak terkoneksi internet, data telah disimpan ke komputer', localBundle);
                    else
                        callback('Terjadi kesalahan pada server', localBundle);
                }
            )
    }

    isSynchronizingDiffs(data: any): boolean {
        let result = false;

        if(!data['diffs'])
            return result;
        
        let diffKeys = Object.keys(data['diffs']);

        diffKeys.forEach(key => {
            if(data['diffs'][key].length > 0)
                result = true;
        });

        return result;
    }
    
    notifyDiffs(data: any): any {
        if(!data['diffs'])
            return [];
        
        let result = [];
        let diffKeys = Object.keys(data['diffs']);

        diffKeys.forEach(key => {
            if(data['diffs'][key].length > 0)
               result.push("Terdapat " + data['diffs'][key].length + " perubahan pada data " + key);
        });

        return result;
    }

     spliceArray(fields, showColumns): any {
        let result = [];
        for (var i = 0; i != fields.length; i++) {
            var index = showColumns.indexOf(fields[i]);
            if (index == -1) result.push(i);
        }
        return result;
    }

    sliceObject(obj:any, values:any[]): any {
        let res = {};
        let keys = Object.keys(obj);

        for (let i = 0; i < keys.length; i++) {
            if (values.indexOf(keys[i]) !== -1) continue;
            res[keys[i]] = obj[keys[i]]
        }
        return res;
    }

    arrayToObj(arr, schema): any {
        let result = {};
        for (let i = 0; i < schema.length; i++) {
            let newValue;
            if (arr[i] == 'true' || arr[i] == 'false')
                newValue = arr[i] == 'true' ? true : false;
            else
                newValue = arr[i];

            result[schema[i]] = newValue;
        }

        return result;
    }
}
