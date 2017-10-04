import DataApiService from '../stores/dataApiService';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';

export interface PersistablePage {

    type: string;
    subType: string;

    modalSaveId: string;
    dataApiService: DataApiService;

    toastr: ToastsManager;

    mergeContent(oldBundle, newBundle);
    trackDiffs(localData, realtimeData);
    getCurrentDiffs();

    progressListener(progress: Progress);
}
