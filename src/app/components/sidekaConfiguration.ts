import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { remote, ipcRenderer } from 'electron';

import { SettingsService } from '../stores/settingsService';
import { SyncService } from '../stores/syncService';
import { DataApiService } from '../stores/dataApiService';
import { SharedService } from '../stores/sharedService';

import * as jetpack from 'fs-jetpack';

var base64Img = require('base64-img');

@Component({
    selector: 'sideka-configuration',
    templateUrl: '../templates/sidekaConfiguration.html',
})

export class SidekaConfigurationComponent {
    settings: any;
    settingsSubscription: Subscription;
    siskeudesDesas: any;

    constructor(
        public toastr: ToastrService,
        private settingsService: SettingsService,
        public syncService: SyncService,
        private dataApiService: DataApiService,
        private sharedService: SharedService
    ) {
    }

    ngOnInit(): void {
        this.settings = {};
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings;
        });
    }

    ngOnDestroy(): void {
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

    cleanLocalBundle(): void {
        let desaId = this.dataApiService.getContentMetadata('desa_id');
        let unsavedDiffs = this.dataApiService.getUnsavedDiffs(['penduduk', 'map']);

        if (unsavedDiffs.length > 0) {
            let dialog = remote.dialog;
            let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
                type: 'question',
                buttons: ['Batal', 'Hapus Data Offline'],
                title: 'Hapus Penyimpanan Offline',
                message: 'Anda berganti desa tetapi data desa sebelumnya masih tersimpan secara offline. Hapus data offline tersebut?'
            });

            if (choice == 0)
                return;
        }

        this.dataApiService.rmDirContents(this.sharedService.getContentDirectory());
        this.toastr.info('Data lokal telah dihapus');
    }

    sync(): void {
        this.syncService.syncAll();
    }
}