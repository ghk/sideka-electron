import { Component, ViewContainerRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastsManager } from 'ng2-toastr';

import SettingsService from '../stores/settingsService';
import SyncService from '../stores/syncService';

import * as jetpack from 'fs-jetpack';

var base64Img = require('base64-img');

@Component({
    selector: 'sideka-configuration',
    templateUrl: '../templates/sidekaConfiguration.html',
})

export default class SidekaConfigurationComponent {
    settings: any;
    settingsSubscription: Subscription;
    siskeudesDesas: any;

    constructor(
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private zone: NgZone,
        private settingsService: SettingsService,
        public syncService: SyncService
    ) {
        this.toastr.setRootViewContainerRef(this.vcr);
    }

    ngOnInit(): void {
        this.settings = {};
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings; 
        });
    }
    
    ngOnDestroy():void {
        this.settingsSubscription.unsubscribe();
    }

    saveSettings() {
        this.settingsService.setAll(this.settings);
        this.toastr.success('Penyimpanan Berhasil!', '');
    }

    fileChangeEvent(fileInput: any) {
        let file = fileInput.target.files[0];
        let extensionFile = file.name.split('.').pop();

        this.settings['logo'] = base64Img.base64Sync(file.path);
    }

    sync(): void {
        this.syncService.syncAll();
    }
}