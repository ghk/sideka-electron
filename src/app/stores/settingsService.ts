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
        this.dataApiService.getDesa().subscribe(_ => {
            let desaId = this.dataApiService.auth.desa_id;
            if(this.desaId == desaId)
                return;

            this.desaId = desaId;
            this.dataFile = this.sharedService.getSettingsFile();

            if (!jetpack.exists(this.dataFile))
                jetpack.write(this.dataFile, JSON.stringify({}), { atomic: true });
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

    getListSiskeudesDb(){
        let result = [];
        let keys = Object.keys(this.data);
        keys.forEach(key => {
            if(key.search('.path') !== -1){
                let content = {
                    year: key.replace('.path', ''),
                    path: this.data[key],
                };
                result.push(content);
            }
        });
        
        if(result.length === 0)
            return result;
        else
            return result.sort(function (a, b) { return a.year - b.year; });  
    }
}