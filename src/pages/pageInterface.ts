export interface IPage {
    mergeContent(oldBundle, newBundle);
    trackDiffs(localData, realtimeData);
}
