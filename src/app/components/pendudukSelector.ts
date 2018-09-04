import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Select2OptionData } from 'ng2-select2';

import * as path from 'path';
import * as jetpack from 'fs-jetpack';

import DataApiService from '../stores/dataApiService';
import schemas from '../schemas';

var $ = require('jquery');
var select2 = require('select2');

@Component({
    selector: 'penduduk-selector',
    templateUrl: '../templates/pendudukSelector.html'
})
export default class PendudukSelectorComponent {  
    select2Data: Select2OptionData[];
    selectedPenduduk: any;

    pendudukArr: any[];

    arrayData: any[];

    private _options;
    private _width;
    private _reference;
    private _referenceMethod;

    @Output()
    onPendudukSelected: EventEmitter<any> = new EventEmitter<any>();
    
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

    constructor(private dataApiService: DataApiService) {}

    ngOnInit(): void {        
        let bundleSchemas = { 
            'penduduk': schemas.penduduk, 
            'mutasi': schemas.mutasi, 
            'logSurat': schemas.logSurat 
        };

        let bundle = this.dataApiService.getLocalContent(bundleSchemas, 'penduduk');

        let idIndex = schemas.penduduk.findIndex(s => s.field == "id");
        let nikIndex = schemas.penduduk.findIndex(s => s.field == "nik");
        let namaIndex = schemas.penduduk.findIndex(s => s.field == "nama_penduduk");
        let noKkIndex = schemas.penduduk.findIndex(s => s.field == "no_kk");
        let hubunganIndex = schemas.penduduk.findIndex(s => s.field == "hubungan_keluarga");
        let kelaminIndex = schemas.penduduk.findIndex(s => s.field == "jenis_kelamin");
        let namaAyahIndex = schemas.penduduk.findIndex(s => s.field == "nama_ayah");
        let namaIbuIndex = schemas.penduduk.findIndex(s => s.field == "nama_ibu");

        function isAnak(hubungan){
            return hubungan && hubungan.startsWith("Anak");
        }

        this.arrayData = bundle.data['penduduk'];
        this.select2Data = [];

        for(let i=0; i<this.arrayData.length; i++){
            let item: Select2OptionData = { id: null, text: null };
            item = { id: this.arrayData[i][idIndex], text: this.arrayData[i][nikIndex] + '-' + this.arrayData[i][namaIndex] };
            this.select2Data.push(item);
        }

        if(!this._reference || !this._referenceMethod){
            this.selectedPenduduk = null;
            return;
        }
        let referencePenduduk = bundle.data["penduduk"].find(e => e[idIndex] === this._reference);
        if(referencePenduduk){
            let penduduk = null;
            let hubungan = referencePenduduk[hubunganIndex];
            if(this.referenceMethod == "self"){
                penduduk = referencePenduduk;
            }  else if (this.referenceMethod == "suami" && referencePenduduk[kelaminIndex] == "Laki-Laki"){
                penduduk = referencePenduduk;
            }  else if (this.referenceMethod == "istri" && referencePenduduk[kelaminIndex] == "Perempuan"){
                penduduk = referencePenduduk;
            }
            if (!penduduk) {
                for(var i = 0, len = bundle.data["penduduk"].length; i < len; i++){
                    let e = bundle.data["penduduk"][i];
                    if(e[idIndex] == this._reference)
                        continue;

                    let matched = false;
                    if(this.referenceMethod == "ayah"){
                        matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                            && e[namaIndex] == referencePenduduk[namaAyahIndex] 
                            && e[kelaminIndex] == "Laki-Laki";
                        if(!matched && (!hubungan || hubungan.startsWith("Anak"))){
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                && e[hubunganIndex] == "Kepala Keluarga"
                                && e[kelaminIndex] == "Laki-Laki";
                            if(!matched){
                                matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                    && e[hubunganIndex] == "Suami";
                            }
                        }
                        if(!matched && referencePenduduk[hubunganIndex] == "Kepala Keluarga")
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] && e[hubunganIndex] == "Ayah";
                    } else if (this.referenceMethod == "ibu"){
                        matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                            && e[namaIndex] == referencePenduduk[namaIbuIndex] 
                            && e[kelaminIndex] == "Perempuan";
                        if(!matched && (!hubungan || hubungan.startsWith("Anak"))){
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                && e[hubunganIndex] == "Kepala Keluarga"
                                && e[kelaminIndex] == "Perempuan";
                            if(!matched){
                                matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                && e[hubunganIndex] == "Istri";
                            }
                        }
                        if(!matched && referencePenduduk[hubunganIndex] == "Kepala Keluarga")
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] && e[hubunganIndex] == "Ibu";
                    } else if(this.referenceMethod == "suami"){
                        if(hubungan == "Kepala Keluarga"){
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                && e[hubunganIndex] == "Suami"
                                && e[kelaminIndex] == "Laki-Laki";
                        } else if(hubungan == "Istri"){
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                && e[hubunganIndex] == "Kepala Keluarga"
                                && e[kelaminIndex] == "Laki-Laki";
                        }
                    } else if (this.referenceMethod == "istri"){
                        if(hubungan == "Kepala Keluarga"){
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                && e[hubunganIndex] == "Istri"
                                && e[kelaminIndex] == "Perempuan";
                        } else if(hubungan == "Suami"){
                            matched = e[noKkIndex] == referencePenduduk[noKkIndex] 
                                && e[hubunganIndex] == "Kepala Keluarga"
                                && e[kelaminIndex] == "Perempuan";
                        }
                    }

                    if(matched){
                        penduduk = e;
                        break;
                    }
                }
            }
            this.selectedPenduduk = penduduk;
        }

    }

    isAnak(relation): boolean {
        return relation && relation.startsWith("Anak");
    }

    emitSelected(data): any {
        let penduduk = this.select2Data.filter(e => e.id === data.value)[0];
        this.onPendudukSelected.emit(penduduk); 
    }
}
