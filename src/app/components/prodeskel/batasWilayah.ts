import { Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { remote } from 'electron';
import { Subject } from 'rxjs';
import ProdeskelService from '../../stores/prodeskelService';
import SettingsService from '../../stores/settingsService';
import * as $ from 'jquery';

@Component({
    selector: 'prodeskel-batas-wilayah',
    templateUrl: '../templates/prodeskel/batasWilayah.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class ProdeskelBatasWilayah {
    destroyed$: Subject<void> = new Subject();
    settings: any = {};
    regCode: string;
    password: string;

    fieldNames: string[] = ["kode_desa", "tahun_pembentukan", "t01011a", "t01011", "t01008", "t01009", "t01010", "bulan", "tahun", "t01018", "t01019", "t01020", "t01021", "t01022", "t01023", "t01024", "t01025", "t01027", "t01028", "t01029", "t01030", "t01013", "t01014", "t01015", "t01016"]
    fieldLabels: any = {
        "kode_desa": "Kode Desa",
        "tahun_pembentukan": "Tahun Pembentukan",
        "t01011a": "Luas Desa (Ha)",
        "t01011": "Nama Kepala Desa/Lurah",
        "t01008": "Nama Pengisi",
        "t01009": "Pekerjaan",
        "t01010": "Jabatan",
        "bulan": "Bulan",
        "tahun": "Tahun",
        "t01018": "Desa/Kelurahan Sebelah Utara",
        "t01019": "Desa/Kelurahan Sebelah Selatan",
        "t01020": "Desa/Kelurahan Sebelah Timur",
        "t01021": "Desa/Kelurahan Sebelah Barat",
        "t01022": "Kecamatan Sebelah Utara",
        "t01023": "Kecamatan Sebelah Selatan",
        "t01024": "Kecamatan Sebelah Timur",
        "t01025": "Kecamatan Sebelah Barat",
        "t01027": "Penetapan Batas",
        "t01028": "Dasar Hukum Perdes No.",
        "t01029": "Dasar Hukum Perda No.",
        "t01030": "Peta Wilayah",
        "t01013": "Referensi 1",
        "t01014": "Referensi 2",
        "t01015": "Referensi 3",
        "t01016": "Referensi 4"
    }

    existingValues: any = {}

    constructor(
        private zone: NgZone,
        private prodeskelService: ProdeskelService,
        private settingsService: SettingsService,
        private router: Router
    ) {
    }

    ngOnInit(): void {
        this.settingsService
            .getAll()
            .takeUntil(this.destroyed$)
            .subscribe(settings => {
                this.settings = settings;
                this.regCode = settings['prodeskel.regCode'];
                this.password = settings['prodeskel.password'];

                if (this.regCode && this.password) {
                    this.initialize();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    async initialize(): Promise<void> {
        let result = await this.prodeskelService.getInitialCookie();
        let cookie = result['headers']['set-cookie'][0];
        let phpsessid = cookie.split(';')[0];
        let sessId = phpsessid.substr(10, phpsessid.length - 1);
        let data: Electron.Details = { url: 'http://localhost:3000', name: 'PHPSESSID', value: sessId };

        remote.getCurrentWebContents().session.cookies.set(data, async (error) => {
            await this.prodeskelService.login(this.regCode, this.password);
            await this.fetchLatestData();
        });
    }

    async fetchLatestData(): Promise<void> {
        let list: string = await this.prodeskelService.getListBatasWilayah();
        let regex = new RegExp(/i+d+\?+\#+\?([0-9]*)+\?/gm);
        regex.lastIndex = 0;
        let match = regex.exec(list);

        let latestId = match[1];
        if (latestId) {
            let form: string = await this.prodeskelService.getFormBatasWilayah(latestId, this.regCode);
            console.log(form);
            let nodes = $.parseHTML(form);
            let formNodes = $(nodes).find('[id^=id_sc_field]');
            this.fieldNames.forEach(field => {
                let valueNodes = $(formNodes).filter('#id_sc_field_' + field);
                if (valueNodes.length === 1)
                    this.existingValues[field] = valueNodes.val();
            });
        }
    }

}
