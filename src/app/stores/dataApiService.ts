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
            if(jetpack.exists(jsonFile))
                bundle = JSON.parse(jetpack.read(jsonFile));
        }
        catch (exception) {
            console.error("error on read file", exception);
        }
        if(bundle == null){
            bundle = this.getEmptyContent(bundleSchemas);
        }
        if(!bundle.apiVersion){
            bundle.apiVersion = bundle.data.length ? "1.0" : "2.0";
        }
        return bundle;
    }

    getEmptyContent( bundleSchemas): Bundle {
        return {
            apiVersion: '2.0',
            changeId: 0,
            columns: this.schemaToColumns(bundleSchemas),
            data: this.schemaToEmptyDataArray(bundleSchemas),
            diffs: this.schemaToEmptyDataArray(bundleSchemas),
        };
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
        let url = '/desa';
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
        let url = '/content/' + auth['desa_id'] + '/' + content_type + '/subtypes';

        return this.http
            .withDownloadProgressListener(progressListener)
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getContent(type, subType, changeId, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let url = "/content/v2/" + auth['desa_id'] + "/" + type;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + changeId;

        this.setContentMetadata('desa_id', auth.desa_id);

        return this.get(url, progressListener);
    }

    saveContent(type, subType, localBundle, bundleSchemas, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let url = "/content/v2/" + auth['desa_id'] + "/" + type;
        let columns = this.schemaToColumns(bundleSchemas);

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

        return this.post(url, body, progressListener);
    }

    login(user, password): Observable<any> {
        let url = "/login";
        let body = { "user": user, "password": password };
        return this.get(url, null);
    }

    logout(): Observable<any> {
        let url = "/logout";

        try {
            this.saveActiveAuth(null);
        }
        catch (exception) {
            return this.handleError(exception);
        }

        return this.get(url, null);
    }

    checkAuth(): Observable<any> {
        let auth = this.getActiveAuth();
        let url = "/check_auth/" + auth['desa_id'];

        return this.get(url, null);
    }


    get(url, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        url = SERVER + url;

        let res : any = this.http;
        if (progressListener){
            res = res.withDownloadProgressListener(progressListener);
        }
        return res.get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    post(url, body, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        url = SERVER + url;

        let res : any = this.http;
        if (progressListener){
            res = res.withUploadProgressListener(progressListener);
        }
        return res.post(url, body, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    schemaToColumns(schema){
        let columns = {};
        let keys = Object.keys(schema);

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            
            if(schema[key] === 'dict')
                columns[key] = 'dict';
            else
                columns[key] = schema[key].map(s => s.field)
        }
        return columns;
    }

    schemaToEmptyDataArray(schema){
        let columns = {};
        let keys = Object.keys(schema);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            columns[key] = [];
        }
        return columns;
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
            jetpack.write(path, JSON.stringify(data, null, "\t"), { atomic: true });
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

        let platformInfo = os.type() + " " + os.platform() + " " + os.release() + " " + os.arch() + " " + os.hostname() + " " + os.totalmem();
        result['X-Platform'] = platformInfo;

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
