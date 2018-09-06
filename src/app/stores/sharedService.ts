import { remote } from 'electron';
import { Injectable } from '@angular/core';

import * as path from "path";

const jetpack = require('fs-jetpack');

@Injectable()
export class SharedService {
    private _app = remote.app;
    private _dataDir = this._app.getPath('userData');        
    private _feedDir = path.join(this._dataDir, 'feeds');
    private _desas: any;
    private _settings: any;

    constructor() {
    }

    getApp(): Electron.App {
        return this._app;
    }

    getDataDirectory(): string {
        return this._dataDir;
    }

    getFeedDirectory(): string {
        return this._feedDir
    }

    getDesaDirectory(): string {
        var desaId = this.getDesaId() + "";
        return path.join(this._dataDir, "desa", desaId);
    }

    getContentDirectory(): string {
        return path.join(this.getDesaDirectory(), "contents");
    }

    getSettingsFile(): string {
        return path.join(this.getDesaDirectory(), "settings.json");
    }

    getContentFile(type, subType?): string {
        let fileName = subType? type + '_' + subType : type;
        return path.join(this.getContentDirectory(), fileName + '.json');
    }

    getDesas() {
        return this._desas;        
    }

    setDesas(desas): void {
        this._desas = desas;
    }

    private getDesaId(): number {
        let result = null;
        let authFile = path.join(this.getDataDirectory(), "auth.json");

        try {
            if (!jetpack.exists(authFile))
                return null;
            return JSON.parse(jetpack.read(authFile))["desa_id"];
        }
        catch (exception) {
            return null;
        }
    }
}
