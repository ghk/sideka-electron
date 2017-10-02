import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { Response, Headers, RequestOptions } from '@angular/http';
import { ProgressHttp } from 'angular-progress-http';
import { Observable, ReplaySubject } from 'rxjs';
import { BundleData, BundleDiffs, Bundle, DiffItem } from './bundle';
import { DiffTracker } from '../helpers/diffTracker';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/map';

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import schemas from '../schemas';

const uuid = require('uuid');
const base64 = require('uuid-base64');
const jetpack = require('fs-jetpack');
const pjson = require('../../../package.json');
const storeSettings = require('../storeSettings.json');

declare var ENV: string;
let SERVER = storeSettings.live_api_url;
if (ENV !== 'production') {
    SERVER = storeSettings.ckan_api_url;
}

const APP = remote.app;
const DATA_DIR = APP.getPath('userData');
const CONTENT_DIR = path.join(DATA_DIR, 'contents');

@Injectable()
export default class DataApiService {
    public diffTracker: DiffTracker;
    private _desa = new ReplaySubject<any>(1);

    constructor(private http: ProgressHttp) {
        this.diffTracker = new DiffTracker();
    }

    getLocalDesas(): any {
        let result = [];
        let fileName = path.join(DATA_DIR, "desa.json");

        if (jetpack.exists(fileName))
            result = JSON.parse(jetpack.read(fileName));

        return result;
    }

    getLocalContent(type, bundleSchemas): Bundle {
        let bundle: Bundle = null;
        let jsonFile = path.join(CONTENT_DIR, type + '.json');
        try {
            bundle = this.transformBundle(JSON.parse(jetpack.read(jsonFile)), type, bundleSchemas);
        }
        catch (exception) {
            bundle = this.transformBundle(null, type, bundleSchemas);
        }
        return bundle;
    }

    getDesa(refresh?: boolean): Observable<any> {
        if (!this._desa.observers.length || refresh) {
            let desaId = this.getActiveAuth()['desa_id'];
            let desas = this.getLocalDesas();
            let desa = desas.filter(desa => desa['blog_id'] === desaId)[0];
            this._desa.next(desa);
        }
        return this._desa;
    }

    getDesas(progressListener: any): Observable<any> {
        let auth = this.getActiveAuth();
        let url = SERVER + '/desa';
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });

        return this.http
            .withDownloadProgressListener(progressListener)
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getContentSubType(content_type, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + '/content/' + auth['desa_id'] + '/' + content_type + '/subtypes';

        return this.http
            .withDownloadProgressListener(progressListener)
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getContent(type, subType, changeId, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/content/v2/" + auth['desa_id'] + "/" + type;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + changeId;

        this.setContentMetadata('desa_id', auth.desa_id);

        return this.http
            .withDownloadProgressListener(progressListener)
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    saveContent(type, subType, localBundle, bundleSchemas, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/content/v2/" + auth['desa_id'] + "/" + type;

        let keys = Object.keys(bundleSchemas);
        let columns = {};

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            
            if(bundleSchemas[key] === 'dict')
                columns[key] = 'dict';
            else
                columns[key] = bundleSchemas[key].map(s => s.field)
        }

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + localBundle.changeId;

        let body = { "columns": columns };
        if(!localBundle.rewriteData){
            body["diffs"] = localBundle.diffs;
        } else {
            body["data"] = localBundle.data;
        }
        
        this.setContentMetadata("desa_id", auth.desa_id);

        return this.http
            .withUploadProgressListener(progressListener)
            .post(url, body, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    uploadContentMap(indicator, path, localBundle, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/content-map/v2/" + auth['desa_id'] + '/' + indicator + '?changeId=' + localBundle.changeId;

        let body = { "data": JSON.parse(jetpack.read(path)) };

        return this.http
            .withUploadProgressListener(progressListener)
            .post(url, body, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    login(user, password): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });

        let info = os.type() + " " + os.platform() + " " + os.release() + " " + os.arch() + " " + os.hostname() + " " + os.totalmem();
        let url = SERVER + "/login";
        let body = { "user": user, "password": password, "info": info };

        headers['content-type'] = 'application/json';

        return this.http
            .post(url, body, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    logout(): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/logout";

        try {
            this.saveActiveAuth(null);
        }
        catch (exception) {
            return this.handleError(exception);
        }

        return this.http
            .get(url, options)
            .catch(this.handleError);
    }

    checkAuth(): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/check_auth/" + auth['desa_id'];

        return this.http
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getActiveAuth(): any {
        let result = null;
        let authFile = path.join(DATA_DIR, "auth.json");

        try {
            if (!jetpack.exists(authFile))
                return null;
            return JSON.parse(jetpack.read(authFile));
        }
        catch (exception) {
            return null;
        }
    }

    saveActiveAuth(auth): void {
        let authFile = path.join(DATA_DIR, "auth.json");

        if (auth)
            this.writeFile(auth, authFile, null);
        else
            this.removeFile(authFile);
    }

    mergeDiffs(diffs: DiffItem[], data: any[]): any[] {
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

    mergeDiffsMap(diffs: DiffItem[], data: any[]): any[] {
        for (let i = 0; i < diffs.length; i++) {
            let diffItem: DiffItem = diffs[i];

            for (let j = 0; j < diffItem.added.length; j++)
                data.push(diffItem.added[j]);

            for (let j = 0; j < diffItem.modified.length; j++) {
                let dataItem: any[] = diffItem.modified[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k]["id"] === dataItem["id"]) {
                        data[k] = dataItem;
                    }
                }
            }

            for (let j = 0; j < diffItem.deleted.length; j++) {
                let dataItem: any[] = diffItem.deleted[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k]["id"] === dataItem["id"]) {
                        data.splice(k, 1);
                        break;
                    }
                }
            }
        }

        return data;
    }

    writeFile(data, path, toastr): void {
        try {
            jetpack.write(path, JSON.stringify(data), { atomic: true });
            if (toastr)
                toastr.success('Data berhasil disimpan ke komputer');
        }
        catch (exception) {
            if (toastr)
                toastr.error('Data gagal disimpan ke komputer');
        }
    }

    removeFile(path): void {
        jetpack.remove(path);
    }

    getMetadatas(): any {
        let fileName = path.join(CONTENT_DIR, "metadata.json");

        if (!jetpack.exists(fileName))
            jetpack.write(fileName, JSON.stringify({}), { atomic: true });

        return JSON.parse(jetpack.read(fileName));
    }

    getContentMetadata(key): any {
        let metas = this.getMetadatas();
        return metas[key];
    }

    setContentMetadata(key, value): void {
        let metas = this.getMetadatas();
        metas[key] = value;
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas), { atomic: true });
    }

    rmDirContents(dirPath): void {
        try { var files = jetpack.list(dirPath); }
        catch (e) { return; }

        if (files.length <= 0)
            return;

        for (var i = 0; i < files.length; i++) {
            if (files[i] === 'metadata.json')
                continue;

            var filePath = path.join(dirPath, files[i]);
            jetpack.remove(filePath);
        }
    }

    getUnsavedDiffs(files: any[]): any {
        let result = [];

        for (let i = 0; i < files.length; i++) {
            let filePath = path.join(CONTENT_DIR, files[i] + ".json");
            let fileData = null;

            try {
                fileData = JSON.parse(jetpack.read(filePath));
            }
            catch (exception) {

            }

            if (!fileData || !fileData['diffs'])
                continue;

            let diffKeys = Object.keys(fileData['diffs']);

            for (let j = 0; j < diffKeys.length; j++) {
                let diffKey = diffKeys[j];

                if (fileData['diffs'][diffKey].length === 0)
                    continue;

                result.push({
                    "module": files[i],
                    "key": diffKey,
                    "total": fileData['diffs'][diffKey].length
                });
            }
        }

        return result;
    }

    private getHttpHeaders(auth: any): any {
        let result = {};
        let token = null;

        result['X-Sideka-Version'] = pjson.version;

        if (auth && auth['token']) {
            token = auth['token'].trim();
            result['X-Auth-Token'] = token;
        }

        return result;
    }

    private transformBundle(bundle, type, schemas): Bundle {
        let keys = Object.keys(schemas);
        let columns = {};
        let data = {};

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];

            if(schemas[key] === 'dict')
                columns[key] = 'dict';
            else
                columns[key] = schemas[key].map(s => s.field);

            data[key] = [];
        }

        let result: Bundle = {
            apiVersion: '2.0',
            changeId: 0,
            columns: columns,
            data: data,
            diffs: JSON.parse(JSON.stringify(data))
        }

        if (type === 'map')
            result['center'] = [0, 0];

        if (bundle === null)
            return result;

        switch (type) {
            case 'penduduk':
                if (bundle['data'] instanceof Array)
                    result.data['penduduk'] = bundle['data'];
                else
                    result = bundle;
                break;
            default:
                result = bundle;
                break;
        }

        result['changeId'] = bundle.changeId;
        result['apiVersion'] = '2.0';
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
        return Observable.throw(errMsg);
    }
}
