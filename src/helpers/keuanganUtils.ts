import DataApiService from '../stores/dataApiService';

export class KeuanganUtils {
    constructor(
        protected dataApiService: DataApiService, 
    ){
        
    }

    mergeContent(sheets, newBundle, oldBundle): any {
        let condition = newBundle['diffs'] ? 'has_diffs' : 'new_setup';
        let keys = Object.keys(oldBundle);

        switch(condition){
            case 'has_diffs':
                keys.forEach(key => {
                    let newDiffs = newBundle['diffs'][key] ? newBundle['diffs'][key] : [];
                    oldBundle['data'][key] = this.dataApiService.mergeDiffs(newDiffs, oldBundle['data'][key]);
                });
                break;
            case 'new_setup':
                keys.forEach(key => {
                    oldBundle['data'][key] = newBundle['data'][key] ? newBundle['data'][key] : [];
                });
                break;
        }
        
        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
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
