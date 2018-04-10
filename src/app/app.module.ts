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
import { PendudukHotComponent } from './components/handsontables/penduduk';
import { MutasiHotComponent } from './components/handsontables/mutasi';
import { LogSuratComponent } from './components/handsontables/logSurat';
import { ProdeskelHotComponent } from './components/handsontables/prodeskel';
import { NomorSuratHotComponent } from './components/handsontables/nomorSurat';
import { KeluargaHotComponent } from './components/handsontables/keluarga';
import { PendudukComponent } from './pages/penduduk';
import { PemetaanComponent } from './pages/pemetaan';
import { MapComponent } from './components/map';
import { PopupPaneComponent } from './components/popupPane';
import { LogPembangunanHotComponent } from './components/handsontables/logPembangunan';
import { PembangunanComponent } from './components/pembangunan';
import { MapPrintComponent } from './components/mapPrint';
import { FeedComponent } from './components/feed';

import PerencanaanComponent from './pages/perencanaan';
import KemiskinanComponent from './pages/kemiskinan';
import PenganggaranComponent from './pages/penganggaran';
import SppComponent from './pages/spp';
import PenerimaanComponent from './pages/penerimaan';
import SipbmComponent from './pages/sipbm';
import PostComponent from './pages/post';
import AppComponent from './components/app';
import UndoRedoComponent from './components/undoRedo';
import CopyPasteComponent from './components/copyPaste';
import OnlineStatusComponent from './components/onlineStatus';
import DesaRegistrationComponent from './components/desaRegistration';
import PendudukStatisticComponent from './components/pendudukStatistic';
import SuratComponent from './components/surat';
import PendudukDetailComponent from './components/pendudukDetail';
import PageInfoComponent from './components/pageInfo';
import PaginationComponent from './components/pagination';
import ProgressBarComponent from './components/progressBar';
import PendudukSelectorComponent from './components/pendudukSelector';
import SidekaConfigurationComponent from './components/sidekaConfiguration';
import SiskeudesConfigurationComponent from './components/siskeudesConfiguration';
import NomorSuratConfiguration from './components/nomorSuratConfiguration';

import FrontComponent from './components/front';
import FrontPerencanaanComponent from './components/frontPerencanaan';
import FrontPenganggaranComponent from './components/frontPenganggaran';
import FrontKemiskinanComponent from './components/frontKemiskinan';
import KemiskinanValidationComponent from './components/kemiskinanValidation';

import AnggaranSelectorComponent from './components/anggaranSelector';
import SipbmStatisticComponent from './components/sipbmStatistic';
import FrontPenggunaComponent from './components/frontPengguna';
import FrontPostComponent from './components/frontPost';
import TinyMceEditorComponent from './components/tinyMceEditor';
import SiskeudesDbValidation from './components/siskeudesDbValidation';
import SiskeudesPrintComponent from './components/siskeudesPrint';
import DataApiService from './stores/dataApiService';
import SiskeudesService from './stores/siskeudesService';
import SharedService from './stores/sharedService';
import SettingsService from './stores/settingsService';
import SyncService from './stores/syncService';
import ProdeskelService from './stores/prodeskelService';
import titleBar from './helpers/titleBar';
import LoadingBarComponent from './components/loadingBar';
import FeedApiService from './stores/feedApiService';

import './helpers/externalLinks';
import './helpers/contextMenu';
import '../styles/app.less';

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
            { path: 'post', component: PostComponent },
            { path: 'front', component: FrontComponent, children: [
                    { path: 'feed', component: FeedComponent },
                    { path: 'perencanaan', component: FrontPerencanaanComponent },
                    { path: 'penganggaran', component: FrontPenganggaranComponent },
                    { path: 'configuration', component: SidekaConfigurationComponent },
                    { path: 'registration', component: DesaRegistrationComponent },
                    { path: 'kemiskinan', component: FrontKemiskinanComponent },
                    { path: 'users', component: FrontPenggunaComponent },
                    { path: 'posts', component: FrontPostComponent },
                    { path: 'spp',component: SiskeudesDbValidation },
                    { path: 'penerimaan',component: SiskeudesDbValidation }
                ]
            },
        ])
    ],
    declarations: [
        AppComponent,
        PendudukHotComponent,
        MutasiHotComponent,
        LogSuratComponent,
        ProdeskelHotComponent,
        NomorSuratHotComponent,
        KeluargaHotComponent,
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
        LoadingBarComponent,
        PenerimaanComponent,
        PendudukSelectorComponent,
        SidekaConfigurationComponent,
        SiskeudesConfigurationComponent,
        NomorSuratConfiguration,
        FeedComponent,
        FrontPerencanaanComponent,
        FrontPenganggaranComponent,
        FrontKemiskinanComponent,
        KemiskinanValidationComponent,
        MapPrintComponent,
        LogPembangunanHotComponent,
        PembangunanComponent,
        AnggaranSelectorComponent,
        SipbmComponent,
        SipbmStatisticComponent,
        FrontPenggunaComponent,
        FrontPostComponent,
        PostComponent,
        TinyMceEditorComponent,
        SiskeudesDbValidation,
        SiskeudesPrintComponent
    ],
    entryComponents: [PopupPaneComponent],
    providers: [
        DataApiService,
        SiskeudesService,
        SettingsService,
        SharedService,
        FeedApiService,
        SyncService,
        ProdeskelService,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
    ],
    bootstrap: [AppComponent]
})

export class AppModule { 
    constructor() {}
}
