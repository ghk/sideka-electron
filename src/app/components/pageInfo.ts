import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core'
import { PersistablePage } from '../pages/persistablePage';

import * as path from 'path';
import { remote } from 'electron';
import SharedService from '../stores/sharedService';
import DataApiService from '../stores/dataApiService';

const jetpack = require('fs-jetpack');

const APP = remote.app;
const DATA_DIR = APP.getPath('userData');
const CONTENT_DIR = path.join(DATA_DIR, 'contents');

let pageTypes = {
    "penduduk": "Kependudukan",
    "penganggaran": "Pengaggaran",
}

@Component({
    selector: 'page-info',
    templateUrl: '../templates/pageInfo.html'
})
export default class PageInfoComponent {
    private _page: PersistablePage;
    private _fileStat;
    
    public size;
    public type;

    public version;

    public localChanges;

    constructor(
        private _sharedService: SharedService,
        private _dataApiService: DataApiService){
    }

    @Input()
    set page(value){
        this._page = value;
        this.recalculate();
    }
    get page(){
        return this._page;
    }

    private recalculate(){
        if(this._page){
            let jsonFile = this._sharedService.getContentFile(this._page.type);
            this._fileStat = jetpack.inspect(jsonFile);
            this.size = this.toSizeString(this._fileStat.size);

            this.type = pageTypes[this._page.type];
            if(!this.type){
                this.type = this._page.type.charAt(0).toUpperCase() + this._page.type.slice(1);
            }

            let localContent = this._dataApiService.getLocalContent(this._page.type, this._page.bundleSchemas);
            this.version = "v"+localContent.changeId;
            let changes = 0;
            Object.keys(this.page.bundleSchemas).forEach(key => {
                if(localContent.diffs[key]){
                    changes += localContent.diffs[key].length;
                }
            });
            this.localChanges = changes ? changes + " perubahan" : "Tidak ada perubahan";
        }
    }

    private toSizeString(size){
        size = size ? size : 0;
        let result = null;
        if (size > 1000000){
            result = (size / 1000000).toFixed(2) + " MB";
        } else if (size > 1000){
            result = (size / 1000).toFixed(2) +" KB";
        } else {
            result = size +" B";
        }
        return result;
    }
}