import DataApiService from '../stores/dataApiService';

export interface ISavingPage {
    dataApiService: DataApiService;
    mergeContent(oldBundle, newBundle);
    trackDiffs(localData, realtimeData);
}
