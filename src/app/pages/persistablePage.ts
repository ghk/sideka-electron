import DataApiService from '../stores/dataApiService';

export interface PersistablePage {

    type: string;
    subType: string;

    modalSaveId: string;
    dataApiService: DataApiService;

    mergeContent(oldBundle, newBundle, serverColumns?);
    trackDiffs(localData, realtimeData);
    getCurrentDiffs();
}
