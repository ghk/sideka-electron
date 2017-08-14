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
    selectedPenduduks: Select2OptionData[];
    options: any;
    result: Select2OptionData[];
    keyword: string;

    @Output()
    selected: EventEmitter<any> = new EventEmitter<any>();

    constructor(private dataApiService: DataApiService) { 
    }

    ngOnInit(): void {        
        this.getPenduduk();
        this.options = { multiple: true };
        this.selectedPenduduks = [];
    }

    emitSelected(): void {
        this.selected.emit(this.selectedPenduduks);
    }

    getPenduduk(): any {
        let bundleSchemas = { 'penduduk': schemas.penduduk, 'mutasi': schemas.mutasi, 'logSurat': schemas.logSurat };
        let bundle = this.dataApiService.getLocalContent('penduduk', bundleSchemas);

        this.result = [];

        for(let i=0; i<bundle.data['penduduk'].length; i++){
            this.result.push({
                id: i.toString(),
                text: bundle.data['penduduk'][i][1] + ' - ' + bundle.data['penduduk'][i][2]
            });
        }
    }
}
