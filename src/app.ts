import { remote, ipcRenderer } from 'electron';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { enableProdMode, NgModule, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule, Router } from '@angular/router';
import { HttpModule } from '@angular/http';
import { ProgressHttpModule } from 'angular-progress-http';
import { LeafletModule } from '@asymmetrik/angular2-leaflet';
import { ToastModule } from 'ng2-toastr';
import { Ng2CompleterModule } from "ng2-completer";
import { Select2Module } from 'ng2-select2';
import { NguiDatetimePickerModule } from '@ngui/datetime-picker';

import PerencanaanComponent from './pages/perencanaan';
import PendudukComponent from './pages/penduduk';
import KemiskinanComponent from './pages/kemiskinan';
import PenganggaranComponent from './pages/penganggaran';
import SppComponent from './pages/spp';
import PenerimaanComponent from './pages/penerimaan';
import PemetaanComponent from './pages/pemetaan';
import UndoRedoComponent from './components/undoRedo';
import CopyPasteComponent from './components/copyPaste';
import OnlineStatusComponent from './components/onlineStatus';
import DesaRegistrationComponent from './components/desaRegistration';
import MapComponent from './components/map';
import PendudukStatisticComponent from './components/pendudukStatistic';
import SuratComponent from './components/surat';
import PendudukDetailComponent from './components/pendudukDetail';
import PageInfoComponent from './components/pageInfo';
import PaginationComponent from './components/pagination';
import PopupPaneComponent from './components/popupPane';
import ProgressBarComponent from './components/progressBar';
import PendudukSelectorComponent from './components/pendudukSelector';
import SidekaConfigurationComponent from './components/sidekaConfiguration';
import FeedComponent from './components/feed';
import FrontPerencanaanComponent from './components/frontPerencanaan';
import FrontPenganggaranComponent from './components/frontPenganggaran';
import FrontSppComponent from './components/frontSpp';
import FrontKemiskinanComponent from './components/frontKemiskinan';
import CreateSiskeudesDbComponent from './components/createSiskeudesDb';
import KemiskinanValidationComponent from './components/kemiskinanValidation';
import MapPrintComponent from './components/mapPrint';
import LogPembangunanComponent from './components/logPembangunan';
import PembangunanComponent from './components/pembangunan';
import AnggaranSelectorComponent from './components/anggaranSelector';

import DataApiService from './stores/dataApiService';
import SiskeudesService from './stores/siskeudesService';
import SharedService from './stores/sharedService';
import SettingsService from './stores/settingsService';
import SyncService from './stores/syncService';
import env from './env';
import titleBar from './helpers/titleBar';

import * as $ from 'jquery';
var pjson = require('./package.json');

if (env.name === 'production')
    enableProdMode();

@Component({
    selector: 'front',
    templateUrl: 'templates/front.html',
})
class FrontComponent {
    auth: any;
    package: any;

    loginUsername: string;
    loginPassword: string;
    loginErrorMessage: string;

    settings: any;

    constructor(
        private dataApiService: DataApiService,
        private settingService: SettingsService,
        private sharedService: SharedService,
    ) {}

    ngOnInit() {
        titleBar.initializeButtons();
        this.auth = this.dataApiService.getActiveAuth();
        this.settingService.getAll().subscribe(settings => { this.settings = settings; });
        this.package = pjson;

        if (this.auth) {
            this.dataApiService.checkAuth().subscribe(data => {
                if (!data['user_id']) {
                    this.auth = null;
                    this.dataApiService.saveActiveAuth(this.auth);
                }
            });
        }

        ipcRenderer.on('updater', (event, type, arg) => {
            if (type == 'update-downloaded') {
                $('#updater-version').html(arg);
                $('#updater').removeClass('hidden');
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

@Component({
    selector: 'app',
    template: '<router-outlet></router-outlet>'
})

class AppComponent {
    constructor() { }
}

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        LeafletModule,
        HttpModule,
        ProgressHttpModule,
        Select2Module,
        NguiDatetimePickerModule,
        ToastModule.forRoot(),
        RouterModule.forRoot([
            { path: '', redirectTo: 'front/feed', pathMatch: 'full' },
            { path: 'penduduk', component: PendudukComponent },
            { path: 'kemiskinan', component: KemiskinanComponent },
            { path: 'perencanaan', component: PerencanaanComponent },
            { path: 'penganggaran', component: PenganggaranComponent },
            { path: 'spp', component: SppComponent },
            { path: 'penerimaan', component: PenerimaanComponent },
            { path: 'pemetaan', component: PemetaanComponent },
            { path: 'front', component: FrontComponent, children: [
                    { path: 'feed', component: FeedComponent },
                    { path: 'perencanaan', component: FrontPerencanaanComponent },
                    { path: 'penganggaran', component: FrontPenganggaranComponent },
                    { path: 'spp', component: FrontSppComponent },
                    { path: 'configuration', component: SidekaConfigurationComponent },
                    { path: 'registration', component: DesaRegistrationComponent },
                    { path: 'kemiskinan', component: FrontKemiskinanComponent }
                ]
            },
        ])
    ],
    declarations: [
        AppComponent,
        FrontComponent,
        PenganggaranComponent,
        SppComponent,
        PerencanaanComponent,
        PendudukComponent,
        UndoRedoComponent,
        CopyPasteComponent,
        OnlineStatusComponent,
        PemetaanComponent,
        DesaRegistrationComponent,
        MapComponent,
        PendudukStatisticComponent,
        SuratComponent,
        PendudukDetailComponent,
        PageInfoComponent,
        PaginationComponent,
        PopupPaneComponent,
        KemiskinanComponent,
        ProgressBarComponent,
        PenerimaanComponent,
        PendudukSelectorComponent,
        SidekaConfigurationComponent,
        FeedComponent,
        FrontPerencanaanComponent,
        FrontPenganggaranComponent,
        FrontSppComponent,
        FrontKemiskinanComponent,
        CreateSiskeudesDbComponent,
        KemiskinanValidationComponent,
        MapPrintComponent,
        LogPembangunanComponent,
        PembangunanComponent,
        AnggaranSelectorComponent
    ],
    entryComponents: [PopupPaneComponent],
    providers: [
        DataApiService,
        SiskeudesService,
        SettingsService,
        SharedService,
        SyncService,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
    ],
    bootstrap: [AppComponent]
})

class SidekaModule {
    constructor() { }
}

platformBrowserDynamic().bootstrapModule(SidekaModule);
