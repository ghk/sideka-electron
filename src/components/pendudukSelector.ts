import { remote } from 'electron';
import { Component, Input, Output, EventEmitter } from "@angular/core";
import DataApiService from '../stores/dataApiService';

import * as path from 'path';
import * as jetpack from 'fs-jetpack';

import schemas from '../schemas';

@Component({
    selector: 'penduduk-selector',
    templateUrl: 'templates/pendudukSelector.html'
})
export default class PendudukSelectorComponent {
    private _keywords: string;
    private _selected: any[];
    private _penduduk: any[][];

    @Output()
    selected: EventEmitter<any> = new EventEmitter<any>();

    constructor(private dataApiService: DataApiService) { 
    }

    ngOnInit(): void {        
        this.getPenduduk();
    }

    emitSelected(): void {
        this.selected.emit(this._selected);
    }

    getPenduduk(): any {
        let bundleSchemas = { 'penduduk': schemas.penduduk, 'mutasi': schemas.mutasi, 'logSurat': schemas.logSurat };
        let bundle = this.dataApiService.getLocalContent('penduduk', bundleSchemas);
        this._penduduk = bundle.data['penduduk'];
    }

    searchPenduduk(): any {       
        let result = [];

        if (this._keywords.length < 3)
            return result;

        let foundInIndex = [];
        this._penduduk.forEach((pendudukArr, index) => {
            if (this.searchStringInArray(this._keywords, pendudukArr) > -1) {
                if (foundInIndex.indexOf(index) === -1)
                    foundInIndex.push(index);
            }
        })
        
        foundInIndex.forEach(index => {
            result.push(this._penduduk[index]);
        })

        return result;
    }

    addSelection(penduduk: any) {
        this._selected.push(penduduk);
    }

    private searchStringInArray (str, strArray) {
        for (var j=0; j<strArray.length; j++) {
            if (strArray[j].match(str)) return j;
        }
        return -1;
    }
}
