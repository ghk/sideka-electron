import * as path from 'path';
import * as os from 'os';
import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { remote } from "electron";

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/map';

import env from '../env';
import schemas from "../schemas";
import { DiffTracker } from '../helpers/diffTracker';
import settings from '../stores/settings';
import { Siskeudes } from '../stores/siskeudes';

var jetpack = require('fs-jetpack');
var pjson = require("./package.json");

const APP = remote.app;
const SERVER = "http://10.10.10.107:5001";
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DATA_TYPE_DIRS = {
    "penduduk": 'penduduk',
    "logSurat": 'penduduk',
    "mutasi": 'penduduk',
    "perencanaan": 'perencanaan',
    "renstra": 'perencanaan',
    "rpjm": 'perencanaan',
    "rkp1": 'perencanaan',
    "rkp2": 'perencanaan',
    "rkp3": 'perencanaan',
    "rkp4": 'perencanaan',
    "rkp5": 'perencanaan',
    "rkp6": 'perencanaan',
    "mapping": 'mapping',
    "pbdtRt": 'kemiskinan',
    "pbdtIdv": 'kemiskinan'
};

interface BundleData {
    [key: string]: any[]
}

interface DiffItem {
    added: any[],
    modified: any[],
    deleted: any[],
    total: number
}

interface BundleDiffs {
    [key: string]: DiffItem[]
}

interface Bundle {
    apiVersion: number,
    changeId: number,
    columns: { [key: string]: string[] },
    data: BundleData,
    diffs: BundleDiffs,
    createdBy?: string,
    modifiedBy?: string,
    createdTimestamp?: number,
    modifiedTimestamp?: number
}

@Injectable()
export default class DataApiService {

    diffTracker: DiffTracker;

    constructor(private http: Http) {
        this.diffTracker = new DiffTracker();
    }

    getActiveAuth(): any {
        let result = null;
        let authFile = path.join(DATA_DIR, "auth.json");

        try {
            if (!jetpack.exists(authFile))
                return result;
            return JSON.parse(jetpack.read(authFile));
        } catch (exception) {
            return null;
        }
    }

    getHttpHeaders(auth: any): Headers {
        let httpHeaders = new Headers();
        let token = null;
        
        if (auth && auth['token']) {
            token = auth['token'].trim();
            httpHeaders.append("X-Auth-Token", token);
        }

        httpHeaders.append("X-Sideka-Version", pjson.version);        
        return httpHeaders;
    }

    getOfflineDesa(): Observable<any> {
        let results = [];
        let fileName = path.join(DATA_DIR, "desa.json");

        try {
            if (jetpack.exists(fileName))
                results = JSON.parse(jetpack.read(fileName));
            return Observable.of(results);
        } catch (exception) {
            return this.handleError(exception);
        }
    }

    getDesa(): Observable<any> {
        let url = SERVER + '/desa';
        let headers = this.getHttpHeaders(this.getActiveAuth());
        let options = new RequestOptions({ headers: headers });

        return this.http.get(url)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getContent(dataType, subType, bundleData, bundleSchemas): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });        
        let type: string = DATA_TYPE_DIRS[dataType];
        let bundle = this.getLocalContent(type, bundleSchemas);
        let currentChangeId = bundle.changeId ? bundle.changeId : 0;

        let url = SERVER + "/content/2.0/" + auth['desa_id'] + "/" + type + "/" + dataType;
        if (subType)
            url += "/" + subType;
        url += "?changeId=" + currentChangeId;
        
        return this.http.get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getLocalContent(type, bundleSchemas): Bundle {
        let bundle: Bundle = null;
        let jsonFile = path.join(CONTENT_DIR, type + '.json');
        try {
            bundle = this.transformBundle(JSON.parse(jetpack.read(jsonFile)), type, bundleSchemas);
        }
        catch (exception) {
            bundle = this.transformBundle(null, null, bundleSchemas);
        }
        return bundle;
    }

    mergeContent(serverData, localData, dataType): any {
        let diffs = localData['diffs'][dataType];
        if (serverData['diffs']) {
            diffs = diffs.concat(serverData['diffs']);
        }
        else if (serverData['data'] && dataType === 'penduduk') {
            localData.data = serverData['data'];
        }
        localData.changeId = serverData.change_id;
        localData.data[dataType] = this.mergeDiffs(diffs, localData.data[dataType]);
        return localData;
    }

    login(user, password): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });        

        let info = os.type() + ' ' + os.platform() + ' ' + os.release() + ' ' + os.arch() + ' ' + os.hostname() + ' ' + os.totalmem();
        let url = SERVER + '/login';
        let json = { "user": user, "password": password, "info": info };

        return this.http.post(url, json, options)
            .map(res => res.json())
            .map(auth => {
                if (!auth.success)
                    this.handleError('Gagal Login');
            })
            .catch(this.handleError)     
    }

    logout(): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });                
        let url = SERVER + "/logout";

        try {
            this.saveActiveAuth(null);
        } catch (exception) {
            return this.handleError(exception);
        }
        
        return this.http.get(url, options).catch(this.handleError);
    }

    checkAuth(): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let url = SERVER + "/check_auth/" + auth['desa_id'];
        let options = new RequestOptions({ headers: headers });
        return this.http.get(url, options)
            .map(res => res.json())
            .catch(this.handleError);        
    }

    saveActiveAuth(auth): void {
        let authFile = path.join(DATA_DIR, "auth.json");
        if (auth)
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    }

    private mergeDiffs(diffs: DiffItem[], data: any[]): any[] {
        for (let i = 0; i < diffs.length; i++) {
            let diffItem: DiffItem = diffs[i];

            for (let j = 0; j < diffItem.added.length; j++) {
                let dataItem: any[] = diffItem.added[j];
                let existingData = data.filter(e => e[0] === dataItem[0])[0];

                if (!existingData)
                    data.push(dataItem);
            }

            for (let j = 0; j < diffItem.modified.length; j++) {
                let dataItem: any[] = diffItem.modified[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k][0] === dataItem[0]) {
                        data[k] = dataItem;
                    }
                }
            }

            for (let j = 0; j < diffItem.deleted.length; j++) {
                let dataItem: any[] = diffItem.deleted[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k][0] === dataItem[0]) {
                        data.splice(k, 1);
                        break;
                    }
                }
            }
        }

        return data;
    }

    private transformBundle(bundle, type, schemas): Bundle {
        let keys = Object.keys(schemas);
        let columns = {};
        let data = {};

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            columns[key] = schemas[key].map(s => s.field);
            data[key] = [];
        }

        let result: Bundle = {
            apiVersion: 2,
            changeId: 0,
            columns: columns,
            data: data,
            diffs: data
        }

        if (bundle === null)
            return result;

        switch (type) {
            case 'penduduk':
                if (bundle['data'] instanceof Array) {
                    result.data.penduduk = bundle['data'];
                } else {
                    result = bundle;
                }
                break;
            default:
                result = bundle;
                break;
        }

        result['apiVersion'] = 2;
        return result;
    }

    private handleError(error: Response | any) {
        let errMsg: string;
        if (error instanceof Response) {
            const body = error.json() || '';
            const err = body.error || JSON.stringify(body);
            errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
        } else {
            errMsg = error.message ? error.message : error.toString();
        }
        console.error(errMsg);
        return Observable.throw(errMsg);
    }
}

class MetadataHandler {
    static rmDirContents(dirPath): void {        
        try { var files = jetpack.list(dirPath); }
        catch (e) { return; }

        if (files.length <= 0)
            return;

        for (var i = 0; i < files.length; i++) {
            var filePath = path.join(dirPath, files[i]);
            if (jetpack.exist(filePath) === 'file')
                jetpack.remove(filePath);
        }
    }

    static getMetadatas(): any {
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        if (!jetpack.exists(fileName)) {
            jetpack.write(fileName, JSON.stringify({}));
        }
        return JSON.parse(jetpack.read(fileName));
    }

    static getContentMetadata(key): any {
        let metas = MetadataHandler.getMetadatas();
        return metas[key];
    }

    static setContentMetadata(key, value): void {
        let metas = MetadataHandler.getMetadatas();
        metas[key] = value;
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas));
    }
}
