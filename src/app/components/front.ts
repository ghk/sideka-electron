import { remote, ipcRenderer } from 'electron';
import { Component } from '@angular/core';
import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';

import * as $ from 'jquery';
import * as os from "os";

import titleBar from '../helpers/titleBar';
var pjson = require('../../../package.json');

@Component({
    selector: 'front',
    templateUrl: '../templates/front.html',
})
export default class FrontComponent {
    auth: any;
    package: any;
    isSipbmActive: boolean;
    platform: string;

    loginUsername: string;
    loginPassword: string;
    loginErrorMessage: string;

    settings: any;

    constructor(
        private dataApiService: DataApiService,
        private settingService: SettingsService,
        private sharedService: SharedService,
	) {
        this.platform = os.platform();
        window["dataApiService"] = dataApiService;
    }

    ngOnInit() {
        titleBar.initializeButtons();
        titleBar.normal();

        this.auth = this.dataApiService.getActiveAuth();
        this.settingService.getAll().subscribe(settings => { this.settings = settings; });
        this.package = pjson;
        this.isSipbmActive = false;

        if (this.auth) {
            this.dataApiService.checkAuth().subscribe(data => {
                if (!data['user_id']) {
                    this.auth = null;
                    this.dataApiService.saveActiveAuth(this.auth);
                } else {
                    this.auth = data;
                    this.dataApiService.saveActiveAuth(data);
                }
            });
            this.dataApiService.getDesa().subscribe(desa => {                
                if(desa){
                    if(desa.kode && desa.kode.startsWith('33.29.')){
                        this.isSipbmActive = true;
                    }
                }
            })
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
    }

    login() {
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

                this.auth = data;
                this.dataApiService.saveActiveAuth(this.auth);
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
        this.auth = null;
        this.dataApiService.logout();
        return false;
    }
}
