import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Select2OptionData } from 'ng2-select2';

import * as path from 'path';
import * as jetpack from 'fs-jetpack';

import { DataApiService } from '../stores/dataApiService';
import schemas from '../schemas';

var $ = require('jquery');
var select2 = require('select2');

@Component({
    selector: 'keluarga-selector',
    templateUrl: '../templates/keluargaSelector.html'
})
export class KeluargaSelectorComponent {  
    select2Data: Select2OptionData[];
    selectedKeluarga: any;
    arrayData: any[];

    private _mode;
    private _options;
    private _width;
    private _initialValue;

    @Output()
    onKeluargaSelected: EventEmitter<any> = new EventEmitter<any>();
    
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
    set initialValue(value){
        this._initialValue = value;
    }
    get initialValue(){
        return this._initialValue;
    }

    constructor(private dataApiService: DataApiService) {}

    ngOnInit(): void {        
        let bundleSchemas = { 'penduduk': schemas.penduduk, 'mutasi': schemas.mutasi, 'logSurat': schemas.logSurat };
        let bundle = this.dataApiService.getLocalContent(bundleSchemas, 'penduduk');
 
        this.arrayData = bundle.data['penduduk'];
        this.select2Data = [];

        this.arrayData = this.arrayData.filter(e => e[13] === 'Kepala Keluarga' && e[10]);
        
        for(let i=0; i<this.arrayData.length; i++){
            let item: Select2OptionData = { id: null, text: null };
            item = { id: this.arrayData[i][10], text: this.arrayData[i][10] + '-' + this.arrayData[i][2] }
            this.select2Data.push(item);
        }

        if(!this.initialValue){
            this.selectedKeluarga = null;
            return;
        }
           
        let keluarga = this.select2Data.filter(e => e.id === this.initialValue)[0];
        if(keluarga)
           this.selectedKeluarga = keluarga.id;

    }

    emitSelected(data): any {
        let keluarga = this.select2Data.filter(e => e.id === data.value)[0];
        this.onKeluargaSelected.emit(keluarga); 
    }
}
