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
    arrayData: any[];

    private _mode;
    private _options;
    private _width;
    private _initialValue;

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
    set initialValue(value){
        this._initialValue = value;
    }
    get initialValue(){
        return this._initialValue;
    }

    @Input()
    set mode(value){
        this._mode = value;
    }
    get mode(){
        return this._mode;
    }

    constructor(private dataApiService: DataApiService) {}

    ngOnInit(): void {        
        let bundleSchemas = { 'penduduk': schemas.penduduk, 'mutasi': schemas.mutasi, 'logSurat': schemas.logSurat };
        let bundle = this.dataApiService.getLocalContent(bundleSchemas, 'penduduk');
 
        this.arrayData = bundle.data['penduduk'];
        this.select2Data = [];

        if(this.mode === 'kk')
            this.arrayData = this.arrayData.filter(e => e[13] === 'Kepala Keluarga');
        
        for(let i=0; i<this.arrayData.length; i++){
            let item: Select2OptionData = { id: null, text: null };

            if(this.mode === 'kk')
                item = { id: this.arrayData[i][10], text: this.arrayData[i][10] + '-' + this.arrayData[i][2] }
            else if (this.mode === 'penduduk')
                item = { id: this.arrayData[i][0], text: this.arrayData[i][1] + '-' + this.arrayData[i][2] };

            this.select2Data.push(item);
        }

        if(!this.initialValue){
            this.selectedPenduduk = null;
            return;
        }
           
        let currentPenduduk = this.select2Data.filter(e => e.id === this.initialValue)[0];

        if(currentPenduduk)
           this.selectedPenduduk = currentPenduduk.id;
    }

    emitSelected(data): any {
        let penduduk = this.select2Data.filter(e => e.id === data.value)[0];
        this.onPendudukSelected.emit(penduduk); 
    }
}
