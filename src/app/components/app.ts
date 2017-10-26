import { Component, ViewContainerRef } from '@angular/core';
import { remote, ipcRenderer } from 'electron';
import * as $ from 'jquery';
import SyncService from '../stores/syncService';

@Component({
    selector: 'app',
    template: '<router-outlet></router-outlet>'
})

export default class AppComponent {
    constructor(
        private syncService: SyncService,
        private vcr: ViewContainerRef
    ) { 
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
    }
}