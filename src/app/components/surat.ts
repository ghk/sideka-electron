import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter, OnInit, OnDestroy } from "@angular/core";
import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import { Select2OptionData } from "ng2-select2";

import schemas from '../schemas';
import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import nomorSuratFormatter from '../helpers/nomorSuratFormatter';

import * as moment from 'moment';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';

@Component({
    selector: 'surat',
    templateUrl: '../templates/surat.html'
})
export default class SuratComponent implements OnInit, OnDestroy {
    private _penduduk;

    @Input()
    set penduduk(value) {
        this._penduduk = value;
    }
    get penduduk() {
        return this._penduduk;
    }
    
    suratCollection: any[] = [];
    filteredSurat: any[] = [];
    penduduks: Select2OptionData[] = [];
    
    selectedSurat: any = null;
    selectedPenduduk: any = null;
    bundleData: any = null;
    bundleSchemas: any = null;
    keyword: string = null;
    isFormSuratShown: boolean = false;
    isAutoNumber: boolean = false;
    currentSuratNumber: string = null;

    constructor( private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private dataApiService: DataApiService,
        private sharedService: SharedService,
        private settingsService: SettingsService) {}

    ngOnInit(): void {
        this.bundleSchemas =  { 
            "penduduk": schemas.penduduk,
            "mutasi": schemas.mutasi,
            "log_surat": schemas.logSurat,
            "prodeskel": schemas.prodeskel,
            "nomorSurat": schemas.nomorSurat
        };

        this.load();
        this.loadPenduduks();
    }

    load(): void {
        let dirFile = path.join(__dirname, 'surat_templates');
        let dirs = jetpack.list(dirFile);

        this.suratCollection = [];

        dirs.forEach(dir => {
            let dirPath = path.join(dirFile, dir, dir + '.json');
            try {
                let jsonFile = JSON.parse(jetpack.read(dirPath));
                this.suratCollection.push(jsonFile);
            }
            catch (ex) {
                console.log('Surat error: ', ex, dirPath);
            }
        });

        this.selectedSurat = {
            "name": null,
            "thumbnail": null,
            "path": null,
            "code": null,
            "data": {}
        };

        this.filteredSurat = this.suratCollection;
        this.bundleData = this.dataApiService.getLocalContent(this.bundleSchemas, 'penduduk');
    }

    loadPenduduks(): void {
        let penduduks = this.bundleData['data']['penduduk'];

        penduduks.forEach(penduduk => {
            this.penduduks.push({id: penduduk[0], text: penduduk[1] + ' - ' + penduduk[2]});
        });
    }

    onPendudukSelected(data, type): void {
        let penduduk = this.bundleData.data['penduduk'].filter(e => e[0] === data.id)[0];
        let form = this.selectedSurat.forms.filter(e => e.var === type)[0];

        if (!form)
            return;

        form.value = schemas.arrayToObj(penduduk, schemas.penduduk);
        form.value['umur'] = moment().diff(new Date(form.value.tanggal_lahir), 'years');
    }

    search(): void {
        this.filteredSurat = this.suratCollection
            .filter(e => e.title.toLowerCase()
            .indexOf(this.keyword.toLowerCase()) > -1);
    }

    selectSurat(surat): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;

        if (!this.bundleData['data']['nomorSurat']) {
            this.isAutoNumber = false;
            return false;
        }
            
        this.currentSuratNumber = this.bundleData['data']['nomorSurat'].filter(e => e[0] === this.selectedSurat.code)[0];
        
        let counter = parseInt(this.currentSuratNumber[2]);
        let segmentedFormats = this.currentSuratNumber[1].match(/\<.+?\>/g);
        let result = [];

        for (let i=0; i<segmentedFormats.length; i++) {
            if (nomorSuratFormatter[segmentedFormats[i]])
                result.push(nomorSuratFormatter[segmentedFormats[i]](counter));
            else
                result.push('');
        }

        let suratNumberForm = this.selectedSurat.forms.filter(e => e.var === 'nomor_surat')[0];
        let index = this.selectedSurat.forms.indexOf(suratNumberForm);

        suratNumberForm = this.currentSuratNumber[1].replace(/\<.+?\>/g, result.join('/'));
        
        this.selectedSurat.forms[index]['value'] = suratNumberForm;
        this.isAutoNumber = true;
        
        return false;
    }

    ngOnDestroy(): void {}
}