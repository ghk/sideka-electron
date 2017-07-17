import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { BundleData, BundleDiffs, Bundle, DiffItem } from './bundle';
import { remote } from "electron";
import { Observable } from 'rxjs/Observable';
import { DiffTracker } from '../helpers/diffTracker';
import { Siskeudes } from '../stores/siskeudes';

import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/map';

import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import env from '../env';
import schemas from "../schemas";
import settings from '../stores/settings';

var jetpack = require('fs-jetpack');
var pjson = require("./package.json");
var app = remote.app;
var storeSettings = jetpack.cwd(path.join(__dirname)).read('storeSettings.json', 'json');

const SERVER = storeSettings.live_api_url;
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

@Injectable()
export default class DataApiService{
    diffTracker: DiffTracker;
    progress$: any;
    private progress: any;
    progressObserver: any;


    constructor(private http: Http) {
        this.diffTracker = new DiffTracker();
        this.progress$ = Observable.create(observer => {
            this.progressObserver = observer;
        }).share();
    }

    getDesa(): Observable<any> {
        let auth = this.getActiveAuth();
        let url = SERVER + '/desa';
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });

        return Observable.create(observer => {
            let xhr: XMLHttpRequest = new XMLHttpRequest();
            let headerKeys = Object.keys(headers);

            xhr.open('GET', url, true);

            headerKeys.forEach(key => {
                xhr.setRequestHeader(key, headers[key]);
            });

            xhr.onprogress = (event) => {
                this.progress = Math.round(event.loaded / event.total * 100);
                this.progressObserver.next(this.progress);
            };

            xhr.onreadystatechange = (event) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        observer.next(JSON.parse(xhr.response));
                        observer.complete();
                    } else {
                        this.handleError(xhr.response);
                    }
                }
            };

            xhr.send();
        });
    }

    getContent(type, subType, bundleData, bundleSchemas):  Observable<any> {
        let auth = this.getActiveAuth();
        let file = storeSettings.data_content_files[type];
        let headers = this.getHttpHeaders(auth);

        if(!file)
           return this.handleError({ "message": 'Data file is not found' });
        
        let localBundle: Bundle = this.getLocalContent(file, bundleSchemas);
        let currentChangeId = localBundle.changeId ? localBundle.changeId : 0;
        let url = SERVER + "/content/2.0/" + auth['desa_id'] + "/" + file + "/" + type;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + currentChangeId;

        return Observable.create(observer => {
            let xhr: XMLHttpRequest = new XMLHttpRequest();
            let headerKeys = Object.keys(headers);

            xhr.open('GET', url, true);

            headerKeys.forEach(key => {
                xhr.setRequestHeader(key, headers[key]);
            });

            xhr.onprogress = (event) => {
                this.progress = Math.round(event.loaded / event.total * 100);
                this.progressObserver.next(this.progress);
            };

            xhr.onreadystatechange = (event) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        observer.next(JSON.parse(xhr.response));
                        observer.complete();
                    } else {
                        this.handleError(xhr.response);
                    }
                }
            };

            xhr.send();
        });
    }

    saveContent(type, subType, bundleData, bundleSchemas): Observable<any>{
        let auth = this.getActiveAuth();
        let file = storeSettings.data_content_files[type];
        let headers = this.getHttpHeaders(auth);
        let localBundle: Bundle = this.getLocalContent(file, bundleSchemas);
        let currentDiff = this.diffTracker.trackDiff(localBundle.data[type], bundleData[type]);
        let currentChangeId = localBundle.changeId;

        if (currentDiff.total > 0)
            localBundle.diffs[type].push(currentDiff);
        
        let url = SERVER + "/content/2.0/" + auth['desa_id'] + "/" + file + "/" + type;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + currentChangeId;

        let json = { "columns": bundleSchemas[type].map(s => s.field), "diffs": localBundle.diffs[type] };

        return Observable.create(observer => {
            let xhr: XMLHttpRequest = new XMLHttpRequest();
            let headerKeys = Object.keys(headers);

            xhr.open('POST', url, true);

            headerKeys.forEach(key => {
                xhr.setRequestHeader(key, headers[key]);
            });

            xhr.onprogress = (event) => {
                this.progress = Math.round(event.loaded / event.total * 100);
                this.progressObserver.next(this.progress);
            };

            xhr.onreadystatechange = (event) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let result = {"response": JSON.parse(xhr.response), "localBundle": localBundle };
                        observer.next(result);
                        observer.complete();
                    } else {
                        this.handleError(xhr.response);
                    }
                }
            };

            xhr.send(JSON.stringify(json));
        });
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

    getFile(type): string{
        return storeSettings.data_content_files[type];
    }

    login(user, password): Observable<any>{
        let info = os.type() + " " + os.platform() + " " + os.release() + " " + os.arch() + " " + os.hostname() + " " + os.totalmem();
        let url = SERVER + "/login";
        let json = { "user": user, "password": password, "info": info };

        return Observable.create(observer => {
            let xhr: XMLHttpRequest = new XMLHttpRequest();

            xhr.open('POST', url, true);
            
            xhr.setRequestHeader('X-Sideka-Version', pjson.version);
            xhr.setRequestHeader('content-type', 'application/json');

            xhr.onreadystatechange = (event) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        observer.next(JSON.parse(xhr.response));
                        observer.complete();
                    } else {
                        this.handleError(xhr.response);
                    }
                }
            };

            xhr.send(JSON.stringify(json));
        });
    }

    checkAuth(): Observable<any>{
        let auth = this.getActiveAuth();
        let url = SERVER + "/check_auth/" + auth['desa_id'];
        let headers = this.getHttpHeaders(auth);

        return Observable.create(observer => {
            let xhr: XMLHttpRequest = new XMLHttpRequest();
            let headerKeys = Object.keys(headers);

            xhr.open('GET', url, true);

            headerKeys.forEach(key => {
                xhr.setRequestHeader(key, headers[key]);
            });

             xhr.onreadystatechange = (event) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                      
                        observer.next(JSON.parse(xhr.response));
                        observer.complete();
                    } else {
                        this.handleError(xhr.response);
                    }
                }
            };

            xhr.send();
        });
    }

    saveActiveAuth(auth): void {
        let authFile = path.join(DATA_DIR, "auth.json");

        if (auth)
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    }

    getActiveAuth(): any {
        let result = null;
        let authFile = path.join(DATA_DIR, "auth.json"); 

        try{
            if (!jetpack.exists(authFile))
                return null;
            
            return JSON.parse(jetpack.read(authFile));
        }      
        catch(exception){
            return null;
        }
    }

    mergeContent(serverData, localData, type): any {
        let diffs = localData['diffs'][type];

        if (serverData['diffs']) 
            diffs = diffs.concat(serverData['diffs']);   
        else if (serverData['data'] && type === 'penduduk') 
            localData.data[type] = serverData['data'];
        
        localData.changeId = serverData.change_id;
        localData.data[type] = this.mergeDiffs(diffs, localData.data[type]);
        return localData;
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

    private getHttpHeaders(auth: any): any {
        let httpHeaders = new Headers();
        let token = null;

        if (auth !== null)
            token = auth['token'].trim();
        
        return { "X-Auth-Token": token, "X-Sideka-Version": pjson.version };
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

        switch(type) {
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
