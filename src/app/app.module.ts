import { NgModule } from '@angular/core';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { FormsModule } from '@angular/forms';
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
import SipbmComponent from './pages/sipbm';

import AppComponent from './components/app';
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
import SiskeudesConfigurationComponent from './components/siskeudesConfiguration';
import FeedComponent from './components/feed';
import FrontComponent from './components/front';
import FrontPerencanaanComponent from './components/frontPerencanaan';
import FrontPenganggaranComponent from './components/frontPenganggaran';
import FrontKemiskinanComponent from './components/frontKemiskinan';
import CreateSiskeudesDbComponent from './components/createSiskeudesDb';
import KemiskinanValidationComponent from './components/kemiskinanValidation';
import MapPrintComponent from './components/mapPrint';
import LogPembangunanComponent from './components/logPembangunan';
import PembangunanComponent from './components/pembangunan';
import AnggaranSelectorComponent from './components/anggaranSelector';
import SipbmStatisticComponent from './components/sipbmStatistic';

import DataApiService from './stores/dataApiService';
import SiskeudesService from './stores/siskeudesService';
import SharedService from './stores/sharedService';
import SettingsService from './stores/settingsService';
import SyncService from './stores/syncService';
import titleBar from './helpers/titleBar';

import './helpers/externalLinks';
import './helpers/contextMenu';
import '../styles/app.less';
import FrontPenggunaComponent from './components/frontPengguna';

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
            { path: 'sipbm', component: SipbmComponent },
            { path: 'front', component: FrontComponent, children: [
                    { path: 'feed', component: FeedComponent },
                    { path: 'perencanaan', component: FrontPerencanaanComponent },
                    { path: 'penganggaran', component: FrontPenganggaranComponent },
                    { path: 'configuration', component: SidekaConfigurationComponent },
                    { path: 'registration', component: DesaRegistrationComponent },
                    { path: 'kemiskinan', component: FrontKemiskinanComponent },
                    { path: 'pengguna', component: FrontPenggunaComponent },
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
        SiskeudesConfigurationComponent,
        FeedComponent,
        FrontPerencanaanComponent,
        FrontPenganggaranComponent,
        FrontKemiskinanComponent,
        CreateSiskeudesDbComponent,
        KemiskinanValidationComponent,
        MapPrintComponent,
        LogPembangunanComponent,
        PembangunanComponent,
        AnggaranSelectorComponent,
        SipbmComponent,
        SipbmStatisticComponent,
        FrontPenggunaComponent
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

export class AppModule { 
    constructor() {}
}
