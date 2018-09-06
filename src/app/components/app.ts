import { Component, ViewContainerRef } from '@angular/core';
import { remote, ipcRenderer } from 'electron';
import * as $ from 'jquery';
import { ToastrService } from 'ngx-toastr';
import { SyncService } from '../stores/syncService';
import { SharedService } from '../stores/sharedService';
import { Migrator } from '../migrations/migrator';

@Component({
    selector: 'app',
    templateUrl: '../templates/app.html'
})

export class AppComponent {
    constructor(
        private syncService: SyncService,
        private sharedService: SharedService
    ) { 
        this.syncService.startSync();
    }
    ngOnInit() {
        ipcRenderer.on('updater', (event, type, arg) => {
            console.log(event, type, arg);
            if (type == 'update-downloaded') {
                $('#updater-version').html(arg.releaseName);
                $('#updater').show();
            }
        });

        $('#updater-btn').click(function () {
            ipcRenderer.send('updater', 'quitAndInstall');
        });

        if(new Migrator(this.sharedService).run()){
            (<any> $("#change-log-modal")).modal("show");
        }
    }
}