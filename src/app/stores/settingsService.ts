import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';
import * as jetpack from 'fs-jetpack';
import SharedService from './sharedService';

var writeFileAtomicSync = require('write-file-atomic').sync;

@Injectable()
export default class SettingsService {
    private dataFile: string;
    private data: any = {};
    private data$: ReplaySubject<any> = new ReplaySubject<any>(1);

    constructor(private sharedService: SharedService) {
        this.dataFile = this.sharedService.getSettingsFile();
        if (!jetpack.exists(this.dataFile))
            return;
        this.data = JSON.parse(jetpack.read(this.dataFile));
        this.data$.next(this.data);
    }

    get(key) {
        return this.data[key];
    }

    getAll(): Observable<any> {
        return this.data$;
    }

    set(key, value) {
        this.data[key] = value;
        writeFileAtomicSync(this.dataFile, JSON.stringify(this.data));
        this.data$.next(this.data);
    }

    setAll(dict) {
        for (let key in dict) {
            this.data[key] = dict[key];
        }
        writeFileAtomicSync(this.dataFile, JSON.stringify(this.data));
        this.data$.next(this.data);
    }
}