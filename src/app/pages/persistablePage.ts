import DataApiService from '../stores/dataApiService';

export interface PersistablePage {
    dataApiService: DataApiService;
    mergeContent(oldBundle, newBundle);
    trackDiffs(localData, realtimeData);
    getCurrentDiffs();
    modalSaveId: string;
}
