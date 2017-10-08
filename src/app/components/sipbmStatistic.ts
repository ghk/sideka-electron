import { remote } from 'electron';
import { Component, NgZone, ViewContainerRef, Input, Output, EventEmitter } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';

import * as path from 'path';
import * as fs from 'fs';


@Component({
    selector: 'sipbm-statistic',
    templateUrl: '../templates/sipbmStatistic.html',
})

export default class SipbmStatisticComponent {
    private _hot;
    private _penduduks;

    @Input()
    set hot(value) {
        this._hot = value;
    }
    get hot() {
        return this._hot;
    }

    @Input()
    set penduduk(value) {
        this._penduduks = value;
    }
    get penduduk() {
        return this._penduduks;
    }
    constructor() { }

    ngOnInit() {     
        console.log('masuk sini')   
    }
    
}