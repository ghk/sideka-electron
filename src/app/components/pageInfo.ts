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

    public openDataStatus;

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

    public recalculate(){
        if(this._page){
            let jsonFile = this._sharedService.getContentFile(this._page.type, this._page.subType);
            this._fileStat = jetpack.inspect(jsonFile);
            if(this._fileStat){
                this.size = this.toSizeString(this._fileStat.size);
            }
            
            this.type = pageTypes[this._page.type];
            if(!this.type){
                this.type = this._page.type.charAt(0).toUpperCase() + this._page.type.slice(1);
            }

            let localContent = this._dataApiService.getLocalContent(this._page.bundleSchemas, this._page.type, this._page.subType);
            this.version = "v"+localContent.changeId;
            let changes = 0;
            Object.keys(this.page.bundleSchemas).forEach(key => {
                if(localContent.diffs[key]){
                    changes += localContent.diffs[key].length;
                }
            });
            this.localChanges = changes ? changes + " perubahan" : "Tidak ada perubahan";

            this.openDataStatus = "Memuat...";
            this._dataApiService.getContentInfo(this._page.type, this._page.subType, localContent.changeId, null).subscribe(contentInfo => {
                if(contentInfo.opendata_date_pushed){
                    this.openDataStatus = "Telah diterbitkan ("+contentInfo.opendata_date_pushed+")";
                } else if(contentInfo.opendata_push_error){
                    this.openDataStatus = "Galat ketika diterbitkan ("+contentInfo.opendata_push_error+")";
                } else {
                    this.openDataStatus = "Belum diterbitkan";
                }
            }, err => {
                this.openDataStatus = "Tidak bisa memuat status dari server";
            });
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