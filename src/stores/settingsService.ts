import { Injectable } from '@angular/core';
import { remote } from "electron";

import * as path from 'path';
import * as jetpack from 'fs-jetpack';

import SharedService from './sharedService';

@Injectable()
export default class SettingsService {
    private dataFile: string;
    private data: any = {};

    constructor(private sharedService: SharedService) {
        this.dataFile = path.join(this.sharedService.getDataDirectory(), "settings.json");
        if (!jetpack.exists(this.dataFile))
            return;
        this.data = JSON.parse(jetpack.read(this.dataFile));
    }

    get(key) {
        return this.data[key];
    }

    getAll() {
        return this.data;
    }

    set(key, value) {
        this.data[key] = value;
        jetpack.write(this.dataFile, JSON.stringify(this.data));
    }

    setAll(dict) {
        for (let key in dict) {
            this.data[key] = dict[key];
        }
        jetpack.write(this.dataFile, JSON.stringify(this.data));
    }
}