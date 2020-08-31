import { Component, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { remote } from 'electron';
import * as $ from 'jquery';
import { ToastsManager } from 'ng2-toastr';
import { Subject } from 'rxjs';
import ProdeskelService from '../../stores/prodeskelService';
import SettingsService from '../../stores/settingsService';

@Component({
    selector: 'prodeskel-batas-wilayah',
    templateUrl: '../../templates/prodeskel/batasWilayah.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelBatasWilayah implements OnInit, OnDestroy {
    destroyed$: Subject<void> = new Subject();

    title: string = 'Batas Wilayah';
    loadingMessage: string = 'Memuat...';

    settings: any = {};
    regCode: string;
    password: string;

    isLoading: boolean = false;
    isSubmitting: boolean = false;

    fieldSchemas: { [key:string]: any }[] = [
        { field: 'kode_desa', label: "Kode Desa", type: "text", hidden: true },
        { field: 'tahun_pembentukan', label: "Tahun Pembentukan", type: "text", required: true },
        { field: 't01011a', label: "Luas Desa (Ha)", type: "text" },
        { field: 't01011', label: "Nama Kepala Desa/Lurah", type: "text", required: true },
        { field: 't01008', label: "Nama Pengisi", type: "text" },
        { field: 't01009', label: "Pekerjaan", type: "text" },
        { field: 't01010', label: "Jabatan", type: "text" },
        { field: 'bulan', label: "Bulan", type: "number", required: true },
        { field: 'tahun', label: "Tahun", type: "number", required: true },
        { field: 't01018', label: "Desa/Kelurahan Sebelah Utara", type: "text" },
        { field: 't01019', label: "Desa/Kelurahan Sebelah Selatan", type: "text" },
        { field: 't01020', label: "Desa/Kelurahan Sebelah Timur", type: "text" },
        { field: 't01021', label: "Desa/Kelurahan Sebelah Barat", type: "text" },
        { field: 't01022', label: "Kecamatan Sebelah Utara", type: "text" },
        { field: 't01023', label: "Kecamatan Sebelah Selatan", type: "text" },
        { field: 't01024', label: "Kecamatan Sebelah Timur", type: "text" },
        { field: 't01025', label: "Kecamatan Sebelah Barat", type: "text" },
        { field: 't01027', label: "Penetapan Batas", type: "radio", options: [{ label: 'Ada', value: 1}, { label: 'Tidak Ada', value: 0}] },
        { field: 't01028', label: "Dasar Hukum Perdes No.", type: "text" },
        { field: 't01029', label: "Dasar Hukum Perda No.", type: "text" },
        { field: 't01030', label: "Peta Wilayah", type: "radio", options: [{ label: 'Ada', value: 1}, { label: 'Tidak Ada', value: 0}] },
        { field: 't01013', label: "Referensi 1", type: "text" },
        { field: 't01014', label: "Referensi 2", type: "text" },
        { field: 't01015', label: "Referensi 3", type: "text" },
        { field: 't01016', label: "Referensi 4", type: "text" }
    ]

    existingValues: { [key:string]: any } = {}
    overrideValues: { [key:string]: any } = {}

    constructor(
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private router: Router,
        private prodeskelService: ProdeskelService,
        private settingsService: SettingsService,
    ) {
        this.toastr.setRootViewContainerRef(vcr);
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
                    this.isLoading = true;
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
            this.isLoading = false;
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
            let nodes = $.parseHTML(form);
            this.fieldSchemas.forEach(schema => {
                let field = schema['field'];
                let filter = schema['type'] === 'radio' ? 'input[name='+ field + ']:checked' : '#id_sc_field_' + field
                let valueNodes = $(nodes).find(filter);
                if (valueNodes.length === 1) {
                    this.existingValues[field] = valueNodes.val();
                }
            });
        }

        this.overrideValues['bulan'] = new Date().getMonth();
        this.overrideValues['tahun'] = new Date().getFullYear();
        this.overrideValues['t01008'] = this.settings['prodeskel.pengisi'];
        this.overrideValues['t01009'] = this.settings['prodeskel.pekerjaan'];
        this.overrideValues['t01010'] = this.settings['prodeskel.jabatan'];
    }

    onSubmit(values: any): void {
        this.isSubmitting = true;
        this.loadingMessage = 'Menyimpan...'
        this.prodeskelService.insertBatasWilayah(values).then(() => {
            this.isSubmitting = false;
            this.toastr.success('Penyimpanan berhasil.');
        }).catch(() => {
            this.isSubmitting = false;
            this.toastr.error('Penyimpanan gagal.');
        })
    }

}
