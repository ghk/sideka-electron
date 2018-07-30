import { Component, ViewContainerRef } from '@angular/core';
import { remote, ipcRenderer } from 'electron';
import * as $ from 'jquery';
import { ToastsManager } from 'ng2-toastr';
import SyncService from '../stores/syncService';
import SharedService from '../stores/sharedService';
import { Migrator } from '../migrations/migrator';

@Component({
    selector: 'app',
    templateUrl: '../templates/app.html'
})

export default class AppComponent {
    constructor(
        private syncService: SyncService,
        public toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private sharedService: SharedService
    ) { 
        this.toastr.setRootViewContainerRef(this.vcr);
        this.syncService.setViewContainerRef(this.vcr);
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