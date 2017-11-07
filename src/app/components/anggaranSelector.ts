import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Select2OptionData } from 'ng2-select2';

import * as path from 'path';
import * as jetpack from 'fs-jetpack';

import schemas from '../schemas';
import SiskeudesService from '../stores/siskeudesService';
import { PenganggaranContentManager } from '../stores/siskeudesContentManager';
import SettingsService from '../stores/settingsService';

var $ = require('jquery');
var select2 = require('select2');

interface ITree {
    parent: any;
    children: any[];
}

@Component({
    selector: 'anggaran-selector',
    templateUrl: '../templates/anggaranSelector.html'
})
export default class AnggaranSelectorComponent {
    private _year;
    private _desaCode;
    private _initialValues;

    @Output()
    onSelected: EventEmitter<any> = new EventEmitter<any>();

    @Input()
    set year(value){
        this._year = value;
    }
    get year(){
        return this._year;
    }

    @Input()
    set desaCode(value){
        this._desaCode = value;
    }
    get desaCode(){
        return this._desaCode;
    }

    @Input()
    set initialValues(value){
        this._initialValues = value;
    }
    get initialValues(){
        return this._initialValues;
    }

    contents : any;
    kegiatanCollections: any[];
    rabCollections: any[];

    selectedKegiatan: any;
    selectedRab: any;
    pengaggaranContentManager: PenganggaranContentManager;

    constructor(private siskeudesService: SiskeudesService, private settingsService: SettingsService) {
    }

    ngOnInit(): void {
       this.load();
    }

    async load(){
        let desa = await this.getDesa();
        this.pengaggaranContentManager = new PenganggaranContentManager(this.siskeudesService, desa, null);
        this.contents  = await this.pengaggaranContentManager.getContents();
        console.log(this.contents);
        this.kegiatanCollections = this.contents["kegiatan"];

        if(this.initialValues) {
            this.selectedKegiatan = this.kegiatanCollections.filter(e => e[3]=== this.initialValues[0])[0];

            if(this.selectedKegiatan) {
                this.loadRAB();
                this.selectedRab = this.rabCollections.filter(e => e[1] === this.initialValues[1])[0];
            }
        }
    }

    private async getDesa(): Promise<any>{
        let kodeDesa =  this.settingsService.get("siskeudes.desaCode");
        if(!kodeDesa)
            return null;
        let desas = await this.siskeudesService.getTaDesa();
        return desas[0];
    }

    loadRAB(): void {
        this.rabCollections = this.contents["rab"].filter(e => e[2] === this.selectedKegiatan[3]);
    }

    onChange($event): void {
        this.loadRAB();
    }

    onRabChange($event): void {
        if(this.selectedKegiatan)
            this.onSelected.emit({ 'kegiatan': this.selectedKegiatan[3], 'rab': this.selectedRab[1], 'anggaran': this.selectedRab[8] });
    }
}
 
