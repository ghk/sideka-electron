import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core'
import { PersistablePage } from '../pages/persistablePage';

import * as path from 'path';
import { remote } from 'electron';

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

    @Input()
    set page(value){
        this._page = value;
        if(value){
            let jsonFile = path.join(CONTENT_DIR, this._page.type + '.json');
            this._fileStat = jetpack.inspect(jsonFile);
        }
    }
    get page(){
        return this._page;
    }

    get type(){
        return pageTypes[this._page.type];
    }

    get size(){
        let size = this._fileStat ? this._fileStat.size : 0;
        if (size > 1000000){
            size = (size / 1000000).toFixed(2) + " MB";
        } else if (size > 1000){
            size = (size / 1000).toFixed(2) +" KB";
        } else {
            size = size +" B";
        }
        return size;
    }
}