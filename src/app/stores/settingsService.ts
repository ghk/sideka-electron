import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';
import * as jetpack from 'fs-jetpack';
import SharedService from './sharedService';

@Injectable()
export default class SettingsService {
    private dataFile: string;
    private data: any = {};
    private data$: ReplaySubject<any> = new ReplaySubject<any>(1);

    private defaultSettings = {"siskeudes.autoSync": true};
    private renamedSettings = {"siskeudes.desaCode": "kodeDesa"};

    constructor(private sharedService: SharedService) {
        this.dataFile = this.sharedService.getSettingsFile();
        if (!jetpack.exists(this.dataFile))
            jetpack.write(this.dataFile, JSON.stringify(this.data), { atomic: true });
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
        jetpack.write(this.dataFile, JSON.stringify(this.data), { atomic: true });
        this.data$.next(this.data);
    }

    setAll(dict) {
        for (let key in dict) {
            this.data[key] = dict[key];
        }
        jetpack.write(this.dataFile, JSON.stringify(this.data), { atomic: true });
        this.data$.next(this.data);
    }
}