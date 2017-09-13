import DataApiService from '../stores/dataApiService';

export interface IPage {
    dataApiService: DataApiService;
    mergeContent(oldBundle, newBundle);
    trackDiffs(localData, realtimeData);
}
