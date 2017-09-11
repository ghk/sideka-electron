import { Diff, DiffTracker } from "../helpers/diffTracker";

import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

export default class PageUtils {
    mergeContent: any;
    diffTracker: DiffTracker;

    constructor(private dataApiService: DataApiService, 
                private sharedService: SharedService, 
                private settingsService: SettingsService){
                
                this.diffTracker = new DiffTracker();
    }
    
    getContent(type: string, subType: string, bundleSchemas: any, progressListener: any, callback: any): void {
        let me = this;
        let localBundle = this.dataApiService.getLocalContent(type, bundleSchemas);
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

    saveContent(type: string, subType: string, bundleSchemas: any, bundleData: any, isTrackingDiff: boolean, progressListener: any, callback: any): void {
        let localBundle = this.dataApiService.getLocalContent('penduduk', bundleSchemas);
     
        if(isTrackingDiff){
            let diffs = this.trackDiffs(localBundle["data"], bundleData);
            let keys = Object.keys(diffs);

            keys.forEach(key => {
                if(diffs[key].total > 0)
                    localBundle['diffs'][key] = localBundle['diffs'][key].concat(diffs[key]);
            });
        }

        this.dataApiService.saveContent(type, subType, localBundle, bundleSchemas, progressListener)
            .subscribe(
                result => {
                    let mergedResult = this.mergeContent(result, localBundle);

                    mergedResult = this.mergeContent(localBundle, mergedResult);

                    let keys = Object.keys(bundleSchemas);

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

    trackDiffs(localData, realTimeData): any {
        let diffs = {};

        let keys = Object.keys(localData);

        keys.forEach(key => {
            diffs[key] = this.diffTracker.trackDiff(localData[key], realTimeData[key]);
        });

        return diffs;
    }
}
