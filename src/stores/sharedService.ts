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
    private _pendudukFile = path.join(this._contentDir, 'penduduk.json');
    private _penerimaanFile = path.join(this._contentDir, 'penerimaan.json');
    private _pemetaanFile = path.join(this._contentDir, 'pemetaan.json');
    private _perencanaanFile = path.join(this._contentDir, 'perencanaan.json');
    private _penganggaranFile = path.join(this._contentDir, 'penganggaran.json');
    private _penatausahaanFile = path.join(this._contentDir, 'penatausahaan.json');
    private _centerFile = path.join(this._contentDir, 'center.json');
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

    getPendudukFile(): string {
        return this._pendudukFile;
    }

    getPemetaanFile(): string {
        return this._pemetaanFile;
    }

    getPenerimaanFile(): string {
        return this._penerimaanFile;
    }

    getPerencanaanFile(): string {
        return this._perencanaanFile;
    }

    getPenganggaranFile(): string {
        return this._penganggaranFile;
    }

    getPenatausahaanFile(): string {
        return this._penatausahaanFile;
    }

    getCenterFile(): string {
        return this._centerFile;
    }

    getSubTypeFile(type, subType): string {
        let fileName = type + '_' + subType;
        return path.join(this._contentDir, fileName + '.json');
    }

    getDesas() {
        return this._desas;        
    }

    setDesas(desas): void {
        this._desas = desas;
    }
}
