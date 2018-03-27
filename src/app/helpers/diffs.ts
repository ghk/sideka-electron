import { DiffItem, Bundle, DiffDict } from '../stores/bundle';
import { SchemaDict } from '../schemas/schema';

import _ from 'lodash';
import DataHelper from './dataHelper';;

export class DiffTracker {

    static equals(a, b): boolean {
        if (a === b)
            return true;

        if ((a === null || a === undefined) && (b === null || b === undefined))
            return true;

        return _.isEqual(a, b);
    }

    static toMap(arr: any[], index: number): any {        
        let result = {};        
        arr.forEach(function (i) {
            result[i[index]] = i;
        })
        return result;
    }

    static trackDiff(oldData, newData): DiffItem {
        let result: DiffItem = { "modified": [], "added": [], "deleted": [], "total": 0 };
        let oldMap = DiffTracker.toMap(oldData, 0);
        let newMap = DiffTracker.toMap(newData, 0);
        let oldKeys = Object.keys(oldMap);
        let newKeys = Object.keys(newMap);

        result.added = newKeys.filter(k => oldKeys.indexOf(k) < 0).map(k => newMap[k]);
        result.deleted = oldKeys.filter(k => newKeys.indexOf(k) < 0).map(k => oldMap[k]);

        for (let i = 0; i < oldKeys.length; i++) {
            var id = oldKeys[i];
            var oldItem = oldMap[id];
            var newItem = newMap[id];

            if (!newItem)
                continue;

            for (let j = 0; j < newItem.length; j++) {
                if (!DiffTracker.equals(oldItem[j], newItem[j])) {
                    result.modified.push(newItem);
                    break;
                }
            }
        }

        result.total = result.deleted.length + result.added.length + result.modified.length;
        return result;
    }

    static trackDiffMapping(oldData, newData): DiffItem {
        let result: DiffItem = { "modified": [], "added": [], "deleted": [], "total": 0 };
        let oldKeys = oldData.map(e => e.id);
        let newKeys = newData.map(e => e.id);

        result.added = newData.filter(k => oldKeys.indexOf(k.id) < 0).map(k => k);
        result.deleted = oldData.filter(e => newKeys.indexOf(e.id) < 0).map(e => e);
        
        for(let i=0; i<newData.length; i++){
            if (!oldData[i])
                continue;
                
            if(oldData[i].id === newData[i].id){
                let propertyKeys = Object.keys(newData[i]['properties']);

                for(let j=0; j<propertyKeys.length; j++){
                    let propertyKey = propertyKeys[j];

                    if(propertyKey === 'style')
                        continue;

                    if(newData[i]['properties'][propertyKey] !== oldData[i]['properties'][propertyKey]){
                        result.modified.push(newData[i]);
                        break;
                    }
                }
            }
        }

        result.total = result.added.length + result.deleted.length + result.modified.length;
        return result;
    }

    static trackDiffs(bundleSchemas, localData, currentUnsavedData): DiffDict {
        let results = {};
        let tabs = Object.keys(bundleSchemas);
        for (let tab of tabs){
            if(!localData[tab])
                localData[tab] = [];

            if(bundleSchemas[tab] === 'dict')
                results[tab] = DiffTracker.trackDiffMapping(localData[tab], currentUnsavedData[tab]);
            else
                results[tab] = DiffTracker.trackDiff(localData[tab], currentUnsavedData[tab]);
        }
        return results;
    }


    static getNumOfDiffs(bundle: Bundle): number {
        let result = 0;

        if(bundle.diffs){
            let diffKeys = Object.keys(bundle.diffs);
            diffKeys.forEach(key => {
                result += bundle['diffs'][key].length;
            });
        }

        return result;
    }

    static isDiffExists(diffs: DiffDict): boolean {
        let keys = Object.keys(diffs);
        return keys.some(key => {
            if (diffs[key].total > 0) {
                return true;
            }
            return false;
        });
    }

}

export class DiffMerger {

    static mergeDiffs(diffs: DiffItem[], data: any[]): any[] {
        for (let i = 0; i < diffs.length; i++) {
            let diffItem: DiffItem = diffs[i];

            for (let j = 0; j < diffItem.added.length; j++) {
                let dataItem: any[] = diffItem.added[j];
                data.push(dataItem);    
            }

            for (let j = 0; j < diffItem.modified.length; j++) {
                let dataItem: any[] = diffItem.modified[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k][0] === dataItem[0]) {
                        data[k] = dataItem;
                    }
                }
            }

            for (let j = 0; j < diffItem.deleted.length; j++) {
                let dataItem: any[] = diffItem.deleted[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k][0] === dataItem[0]) {
                        data.splice(k, 1);
                        break;
                    }
                }
            }
        }

        return data;
    }

    static mergeDiffsMap(diffs: DiffItem[], data: any[]): any[] {
        for (let i = 0; i < diffs.length; i++) {
            let diffItem: DiffItem = diffs[i];

            for (let j = 0; j < diffItem.added.length; j++)
                data.push(diffItem.added[j]);

            for (let j = 0; j < diffItem.modified.length; j++) {
                let dataItem: any[] = diffItem.modified[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k]["id"] === dataItem["id"]) {
                        data[k] = dataItem;
                    }
                }
            }

            for (let j = 0; j < diffItem.deleted.length; j++) {
                let dataItem: any[] = diffItem.deleted[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k]["id"] === dataItem["id"]) {
                        data.splice(k, 1);
                        break;
                    }
                }
            }
        }

        return data;
    }

    static mergeContent(bundleSchemas: SchemaDict, newBundle: Bundle, oldBundle: Bundle): any {
        console.log("Merge"); console.dir(newBundle); console.dir(oldBundle);
        let condition = newBundle['diffs'] ? 'has_diffs' : 'new_setup';
        let keys = Object.keys(bundleSchemas);

        switch(condition){
            case 'has_diffs':
                DataHelper.transformBundleToNewSchema(newBundle, bundleSchemas);
                DataHelper.transformBundleToNewSchema(oldBundle, bundleSchemas);
                keys.forEach(key => {
                    let newDiffs = newBundle['diffs'][key] ? newBundle['diffs'][key] : [];
                    if(!oldBundle['data'][key])
                        oldBundle['data'][key] = [];
                    
                    if(oldBundle['columns'][key] === 'dict')
                        oldBundle['data'][key] = DiffMerger.mergeDiffsMap(newDiffs, oldBundle['data'][key]);
                    else
                        oldBundle['data'][key] = DiffMerger.mergeDiffs(newDiffs, oldBundle['data'][key]);
                });
                break;
            case 'new_setup':
                DataHelper.transformBundleToNewSchema(newBundle, bundleSchemas);
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

}