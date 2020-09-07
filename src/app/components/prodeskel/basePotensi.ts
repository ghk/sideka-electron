import { OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { remote } from 'electron';
import * as $ from 'jquery';
import { ToastsManager } from 'ng2-toastr';
import { Subject } from 'rxjs';
import ProdeskelService from '../../stores/prodeskelService';
import SettingsService from '../../stores/settingsService';

export class ProdeskelBasePotensi implements OnInit, OnDestroy {
    destroyed$: Subject<void> = new Subject();

    title: string = '';
    loadingMessage: string = 'Memuat...';

    settings: any = {};
    regCode: string;
    password: string;

    formType: string;
    gridType: string;

    isLoading: boolean = false;
    isSubmitting: boolean = false;

    schemaGroups: string[];
    schemas: { [key: string]: any }[];
    existingValues: { [key: string]: any } = {}
    overrideValues: { [key: string]: any } = {}
    idRegex: RegExp = null;

    constructor(
        protected toastr: ToastsManager,
        protected vcr: ViewContainerRef,
        protected prodeskelService: ProdeskelService,
        protected settingsService: SettingsService,
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
        let list: string = await this.prodeskelService.getListProdeskelPotensi(this.gridType)
        let regex = this.idRegex || new RegExp(/i+d+\?+\#+\?([0-9]*)+\?/gm);
        regex.lastIndex = 0;
        let match = regex.exec(list);

        let form: string;
        if (match) {
            let latestId = match[1];
            form = await this.prodeskelService.getLatestFormProdeskelPotensi(this.formType, latestId, this.regCode);
        }
        else
            form = await this.prodeskelService.getNewFormProdeskelPotensi(this.formType);

        let nodes = $.parseHTML(form);
        let existingValues: any = {};
        this.schemas.forEach(schema => {
            let field = schema['field'];
            let filter = schema['type'] === 'radio' ? 'input[name=' + field + ']:checked' : '#id_sc_field_' + field
            let valueNodes = $(nodes).find(filter);
            if (valueNodes.length === 1) {
                existingValues[field] = valueNodes.val();
            }
        });

        this.existingValues = existingValues;
        this.setOverrideValues();
    }

    setOverrideValues(): void {
    }

    parseFloat(value: string, defaultValue: number = 0): number {
        let result = parseFloat(value.replace('.', '').replace(',', '.'));
        if (isNaN(result))
            result = defaultValue;
        return result;
    }

    sumFloatFields(values: any, fields: string[]): string {
        let result = 0;
        fields.forEach(field => {
            result += this.parseFloat(values[field]);
        });
        result = Math.round(result * 10000) / 10000;
        return result.toString().replace('.', ',');
    }

    roundFloat(value: number): number {
        return Math.round(value * 10000) / 10000;
    }

    encodeDate(date: Date): string {
        return (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + '/' +
            ((date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)) + '/' +
            date.getFullYear()
    }

    onSubmit(values: any): void {
        this.isSubmitting = true;
        this.loadingMessage = 'Menyimpan...'
        this.prodeskelService.insertProdeskelPotensi(this.formType, values).then(async (val) => {
            this.isSubmitting = false;
            this.toastr.success('Penyimpanan berhasil.');
            await this.fetchLatestData();
        }).catch(() => {
            this.isSubmitting = false;
            this.toastr.error('Penyimpanan gagal.');
        })
    }

}
