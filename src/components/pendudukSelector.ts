import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";
import DataApiService from '../stores/dataApiService';

import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import schemas from '../schemas';
import { Select2OptionData } from 'ng2-select2';

var $ = require('jquery');
var select2 = require('select2');

@Component({
    selector: 'penduduk-selector',
    templateUrl: 'templates/pendudukSelector.html'
})
export default class PendudukSelectorComponent {  
    select2Data: Select2OptionData[];
    selectedPenduduk: any;
    keyword: string;
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
        let bundle = this.dataApiService.getLocalContent('penduduk', bundleSchemas);
        let idIndex = 0;

        this.arrayData = bundle.data['penduduk'];
        this.select2Data = [];

        if(this.mode === 'kk'){
            this.arrayData = this.arrayData.filter(e => e[25] === 'Kepala Keluarga');
            idIndex = 22;
        }

        for(let i=0; i<this.arrayData.length; i++){
            this.select2Data.push({
                id: this.arrayData[i][idIndex],
                text: this.arrayData[i][idIndex]
            });
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
