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

                if(this.selectedKegiatan)
                    this.loadRAB();
            }); 
        });
    }

    loadRAB(): void {
        this.rabCollections = [];

        this.siskeudesService.getRAB(this.year, this.desaCode).then(result => {

             let rabs = result.filter(e => e.Kd_Keg === this.selectedKegiatan.id);
             
             this.rabCollections = this.transformData(rabs);
             this.selectedRab = this.rabCollections.filter(e => e.code === this.initialValues[1])[0];
        });
    }

    transformData(data): any {
        let result = [];

        data.forEach(item => {
            let kelompokCode = item['Kelompok'];
            let existingKelompok = result.filter(e => e.code === kelompokCode)[0];
            let kelompokResult = { code: kelompokCode, label: item['Nama_Kelompok'], anggaran: 0, level: 0 };

            let jenisCode = item['Jenis'];
            let existingJenis = result.filter(e => e.code === jenisCode)[0];
            let jenisResult = { code: jenisCode, label: item['Nama_Jenis'], anggaran: 0, level: 1 };

            let obyekCode = item['Obyek'];
            let existingObyek = result.filter(e => e.code === obyekCode)[0];
            let obyekResult = { code: obyekCode, label: item['Nama_Obyek'], anggaran: 0, level: 2 };

            let rincianCode = item['Obyek_Rincian'];
            let existingRincian = result.filter(e => e.code === rincianCode)[0];
            let rincianResult = { code: rincianCode, label: item['Uraian'], anggaran: item.Anggaran, level: 3 };

            if(!existingKelompok)
                result.push(kelompokResult);
            else
                existingKelompok.anggaran += rincianResult.anggaran;
            if(!existingJenis)
                result.push(jenisResult);
            else
                existingJenis.anggaran += rincianResult.anggaran;
            if(!existingObyek)
                result.push(obyekResult);
            else
                existingObyek.anggaran += rincianResult.anggaran;
            if(!existingRincian)
                result.push(rincianResult);
        });

        return result;
    }

    onChange($event): void {
        this.loadRAB();
    }

    onRabChange($event): void {
        this.onSelected.emit({ 'kegiatan': this.selectedKegiatan.id, 'rab': this.selectedRab.code, 'anggaran': this.selectedRab.anggaran });
    }
}
 
