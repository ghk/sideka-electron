import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Select2OptionData } from 'ng2-select2';

import * as path from 'path';
import * as jetpack from 'fs-jetpack';

import schemas from '../schemas';
import SiskeudesService from '../stores/siskeudesService';

var $ = require('jquery');
var select2 = require('select2');

interface ITree {
    parent: any;
    children: any[];
}

@Component({
    selector: 'anggaran-selector',
    templateUrl: 'templates/anggaranSelector.html'
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

    kegiatanCollections: any[];
    rabCollections: any[];

    selectedKegiatan: any;
    selectedRab: any;

    constructor(private siskeudesService: SiskeudesService) {}

    ngOnInit(): void {
        this.kegiatanCollections = [];

        this.siskeudesService.getTaKegiatan(this.year, this.desaCode).then(result => {
            result.forEach(item => {
                this.kegiatanCollections.push({
                    id: item.kode_kegiatan,
                    label: item.nama_kegiatan
                });

                this.selectedKegiatan = this.kegiatanCollections.filter(e => e.id === this.initialValues[0])[0];
                this.loadRAB();
            }); 
        });
    }

    loadRAB(): void {
        this.rabCollections = [];

        this.siskeudesService.getRAB(this.year, this.desaCode).then(result => {
             window['rab'] = result;

             let rabs = result.filter(e => e.Kd_Keg === this.selectedKegiatan.id);
          
             rabs.forEach(rab => {
                 this.rabCollections.push({ id: rab.Obyek_Rincian, label: rab.Uraian, anggaran: rab.Anggaran });
             });

             this.selectedRab = this.rabCollections.filter(e => e.id === this.initialValues[1])[0];
        });
    }

    onChange($event): void {
        this.loadRAB();
    }

    onRabChange($event): void {
        this.onSelected.emit({ 'kegiatan': this.selectedKegiatan.id, 'rab': this.selectedRab.id, 'anggaran': this.selectedRab.anggaran });
    }
}
 