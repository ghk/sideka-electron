import { remote } from 'electron'; 
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Select2OptionData } from 'ng2-select2';

import * as path from 'path';
import * as jetpack from 'fs-jetpack';

import DataApiService from '../stores/dataApiService';
import schemas from '../schemas';

@Component({
    selector: 'penduduk-kk-selector',
    templateUrl: '../templates/pendudukKkSelector.html'
})
export default class PendudukKkSelectorComponent {
    optionData: Select2OptionData[];

    bundleSchemas: any;
    bundle: any;
    selectedPenduduk: any;
    
    private _options;
    private _width;
    private _reference;
    private _referenceMethod;
    private _type;

    @Input()
    set options(value){
        this._options = value;
    }
    get options(){
        return this._options
    }

    @Input()
    set width(value){
        this._width = value;
    }
    get width(){
        return this._width;
    }

    @Input()
    set reference(value){
        this._reference = value;
    }
    get reference(){
        return this._reference;
    }

    @Input()
    set referenceMethod(value){
        this._referenceMethod = value;
    }
    get referenceMethod(){
        return this._referenceMethod;
    }

    @Input()
    set type(value){
        this._type = value;
    }
    get type(){
        return this._type;
    }

    @Output()
    onPendudukSelected: EventEmitter<any> = new EventEmitter<any>();

    constructor(private _dataApiService: DataApiService) {}

    ngOnInit(): void {
        this.bundleSchemas = { 'penduduk': schemas.penduduk, 'mutasi': schemas.mutasi,  'logSurat': schemas.logSurat };
        this.bundle = this._dataApiService.getLocalContent(this.bundleSchemas, 'penduduk');
        this.optionData = [];

        this.initData();
    }

    initData(): void {
        let idIndex = schemas.penduduk.findIndex(s => s.field == "id");
        let nikIndex = schemas.penduduk.findIndex(s => s.field == "nik");
        let namaIndex = schemas.penduduk.findIndex(s => s.field == "nama_penduduk");
        let noKkIndex = schemas.penduduk.findIndex(s => s.field == "no_kk");
        let hubunganIndex = schemas.penduduk.findIndex(s => s.field == "hubungan_keluarga");
        let kelaminIndex = schemas.penduduk.findIndex(s => s.field == "jenis_kelamin");
        let namaAyahIndex = schemas.penduduk.findIndex(s => s.field == "nama_ayah");
        let namaIbuIndex = schemas.penduduk.findIndex(s => s.field == "nama_ibu");

        let pendudukDataFromBundle = this.bundle['data']['penduduk'];

        if (this.type === 'penduduk') 
            this.fillPendudukSelector(pendudukDataFromBundle, idIndex, nikIndex, namaIndex);
        else
            this.fillKkSelector(pendudukDataFromBundle, idIndex, noKkIndex, namaAyahIndex, hubunganIndex);

        this.initReference();
    }

    fillPendudukSelector(pendudukData, idIndex, nikIndex, namaIndex): void {
        for (let i=0; i<pendudukData.length; i++){
            this.optionData.push({
                id: pendudukData[i][idIndex], 
                text: pendudukData[i][nikIndex] + '-' + pendudukData[i][namaIndex] 
            });
        }
    }

    fillKkSelector(pendudukData, idIndex, noKkIndex, namaAyahIndex, hubunganIndex) {
        let keluargaCollection = pendudukData.filter(e => e[hubunganIndex] === 'Kepala Keluarga');

        for (let i=0; i<keluargaCollection.length; i++) {
            this.optionData.push({
                id: pendudukData[i][idIndex], 
                text: pendudukData[i][noKkIndex] + '-' + pendudukData[i][namaAyahIndex] 
            });
        }
    }

    initReference(): void {
        let idIndex = schemas.penduduk.findIndex(s => s.field == "id");
        let nikIndex = schemas.penduduk.findIndex(s => s.field == "nik");
        let namaIndex = schemas.penduduk.findIndex(s => s.field == "nama_penduduk");
        let noKkIndex = schemas.penduduk.findIndex(s => s.field == "no_kk");
        let hubunganIndex = schemas.penduduk.findIndex(s => s.field == "hubungan_keluarga");
        let kelaminIndex = schemas.penduduk.findIndex(s => s.field == "jenis_kelamin");
        let namaAyahIndex = schemas.penduduk.findIndex(s => s.field == "nama_ayah");
        let namaIbuIndex = schemas.penduduk.findIndex(s => s.field == "nama_ibu");

        if (!this._reference || !this._referenceMethod){
            this.selectedPenduduk = null;
            return;
        }

        let referencePenduduk = this.bundle.data["penduduk"].find(e => e[idIndex] === this._reference);
        
        if (!referencePenduduk) 
            return;

        let penduduk = null;
        let hubungan = referencePenduduk[hubunganIndex];

        if (this.referenceMethod === 'self')
            penduduk = referencePenduduk;

        if (!penduduk) {
            for(let i = 0, len = this.bundle.data["penduduk"].length; i < len; i++) {
                let pendudukData = this.bundle.data["penduduk"][i];
                let matched = false;
    
                if (pendudukData[idIndex] === this._reference)
                    continue;
    
                if (this.referenceMethod === 'ayah') {
                    matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[namaIndex] == referencePenduduk[namaAyahIndex]  && pendudukData[kelaminIndex] == "Laki-Laki";
    
                    if (!matched && (!hubungan || hubungan.startsWith("Anak"))) {
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == "Kepala Keluarga" && pendudukData[kelaminIndex] == "Laki-Laki";
    
                        if(!matched) 
                            matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == "Suami";     
                    }
    
                    if (!matched && referencePenduduk[hubunganIndex] == "Kepala Keluarga")
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == "Ayah";
                }
                else if (this.referenceMethod === 'ibu') {
                    matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[namaIndex] == referencePenduduk[namaIbuIndex] && pendudukData[kelaminIndex] == "Perempuan";
                    
                    if(!matched && (!hubungan || hubungan.startsWith("Anak"))) {
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == "Kepala Keluarga" && pendudukData[kelaminIndex] == "Perempuan";
    
                        if(!matched)
                            matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == "Istri";
                    }
    
                    if (!matched && referencePenduduk[hubunganIndex] == "Kepala Keluarga")
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == "Ibu";
                }
                else if (this.referenceMethod == 'suami'){
                    if(hubungan == 'Kepala Keluarga')
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == 'Suami' && pendudukData[kelaminIndex] == 'Laki-Laki';
             
                    else if(hubungan == "Istri")
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == 'Kepala Keluarga' && pendudukData[kelaminIndex] == 'Laki-Laki';
                }
                else if (this.referenceMethod == 'istri'){
                    if(hubungan == 'Kepala Keluarga')
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex]  && pendudukData[hubunganIndex] == 'Istri' && pendudukData[kelaminIndex] == 'Perempuan';
    
                    else if(hubungan == "Suami")
                        matched = pendudukData[noKkIndex] == referencePenduduk[noKkIndex] && pendudukData[hubunganIndex] == 'Kepala Keluarga' && pendudukData[kelaminIndex] == 'Perempuan';
                }
    
                if (matched) {
                    this.selectedPenduduk = pendudukData;
                    this.emitSelected({value: this.selectedPenduduk[0]});
                    break;
                }
            }
        }
    }
    
    emitSelected(data): any {
        let penduduk = this.optionData.filter(e => e.id === data.value)[0];
        this.onPendudukSelected.emit(penduduk); 
    }
}