import { remote, ipcRenderer } from 'electron';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { enableProdMode, NgModule, Component, Inject, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule, Router, Routes, ActivatedRoute } from '@angular/router';
import { HttpModule } from '@angular/http';
import { LeafletModule } from '@asymmetrik/angular2-leaflet';
import { LeafletDrawModule, LeafletDrawDirective } from '@asymmetrik/angular2-leaflet-draw';
import { ToastModule } from 'ng2-toastr';
import { NgProgressModule } from 'ng2-progressbar';

import UndoRedoComponent from './components/undoRedo';
import CopyPasteComponent from './components/copyPaste';
import OnlineStatusComponent from './components/onlineStatus';
import DesaRegistrationComponent from './components/desaRegistration';
import MapComponent from './components/map';
import PendudukStatisticComponent from './components/pendudukStatistic';
import SuratComponent from './components/surat';
import PerencanaanComponent from './pages/perencanaan';
import PendudukComponent from './pages/penduduk';
import RabComponent from './pages/rab';
import SppComponent from './pages/spp';
import PemetaanComponent from './pages/pemetaan';
import PendudukDetailComponent from './components/pendudukDetail';
import PaginationComponent from './components/pagination';
import PopupPaneComponent from './components/popupPane';

import * as $ from 'jquery';
import * as jetpack from 'fs-jetpack';
import * as moment from 'moment';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import env from './env';
import feedApi from './stores/feedApi';
import dataApi from './stores/dataApi';
import settings from './stores/settings';
import titleBar from './helpers/titleBar';
import * as request from 'request';
import { Siskeudes } from './stores/siskeudes';

var pjson = require('./package.json');

if (env.name == 'production')
    enableProdMode();

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var DATA_DIR = app.getPath('userData');
var CONTENT_DIR = path.join(DATA_DIR, 'contents');
const allContents = { rpjmList: true, config: true, feed: true, rabList: true, sppList: true, desaRegistration: true };
const jenisSPP = { UM: 'SPP Panjar', LS: 'SPP Definitif', PBY: 'SPP Pembiayaan' }

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

    siskeudes: any;
    siskeudesPath: string;
    visiRPJM: any;
    sumAnggaranRAB: any = [];
    sppData: any = [];
    fixMultipleMisi: any;

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

    constructor(private sanitizer: DomSanitizer, private zone: NgZone) {
        this.contents = Object.assign({}, allContents);
        this.toggleContent('feed');
        this.maxPaging = 0;
    }

    ngOnInit() {
        titleBar.normal('Sideka');

        this.auth = dataApi.getActiveAuth();
        this.loadSettings();
        this.package = pjson;
        var ctrl = this;
        if (this.auth) {
            //Check whether the token is still valid
            dataApi.checkAuth((err, response, body) => {
                if (!err) {
                    var json = JSON.parse(body);
                    if (!json.user_id) {
                        ctrl.zone.run(() => {
                            ctrl.auth = null;
                            dataApi.saveActiveAuth(null);
                        });
                    }
                }
            })
        }

        //dataapi.saveNextOfflineContent();
        feedApi.getOfflineFeed(data => {
            this.zone.run(() => {
                this.feed = this.convertFeed(data);
                this.desas = dataApi.getOfflineDesa();
                this.loadImages();
            });
        });
        dataApi.getDesa(desas => {
            feedApi.getFeed(data => {
                this.zone.run(() => {
                    this.feed = this.convertFeed(data);
                    this.desas = desas;
                    this.loadImages();
                });
            });
        });
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
        this.loginErrorMessage = null;
        var ctrl = this;
        dataApi.login(this.loginUsername, this.loginPassword, function (err, response, body) {
            ctrl.zone.run(() => {
                console.log(err, response, body);
                if (!err && body.success) {
                    ctrl.auth = body;
                    console.log(ctrl.auth);
                    dataApi.saveActiveAuth(ctrl.auth);
                } else {
                    var message = 'Terjadi kesalahan';
                    if (err) {
                        message += ': ' + err.code;
                        if (err.code == 'ENOTFOUND')
                            message = 'Tidak bisa terkoneksi ke server';
                    }
                    if (body && !body.success)
                        message = 'User atau password Anda salah';
                    ctrl.loginErrorMessage = message;
                }
            });
        });
        return false;
    }

    logout() {
        this.auth = null;
        dataApi.logout();
        return false;
    }

    loadSettings(): void {
        this.jabatan = settings.data.jabatan;
        this.penyurat = settings.data.sender;
        this.logo = settings.data.logo;
        this.maxPaging = settings.data.maxPaging;
        this.siskeudesPath = settings.data['siskeudes.path'];
        this.siskeudes = new Siskeudes(this.siskeudesPath);
        this.prodeskelRegCode = settings.data['prodeskelRegCode'];
        this.prodeskelPassword = settings.data['prodeskelPassword'];
        this.fixMultipleMisi = settings.data['fixMultipleMisi']
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
        };

        settings.setMany(data);
        this.loadSettings();
    }

    fileChangeEvent(fileInput: any) {
        let file = fileInput.target.files[0];
        let extensionFile = file.name.split('.').pop();

        if (extensionFile == 'mde' || extensionFile == 'mdb') {
            this.siskeudesPath = file.path;
        } else {
            this.file = fs.readFileSync(file.path).toString('base64');
        }
    }

    getVisiRPJM(): void {
        this.toggleContent('rpjmList');
        if (this.siskeudesPath) {
            this.siskeudes.getVisiRPJM(data => {
                this.zone.run(() => {
                    this.visiRPJM = data;
                });
            })
        }
    }

    getRAB(): void {
        this.toggleContent('rabList');
        this.sumAnggaranRAB = [];
        if (this.siskeudesPath) {
            this.siskeudes.getSumAnggaranRAB(data => {
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

    registerDesa(): void {
        this.toggleContent('desaRegistration');
    }

    getSPPLists(): void {
        this.toggleContent('sppList');
        if (this.siskeudesPath) {
            this.siskeudes.getSPP(data => {
                this.zone.run(() => {
                    this.sppData = data;
                })
            })
        }
    }

    toggleContent(content) {
        this.contents = Object.assign({}, allContents);
        if (this.activeContent == content)
            content = 'feed';
        this.contents[content] = false;
        this.activeContent = content;
    }

    applyFixMultipleMisi() {
        if (this.fixMultipleMisi) return;
        this.fixMultipleMisi = 1;
        this.siskeudes.applyFixMultipleMisi(response => {
            console.log(response)
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
        LeafletDrawModule,
        NgProgressModule,
        ToastModule.forRoot(),
        RouterModule.forRoot([
            { path: 'penduduk', component: PendudukComponent },
            { path: 'perencanaan', component: PerencanaanComponent },
            { path: 'rab', component: RabComponent },
            { path: 'spp', component: SppComponent },
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
        PopupPaneComponent
    ],
    entryComponents: [PopupPaneComponent],
    providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }],
    bootstrap: [AppComponent]
})

class SidekaModule {
    constructor() { }
}

platformBrowserDynamic().bootstrapModule(SidekaModule);
