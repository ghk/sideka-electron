import { remote, ipcRenderer } from 'electron';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { enableProdMode, NgModule, Component, Inject, NgZone, ViewContainerRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule, Router, Routes, ActivatedRoute } from '@angular/router';
import { HttpModule } from '@angular/http';
import { ProgressHttpModule, Progress } from 'angular-progress-http';
import { LeafletModule } from '@asymmetrik/angular2-leaflet';
import { ToastModule, ToastsManager } from 'ng2-toastr';
import { Ng2CompleterModule } from "ng2-completer";
import { FileUploadModule } from "ng2-file-upload";
import { Select2Module } from 'ng2-select2';

import UndoRedoComponent from './components/undoRedo';
import CopyPasteComponent from './components/copyPaste';
import OnlineStatusComponent from './components/onlineStatus';
import DesaRegistrationComponent from './components/desaRegistration';
import MapComponent from './components/map';
import PendudukStatisticComponent from './components/pendudukStatistic';
import SuratComponent from './components/surat';
import PerencanaanComponent from './pages/perencanaan';
import PendudukComponent from './pages/penduduk';
import KemiskinanComponent from './pages/kemiskinan';
import RabComponent from './pages/rab';
import SppComponent from './pages/spp';
import PenerimaanComponent from './pages/penerimaan';
import PemetaanComponent from './pages/pemetaan';
import PendudukDetailComponent from './components/pendudukDetail';
import PaginationComponent from './components/pagination';
import PopupPaneComponent from './components/popupPane';
import ProgressBarComponent from './components/progressBar';
import PendudukSelectorComponent from './components/pendudukSelector';

import DataApiService from './stores/dataApiService';
import SiskeudesService from './stores/siskeudesService';
import FeedApiService from './stores/feedApiService';

import * as fs from 'fs';
import * as $ from 'jquery';
import * as jetpack from 'fs-jetpack';
import * as moment from 'moment';
import * as path from 'path';
import * as os from 'os';

import env from './env';
import feedApi from './stores/feedApi';
import settings from './stores/settings';
import titleBar from './helpers/titleBar';

var base64Img = require('base64-img');
var pjson = require('./package.json');

if (env.name == 'production')
    enableProdMode();

const APP = remote.app;
const APP_DIR = jetpack.cwd(APP.getAppPath());
const DATA_DIR = APP.getPath('userData');
const CONTENT_DIR = path.join(DATA_DIR, 'contents');
const ALL_CONTENTS = { rpjmList: true, config: true, feed: true, rabList: true, sppList: true, desaRegistration: true };
const jenisSPP = { UM: 'Panjar', LS: 'Definitif', PBY: 'Pembiayaan' }

function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf('://') > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

titleBar.initializeButtons();

@Component({
    selector: 'front',
    templateUrl: 'templates/front.html',
})
class FrontComponent {
    auth: any;
    package: any;
    file: any;
    logo: string;

    siskeudesPath: string;
    visiRPJM: any;
    sumAnggaranRAB: any = [];
    sppData: any = [];
    fixMultipleMisi: any;
    siskeudesMessage: string;
    isDbAvailable: boolean;
    model: any = {};
    postingLogs: any[] = [];
    siskeudesDesas: any[] = [];
    kodeDesa: any;    

    feed: any;
    desas: any;
    loginErrorMessage: string;
    jabatan: string;
    penyurat: string;
    loginUsername: string;
    loginPassword: string;
    maxPaging: number;
    prodeskelRegCode: string;
    prodeskelPassword: string;
    contents: any;
    activeContent: any;
    progress: Progress;
    progressMessage: string;

    constructor(
        private sanitizer: DomSanitizer,
        private zone: NgZone,
        private dataApiService: DataApiService,
        private siskeudesService: SiskeudesService,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef) {

        this.contents = Object.assign({}, ALL_CONTENTS);
        this.toggleContent('feed');
        this.maxPaging = 0;
        this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit() {
        titleBar.normal('Sideka');
        this.progressMessage = '';

        let me = this;
        this.model = {};
        this.auth = this.dataApiService.getActiveAuth();
        this.package = pjson;
        this.loadSettings();

        this.progress = {
            event: null,
            percentage: 0,
            lengthComputable: true,
            loaded: 0,
            total: 0
        };

        if (this.auth) {
            this.dataApiService.checkAuth().subscribe(data => {
                if (!data['user_id']) {
                    me.auth = null;
                    this.dataApiService.saveActiveAuth(me.auth);
                }
            });
        }

        feedApi.getOfflineFeed(data => {
            this.zone.run(() => {
                this.feed = this.convertFeed(data);
                this.desas = this.dataApiService.getLocalDesas();
                this.loadImages();
            });
        });

        this.progressMessage = 'Memuat Data';
        
        this.dataApiService.getDesas(null).subscribe(
            desas => {
                feedApi.getFeed(data => {
                    this.zone.run(() => {
                        this.feed = this.convertFeed(data);
                        this.desas = desas;
                        this.loadImages();
                    });
                });
                jetpack.write(path.join(DATA_DIR, 'desa.json'), desas);
                this.progress.percentage = 100;
            },
            error => {
                this.progress.percentage = 100;
            }
        );

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

    getDate(item) {
        var date = moment(new Date(item.pubDate));
        var dateString = date.fromNow();
        if (date.isBefore(moment().startOf('day').subtract(3, 'day'))) {
            dateString = date.format('LL');
        }
        return dateString;
    }

    getDesa(item) {
        var itemDomain = extractDomain(item.link);
        var desa = this.desas.filter(d => d.domain == itemDomain)[0];
        return desa && desa.desa ? desa.desa + ' - ' + desa.kabupaten : '-';
    }

    desaProgressListener(progress: Progress) {
        this.progress = progress;
    }

    loadImages() {
        var searchDiv = document.createElement('div');
        this.feed.forEach(item => {
            feedApi.getImage(searchDiv, item.link, image => {
                this.zone.run(() => {
                    if (image)
                        image = this.sanitizer.bypassSecurityTrustStyle("url('" + image + "')");
                    item.image = image;
                });
            })
        });
    }

    convertFeed(data) {
        var $xml = $(data);
        var items = [];
        $xml.find('item').each(function (i) {
            if (i === 30) return false;
            var $this = $(this);

            items.push({
                title: $this.find('title').text(),
                link: $this.find('link').text(),
                description: $this.find('description').text(),
                pubDate: $this.find('pubDate').text(),
            });
        });
        return items;
    }

    login() {
        this.dataApiService.login(this.loginUsername, this.loginPassword).subscribe(
            data => {
                if (!data.success)
                    this.loginErrorMessage = 'User atau password Anda salah';
                else {    
                    let oldDesaId = this.dataApiService.getContentMetadata('desa_id');
                    if(oldDesaId && oldDesaId !== data.desa_id){
                        let unsavedDiffs = this.dataApiService.getUnsavedDiffs(['penduduk', 'map']);

                        if(unsavedDiffs.length > 0){
                            let dialog = remote.dialog;
                            let choice = dialog.showMessageBox(remote.getCurrentWindow(),
                            {
                                type: 'question',
                                buttons: ['Batal', 'Hapus Data Offline'],
                                title: 'Hapus Penyimpanan Offline',
                                message: 'Anda berganti desa tetapi data desa sebelumnya masih tersimpan secara offline. Hapus data offline tersebut?'
                            });
                            if(choice == 0)
                                return;
                        } 

                        this.dataApiService.rmDirContents(CONTENT_DIR);
                    }

                    this.auth = data;
                    this.dataApiService.saveActiveAuth(this.auth);
                }
            },
            error => {
                this.loginErrorMessage = 'Terjadi kesalahan';
            }
        );
        return false;
    }

    logout() {
        this.auth = null;
        this.dataApiService.logout();
        return false;
    }

    loadSettings(): void {
        this.jabatan = settings.data.jabatan;
        this.penyurat = settings.data.sender;
        this.logo = settings.data.logo;
        this.maxPaging = settings.data.maxPaging;
        this.siskeudesPath = settings.data['siskeudes.path'];
        this.prodeskelRegCode = settings.data['prodeskelRegCode'];
        this.prodeskelPassword = settings.data['prodeskelPassword'];
        this.fixMultipleMisi = settings.data['fixMultipleMisi']; 
        this.kodeDesa = settings.data['kodeDesa'];            
    }

    saveSettings(): void {
        let data = {
            'jabatan': this.jabatan,
            'sender': this.penyurat,
            'logo': this.file,
            'maxPaging': this.maxPaging,
            'prodeskelRegCode': this.prodeskelRegCode,
            'prodeskelPassword': this.prodeskelPassword,
            'siskeudes.path': this.siskeudesPath,
            'fixMultipleMisi': this.fixMultipleMisi,
            'kodeDesa': this.kodeDesa
        };

        settings.setMany(data);
        this.loadSettings();
        this.readSiskeudesDesa();
        this.toastr.success('Penyimpanan Berhasil!', '');
    }

    fileChangeEvent(fileInput: any) {
        let file = fileInput.target.files[0];
        let extensionFile = file.name.split('.').pop();

        if (extensionFile == 'mde' || extensionFile == 'mdb') {
            this.siskeudesPath = file.path; 
            this.kodeDesa = '';   
            this.readSiskeudesDesa();

        } else {
            this.file = base64Img.base64Sync(file.path);
        }
    }

    readSiskeudesDesa() {
        if(!this.siskeudesPath)
            return;

        if (!jetpack.exists(this.siskeudesPath))
            return;

        this.siskeudesService.getAllDesa(this.siskeudesPath, data =>{
            this.zone.run(() => {
                this.siskeudesDesas = data;
            })            
        })
    }

    getVisiRPJM(): void {
        this.toggleContent('rpjmList');
        if(this.activeContent !== 'rpjmList')
            return;

        this.isDbAvailable = this.checkSiskeudesPath();
        if (this.isDbAvailable) {
            this.siskeudesService.getVisiRPJM(this.kodeDesa, data => {
                this.zone.run(() => {
                    this.visiRPJM = data;
                });
            })
        }
    }
    

    getRAB(): void {
        this.toggleContent('rabList');
        this.sumAnggaranRAB = [];
        this.isDbAvailable = this.checkSiskeudesPath();

        if (this.isDbAvailable) {
            this.siskeudesService.getSumAnggaranRAB(this.kodeDesa, data => {
                this.zone.run(() => {
                    let uniqueYears = [];

                    data.forEach(content => {
                        let isUniqueYear = uniqueYears.map(c => c['year']).indexOf(content['Tahun']);
                        let isUniqueDesa = uniqueYears.map(c => c['kd_desa']).indexOf(content['Kd_Desa']);

                        if (isUniqueDesa == -1 && isUniqueYear == -1 || isUniqueDesa == -1 && isUniqueYear != -1) {
                            uniqueYears.push({
                                year: content['Tahun'],
                                kd_desa: content['Kd_Desa'],
                            })
                        }
                    })

                    uniqueYears.forEach(item => {
                        let content = data.filter(c => c.Tahun == item.year && c.Kd_Desa == item.kd_desa)
                        this.sumAnggaranRAB.push({
                            year: item.year,
                            kd_desa: item.kd_desa,
                            data: content
                        })
                    })
                });
            })
        }
    }

    checkSiskeudesPath(): boolean {
        let res = false;
        let message = '';

        if (this.siskeudesPath) {
            if (!jetpack.exists(this.siskeudesPath))
                message = `Database Tidak Ditemukan di lokasi: ${this.siskeudesPath}`;
            else {
                 if(this.kodeDesa === "" || !this.kodeDesa)
                    message = "Harap Pilih Desa Pada menu Konfigurasi";                
                 else
                    res = true;                    
            }
        }
        else
            message = "Harap Pilih Database SISKEUDES Pada Menu Konfigurasi";

        this.zone.run(() => {
            this.siskeudesMessage = message;
        })

        return res;
    }

    registerDesa(): void {
        this.toggleContent('desaRegistration');
    }

    getSPPLists(): void {
        this.toggleContent('sppList');
        this.isDbAvailable = this.checkSiskeudesPath();

        if (this.isDbAvailable) {
            this.siskeudesService.getPostingLog(this.kodeDesa, posting => {
                this.postingLogs = posting;

                this.siskeudesService.getSPP(this.kodeDesa, data => {
                    this.zone.run(() => {
                        this.sppData = data;
                    })
                })                
            })
        }
    }

    getJenisSPP(val) {
        return jenisSPP[val];
    }

    openDialog() {        
        this.model = {};
        switch(this.activeContent){
            case "sppList":
                if(this.postingLogs.length === 0)
                    break;
                this.siskeudesService.getMaxNoSPP(this.kodeDesa, data => {
                    let pad = '0000';
                    let result;

                    if(data.length !== 0){
                        let splitCode = data[0].No_SPP.split('/');
                        let lastNumber = splitCode[0];
                        let newNumber = (parseInt(lastNumber)+1).toString();
                        let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
                        this.model.No_SPP = stringNum + '/' + splitCode.slice(1).join('/');                
                    }
                    
                });
                $("#modal-add-spp")['modal']("show");
                    break;
            case "rpjmList":
                $("#modal-add-visi")['modal']("show");
            break
        }       
    }

    saveSPP() {
        let table = 'Ta_SPP';
        let contents = [];
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };
        let isValid = true;

        let columns = [{ name: 'No SPP', field: 'No_SPP' }, { name: 'Tanggal', field: 'Tgl_SPP' }, { name: 'Uraian', field: 'Keterangan' }, { name: 'Jenis SPP', field: 'Jn_SPP' }]

        columns.forEach(c => {
            if (this.model[c.field] == "" || this.model[c.field] == "null" || !this.model[c.field]) {
                this.toastr.error(`Kolom ${c.name} tidak boleh kosong`, '');
                isValid = false;
            }
        });

        let isExistSPP = (this.sppData.find(c => c.No_SPP == this.model.No_SPP)) ? true : false;

        if (isExistSPP) {
            this.toastr.error(`No SPP ini sudah Ada`, '');
            isValid = false;
        }

        if (isValid) {
            this.model.Tgl_SPP = moment(this.model.Tgl_SPP, "YYYY-MM-DD").format("DD/MM/YYYY");
            let data = Object.assign({}, this.model, { Potongan: 0, Jumlah: 0, Status: 1, Kd_Desa: this.kodeDesa });
            

            this.siskeudesService.getTaDesa(this.kodeDesa, response =>{
                let desa = response[0];

                data['Tahun'] = desa.Tahun;
                bundle.insert.push({
                    [table]: Object.assign({}, this.model, data)
                });

                this.siskeudesService.saveToSiskeudesDB(bundle, null, response => {
                    if (response.length == 0) {
                        this.toastr.success('Penyimpanan Berhasil!', '');
                        this.toggleContent('sppList');
                        this.getSPPLists();

                        $("#modal-add-spp")['modal']("hide");
                    }
                    else
                        this.toastr.error('Penyimpanan Gagal!', '');
                });
            })
        }
    }

    toggleContent(content) {
        this.contents = Object.assign({}, ALL_CONTENTS);
        if (this.activeContent == content)
            content = 'feed';
        this.contents[content] = false;
        this.activeContent = content;
    }

    applyFixMultipleMisi() {
        if (this.fixMultipleMisi) return;
        this.fixMultipleMisi = 1;
        this.siskeudesService.applyFixMultipleMisi(response => {
            this.saveSettings();
        })
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
        FileUploadModule,
        Select2Module,
        ToastModule.forRoot(),
        RouterModule.forRoot([
            { path: 'penduduk', component: PendudukComponent },
            { path: 'kemiskinan', component: KemiskinanComponent },
            { path: 'perencanaan', component: PerencanaanComponent },
            { path: 'rab', component: RabComponent },
            { path: 'spp', component: SppComponent },
            { path: 'penerimaan', component: PenerimaanComponent },
            { path: 'pemetaan', component: PemetaanComponent },
            { path: '', component: FrontComponent, pathMatch: 'full' },
        ]),
    ],
    declarations: [
        AppComponent,
        FrontComponent,
        RabComponent,
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
        PaginationComponent,
        PopupPaneComponent,
        KemiskinanComponent,
        ProgressBarComponent,
        PenerimaanComponent,
        PendudukSelectorComponent
    ],
    entryComponents: [PopupPaneComponent],
    providers: [
        DataApiService,
        FeedApiService,
        SiskeudesService,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
    ],
    bootstrap: [AppComponent]
})

class SidekaModule {
    constructor() { }
}

platformBrowserDynamic().bootstrapModule(SidekaModule);
