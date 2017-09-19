import DataApiService from '../stores/dataApiService';

export default class ContentMerger {

    private _dataApiService: DataApiService;

    constructor(dataApiService: DataApiService) {
        this._dataApiService = dataApiService;
    }

    mergeSiskeudesContent(newBundle, oldBundle, keys): any {
        let condition = newBundle['diffs'] ? 'has_diffs' : 'new_setup';

        switch(condition){
            case 'has_diffs':
                keys.forEach(key => {
                    let newDiffs = newBundle['diffs'][key] ? newBundle['diffs'][key] : [];
                    oldBundle['data'][key] = this._dataApiService.mergeDiffs(newDiffs, oldBundle['data'][key]);
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
    
}