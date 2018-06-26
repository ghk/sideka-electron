import { Component, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';

import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import { Router } from '@angular/router';
import {FIELD_ALIASES, fromSiskeudes, toSiskeudes} from '../stores/siskeudesFieldTransformer';


@Component({
    selector: 'front-perencanaan',
    templateUrl: '../templates/frontPerencanaan.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FrontPerencanaanComponent {
    settingsSubscription: Subscription;
    siskeudesMessage: string;
    visiRpjm: any;    
    isEmptyVisi: boolean;
    model: any;
    settings: any;
    _activeDatabase: any = null;   
    listSiskeudesDb: any[]=[];

    
    set activeDatabase(value){
        this._activeDatabase = value;       
    }

    get activeDatabase(){
        return this._activeDatabase;
    }

    constructor(
        private zone: NgZone,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService,
        private router: Router
    ) {
    }

    ngOnInit(): void {
        this.model = {};
        this.settings = {};
        this.activeDatabase = null;
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => { 
            this.settings = settings;    
            this.listSiskeudesDb = this.settingsService.getListSiskeudesDb();        
        });   
        
    }

    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }

    async getVisi(){
        var data = await this.siskeudesService.getVisi();
        this.zone.run(() => {
            if(data.length == 0)
                this.isEmptyVisi = true;
            else if(data.length == 1){
                let rpjm = data[0];
                this.router.navigate(['/perencanaan'], { queryParams: { 
                    id_visi: rpjm.id_visi, 
                    first_year: rpjm.tahun_akhir, 
                    last_year: rpjm.tahun_awal,
                    path: this.activeDatabase.path
                } });
            }
            else
                this.visiRpjm = data;
        })
    }

    addVisi(model){
        $('#modal-add-visi')['modal']('hide');
        let bundleData = {
            insert: [],
            update: [],
            delete: []
        }
        let content = {
            kode_desa: this.settings['siskeudes.desaCode'],
            tahun_awal: model.tahun_awal,
            tahun_akhir: model.tahun_akhir,
            id_visi: this.settings['siskeudes.desaCode'] + '01.',
            uraian: model.uraian,
            no: '01'
        };
        bundleData.insert.push({
            'Ta_RPJM_Visi': toSiskeudes(content, 'visi')
        })
        this.siskeudesService.saveToSiskeudesDB(bundleData, null, async response =>{
            if(response instanceof Array === false){
                return;
            }
            this.getVisi();
        })
    }
    selectDatabase(db){
        this.activeDatabase = db; 
        this.siskeudesService.setConnection(db.path);      
        this.isEmptyVisi = false;
        this.getVisi();
    }
}