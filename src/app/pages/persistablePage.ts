import { DataApiService } from '../stores/dataApiService';
import { Progress } from 'angular-progress-http';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { SharedService } from '../stores/sharedService';
import { SchemaDict } from '../schemas/schema';

export interface PersistablePage {

    type: string;
    subType: string;

    bundleSchemas: SchemaDict;

    modalSaveId: string;

    dataApiService: DataApiService;
    sharedService: SharedService;

    toastr: ToastrService;
    router: Router;

    getCurrentUnsavedData();

    progressListener(progress: Progress);
}
