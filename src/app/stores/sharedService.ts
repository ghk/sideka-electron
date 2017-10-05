import { remote } from 'electron';
import { Injectable } from '@angular/core';

import * as path from "path";

@Injectable()
export default class SharedService {
    private _app = remote.app;
    private _dataDir = this._app.getPath('userData');        
    private _feedDir = path.join(this._dataDir, 'feeds');
    private _contentDir = path.join(this._dataDir, 'contents');
    private _settingsFile = path.join(this._dataDir, 'settings.json');
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

    getContentDirectory(): string {
        return this._contentDir;
    }

    getSettingsFile(): string {
        return this._settingsFile;
    }

    getContentFile(type, subType?): string {
        let fileName = subType? type + '_' + subType : type;
        return path.join(this._contentDir, fileName + '.json');
    }

    getDesas() {
        return this._desas;        
    }

    setDesas(desas): void {
        this._desas = desas;
    }
}
