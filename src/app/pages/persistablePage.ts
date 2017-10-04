import DataApiService from '../stores/dataApiService';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Router } from '@angular/router';

export interface PersistablePage {

    type: string;
    subType: string;

    modalSaveId: string;

    dataApiService: DataApiService;

    toastr: ToastsManager;
    router: Router;

    mergeContent(oldBundle, newBundle);
    trackDiffs(localData, realtimeData);
    getCurrentDiffs();

    progressListener(progress: Progress);
}
