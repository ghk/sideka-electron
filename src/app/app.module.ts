import { NgModule } from '@angular/core';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { PbdtIdvHotComponent } from './components/handsontables/pbdtIdv';
import { PbdtRtHotComponent } from './components/handsontables/pbdtRt';
import { BdtRtHotComponent } from './components/handsontables/bdtRt';
import { PendudukComponent } from './pages/penduduk';
import { PemetaanComponent } from './pages/pemetaan';
import { KemiskinanComponent } from './pages/kemiskinan';
import { MapComponent } from './components/map';
import { PopupPaneComponent } from './components/popupPane';
import { LogPembangunanHotComponent } from './components/handsontables/logPembangunan';
import { PembangunanComponent } from './components/pembangunan';
import { MapPrintComponent } from './components/mapPrint';
import { FeedComponent } from './components/feed';

import PerencanaanComponent from './pages/perencanaan';
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
import KeluargaSelectorComponent from './components/keluargaSelector';
import PendudukSelectorComponent from './components/pendudukSelector';
import PendudukKkSelectorComponent from './components/pendudukKkSelector';
import SidekaConfigurationComponent from './components/sidekaConfiguration';
import SiskeudesConfigurationComponent from './components/siskeudesConfiguration';
import SiksNgConfigurationComponent from './components/siksNgConfiguration';
import NomorSuratConfiguration from './components/nomorSuratConfiguration';

import FrontComponent from './components/front';
import FrontPerencanaanComponent from './components/frontPerencanaan';
import FrontPenganggaranComponent from './components/frontPenganggaran';
import FrontKemiskinanComponent from './components/frontKemiskinan';
import FrontPenatausahaanComponent from './components/frontPenatausahaan';
import KemiskinanValidationComponent from './components/kemiskinanValidation';

import { NumbersOnlyDirective } from './directives/numbersOnly.directive';
import { ProdeskelViewer } from './components/prodeskel/viewer';
import { ProdeskelBatasWilayah } from './components/prodeskel/batasWilayah';
import { ProdeskelForm } from './components/prodeskel/form';
import { ProdeskelSdaJenisLahan } from './components/prodeskel/sda/jenisLahan';
import { ProdeskelSdaTopografi } from './components/prodeskel/sda/topografi';
import { ProdeskelSdaIklimTanahErosi } from './components/prodeskel/sda/iklimTanahErosi';
import { ProdeskelSdmJumlah } from './components/prodeskel/sdm/jumlah';
import { ProdeskelSdmUsia } from './components/prodeskel/sdm/usia';
import { ProdeskelSdmPendidikan } from './components/prodeskel/sdm/pendidikan';
import { ProdeskelKelembagaanLembagaPemerintahan } from './components/prodeskel/kelembagaan/lembagaPemerintahan';
import { ProdeskelKelembagaanLembagaKemasyarakatan } from './components/prodeskel/kelembagaan/lembagaKemasyarakatan';
import { ProdeskelKelembagaanPartisipasiPolitik } from './components/prodeskel/kelembagaan/partisipasiPolitik';

import AnggaranSelectorComponent from './components/anggaranSelector';
import SipbmStatisticComponent from './components/sipbmStatistic';
import FrontPenggunaComponent from './components/frontPengguna';
import FrontPostComponent from './components/frontPost';
import TinyMceEditorComponent from './components/tinyMceEditor';
import SiskeudesDbValidation from './components/siskeudesDbValidation';
import SiskeudesPrintComponent from './components/siskeudesPrint';
import DataApiService from './stores/dataApiService';
import SiskeudesService from './stores/siskeudesService';
import SiksNgService from './stores/siksNgService';
import SharedService from './stores/sharedService';
import SettingsService from './stores/settingsService';
import SyncService from './stores/syncService';
import ProdeskelService from './stores/prodeskelService';
import titleBar from './helpers/titleBar';
import LoadingBarComponent from './components/loadingBar';
import ChangeLogComponent from './components/changeLog';
import FeedApiService from './stores/feedApiService';

import './helpers/externalLinks';
import './helpers/contextMenu';
import '../styles/app.less';


@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        LeafletModule,
        HttpModule,
        ProgressHttpModule,
        Select2Module,
        NguiDatetimePickerModule,
        InfiniteScrollModule,
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
            {
                path: 'front', component: FrontComponent, children: [
                    { path: 'feed', component: FeedComponent },
                    { path: 'perencanaan', component: FrontPerencanaanComponent },
                    { path: 'penganggaran', component: FrontPenganggaranComponent },
                    { path: 'penatausahaan', component: FrontPenatausahaanComponent },
                    { path: 'configuration', component: SidekaConfigurationComponent },
                    { path: 'registration', component: DesaRegistrationComponent },
                    { path: 'kemiskinan', component: FrontKemiskinanComponent },
                    { path: 'users', component: FrontPenggunaComponent },
                    { path: 'posts', component: FrontPostComponent },
                    { path: 'spp', component: SiskeudesDbValidation },
                    { path: 'penerimaan', component: SiskeudesDbValidation },
                    {
                        path: 'prodeskel', children: [
                            { path: 'batasWilayah', component: ProdeskelBatasWilayah },
                            { path: 'sda/jenisLahan', component: ProdeskelSdaJenisLahan },
                            { path: 'sda/iklimTanahErosi', component: ProdeskelSdaIklimTanahErosi },
                            { path: 'sda/topografi', component: ProdeskelSdaTopografi },

                            { path: 'sdm/jumlah', component: ProdeskelSdmJumlah },
                            { path: 'sdm/usia', component: ProdeskelSdmUsia },
                            { path: 'sdm/pendidikan', component: ProdeskelSdmPendidikan },

                            { path: 'kelembagaan/lembagaPemerintahan', component: ProdeskelKelembagaanLembagaPemerintahan },
                            { path: 'kelembagaan/lembagaKemasyarakatan', component: ProdeskelKelembagaanLembagaKemasyarakatan },
                            { path: 'kelembagaan/partisipasiPolitik', component: ProdeskelKelembagaanPartisipasiPolitik },
                        ]
                    }
                ]
            }
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
        PbdtIdvHotComponent,
        PbdtRtHotComponent,
        BdtRtHotComponent,
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
        ChangeLogComponent,
        PenerimaanComponent,
        KeluargaSelectorComponent,
        PendudukSelectorComponent,
        PendudukKkSelectorComponent,
        SidekaConfigurationComponent,
        SiskeudesConfigurationComponent,
        SiksNgConfigurationComponent,
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
        SiskeudesPrintComponent,
        FrontPenatausahaanComponent,

        // PRODESKEL POTENSI
        ProdeskelViewer,
        ProdeskelForm,
        ProdeskelBatasWilayah,
        ProdeskelSdaJenisLahan,
        ProdeskelSdaTopografi,
        ProdeskelSdaIklimTanahErosi,
        ProdeskelSdmJumlah,
        ProdeskelSdmUsia,
        ProdeskelSdmPendidikan,
        ProdeskelKelembagaanLembagaPemerintahan,
        ProdeskelKelembagaanLembagaKemasyarakatan,
        ProdeskelKelembagaanPartisipasiPolitik,

        // DIRECTIVES
        NumbersOnlyDirective
    ],
    entryComponents: [PopupPaneComponent],
    providers: [
        DataApiService,
        SiskeudesService,
        SettingsService,
        SharedService,
        FeedApiService,
        SyncService,
        SiksNgService,
        ProdeskelService,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
    ],
    bootstrap: [AppComponent]
})

export class AppModule {
    constructor() { }
}
