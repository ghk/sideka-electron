import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';
import * as jetpack from 'fs-jetpack';
import SharedService from './sharedService';
import DataApiService from './dataApiService';

@Injectable()
export default class SettingsService {
    private desaId = null;
    private dataFile: string;
    private data: any = {};
    private data$: ReplaySubject<any> = new ReplaySubject<any>(1);

    private defaultSettings = {"siskeudes.autoSync": true};

    constructor(private sharedService: SharedService, private dataApiService: DataApiService) {
        this.dataApiService.getDesa().subscribe(desa => {
            let desaId = desa ? desa.blogId : null;
            this.dataFile = this.sharedService.getSettingsFile();
            if(this.desaId == desaId)
                return;
            this.desaId = desaId;
            

            if (!jetpack.exists(this.dataFile))
                jetpack.write(this.dataFile, JSON.stringify(this.data), { atomic: true });
            this.data = JSON.parse(jetpack.read(this.dataFile));

            let defaultWritten = false;
            for(let key of Object.keys(this.defaultSettings)){
                if(!this.data.hasOwnProperty(key)){
                    this.data[key] = this.defaultSettings[key];
                    defaultWritten = true;
                }
            }
            if(defaultWritten){
                jetpack.write(this.dataFile, JSON.stringify(this.data), { atomic: true });
            }

            this.data$.next(this.data);
        });

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