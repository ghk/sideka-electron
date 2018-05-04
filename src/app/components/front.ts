import { remote, ipcRenderer } from 'electron';
import { Component, ViewContainerRef } from '@angular/core';
import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';

import * as $ from 'jquery';
import * as os from "os";

import titleBar from '../helpers/titleBar';
import SyncService from '../stores/syncService';
import { Router } from '@angular/router';
var pjson = require('../../../package.json');

declare var ENV: string;

@Component({
    selector: 'front',
    templateUrl: '../templates/front.html',
})
export default class FrontComponent {
    package: any;
    isSipbmActive: boolean;
    platform: string;
    env: string;

    loginUsername: string;
    loginPassword: string;
    loginErrorMessage: string;

    settings: any;

    constructor(
        private dataApiService: DataApiService,
        private settingService: SettingsService,
        private sharedService: SharedService,
        private router: Router
	) {
        this.env = ENV;
        console.log(this.env);
        this.platform = os.platform();
        window["dataApiService"] = dataApiService;
    }

    ngOnInit() {
        titleBar.initializeButtons();
        titleBar.normal();

        this.settingService.getAll().subscribe(settings => { this.settings = settings; });
        this.package = pjson;
        this.isSipbmActive = false;

        if (this.dataApiService.auth) {
            this.dataApiService.checkAuth();
            let desa = this.dataApiService.getDesa();

            if(desa.kode && desa.kode.startsWith('33.29.')){
                this.isSipbmActive = true;
            }
        }

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

        $("#change-log-modal").modal("show");
    }

    login() {
        this.loginErrorMessage = null;
        
        this.dataApiService.login(this.loginUsername, this.loginPassword).subscribe(
            data => {
                let oldDesaId = this.dataApiService.getContentMetadata('desa_id');
                if (oldDesaId && oldDesaId !== data.desa_id) {
                    let unsavedDiffs = this.dataApiService.getUnsavedDiffs(['penduduk', 'map']);

                    if (unsavedDiffs.length > 0) {
                        let dialog = remote.dialog;
                        let choice = dialog.showMessageBox(remote.getCurrentWindow(),
                            {
                                type: 'question',
                                buttons: ['Batal', 'Hapus Data Offline'],
                                title: 'Hapus Penyimpanan Offline',
                                message: 'Anda berganti desa tetapi data desa sebelumnya masih tersimpan secara offline. Hapus data offline tersebut?'
                            });
                        if (choice == 0)
                            return;
                    }

                    this.dataApiService.rmDirContents(this.sharedService.getContentDirectory());
                }
            },
            error => {
                let errors = error.split('-');

                if(errors[0].trim() === '403')
                    this.loginErrorMessage = 'User anda salah';
                else if(errors[0].trim() === '401')
                    this.loginErrorMessage = 'Password anda salah';
                else
                    this.loginErrorMessage = 'Terjadi kesalahan pada server';
            }
        );
        return false;
    }

    logout() {
        this.dataApiService.logout();
        this.router.navigateByUrl('/');
        return false;
    }
}
