import DataApiService from '../stores/dataApiService';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Router } from '@angular/router';
import SharedService from '../stores/sharedService';

export interface PersistablePage {

    type: string;
    subType: string;

    bundleSchemas: {[type:string]:any};

    modalSaveId: string;

    dataApiService: DataApiService;
    sharedService: SharedService;

    toastr: ToastsManager;
    router: Router;

    trackDiffs(localData, realtimeData);
    getCurrentDiffs();

    progressListener(progress: Progress);
}
