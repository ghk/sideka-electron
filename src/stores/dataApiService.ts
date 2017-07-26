import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { Response, Headers, RequestOptions } from '@angular/http';
import { ProgressHttp } from 'angular-progress-http';
import { Observable } from 'rxjs/Observable';
import { BundleData, BundleDiffs, Bundle, DiffItem } from './bundle';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/map';

import * as os from "os";
import * as fs from "fs";
import * as path from "path";

import env from '../env';
import schemas from "../schemas";
import { DiffTracker } from '../helpers/diffTracker';
import settings from '../stores/settings';

var uuid = require("uuid");
var base64 = require("uuid-base64");
var jetpack = require('fs-jetpack');
var pjson = require("./package.json");
var storeSettings = jetpack.cwd(path.join(__dirname)).read('storeSettings.json', 'json');

let SERVER = storeSettings.live_api_url;

if(env.name !== 'production')
    SERVER = storeSettings.ckan_api_url;

const APP = remote.app;
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DESA_SOURCES = 'geojson_desa_sources';
const DATA_SOURCES = 'data';

@Injectable()
export default class DataApiService {
    diffTracker: DiffTracker;

    constructor(private http: ProgressHttp) {
        this.diffTracker = new DiffTracker();
    }

    getLocalDesa(): any {
        let result = [];
        let fileName = path.join(DATA_DIR, "desa.json");

        if (jetpack.exists(fileName))
            result = JSON.parse(jetpack.read(fileName));

        return result;
    }

    getLocalContent(type, bundleSchemas): Bundle {
        let file = this.getFile(type);
        let bundle: Bundle = null;
        let jsonFile = path.join(CONTENT_DIR, file + '.json');
        try {
            bundle = this.transformBundle(JSON.parse(jetpack.read(jsonFile)), type, bundleSchemas);
        }
        catch (exception) {
            bundle = this.transformBundle(null, null, bundleSchemas);
        }
        return bundle;
    }

    getDesa(progressListener: any): Observable<any> {
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

    getDesaFeatures(indicator, callback): void {
        let geoJson: any = null;
        let localDirPath: string = path.join(CONTENT_DIR, 'map.json');
        let geojsonPath: string = path.join(DESA_SOURCES, 'map-example.json');

        if (!jetpack.exists(localDirPath)) {
            geoJson = JSON.parse(jetpack.read(geojsonPath));

            if (!geoJson) {
                callback({});
                return;
            }

            jetpack.write(localDirPath, JSON.stringify(geoJson));
        }
        else
            geoJson = JSON.parse(jetpack.read(localDirPath));

        let result = geoJson.filter(e => e.indicator === indicator)[0];

        callback(result);
    }

    getContent(type, subType, changeId, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);        
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/content/v2/" + auth['desa_id'] + "/" + type;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + changeId;

        return this.http
            .withDownloadProgressListener(progressListener)
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getContentSubType(type, callback): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "/subtypes";

        return this.http
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getFile(type): string {
        return storeSettings.data_content_files[type];
    }

    saveContent(type, subType, localBundle, bundleSchemas, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let file = this.getFile(type);
        let url = SERVER + "/content/v2/" + auth['desa_id'] + "/" + type;

        let keys = Object.keys(bundleSchemas);
        let columns = {};
        
        for(let i=0; i<keys.length; i++){
            let key = keys[i];
            columns[key] = bundleSchemas[key].map(s => s.field)
        }

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + localBundle.changeId;

        let body = { "columns": columns, "diffs": localBundle.diffs };

        return this.http
            .withUploadProgressListener(progressListener)
            .post(url, body, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    getLocalMapContent() {
        let bundle = null;
        let auth = this.getActiveAuth();
        let mapFile = path.join(CONTENT_DIR, 'map.json');

        try {
            bundle = this.transformMapBundle(JSON.parse(jetpack.read(mapFile)));
        }
        catch (exception) {
            bundle = this.transformMapBundle(null);
        }
        return bundle;
    }

    getMapContent(localBundle, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let url = SERVER + "/content-map/" + auth['desa_id'] + "/" + localBundle.changeId;

        return this.http
            .withDownloadProgressListener(progressListener)
            .get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    saveMapContentMap(localBundle, currentBundle, progressListener): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders(auth);
        let options = new RequestOptions({ headers: headers });
        let currentDiff = this.diffTracker.trackDiffMapping(localBundle.data, currentBundle);
        let url = SERVER + "/content-map/" + auth['desa_id'] + "/" + localBundle.changeId;

        localBundle['diffs'].push(currentDiff);
        let body = { "diffs": localBundle['diffs'] };

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
        } catch (exception) {
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
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    }

    mergeContent(serverData, localData, type): any {
        let diffs = localData['diffs'][type];

        if (serverData['diffs'])
            diffs = diffs.concat(serverData['diffs']);

        else if (serverData['data'] instanceof Array && type === 'penduduk') {  
            localData.data['penduduk'] = serverData['data'];                                  
        } else {
            localData.data = serverData['data'];
        } 

        localData.changeId = serverData.change_id;
        localData.data[type] = this.mergeDiffs(diffs, localData.data[type]);
        return localData;
    }

    mergeMapContent(serverData, localData): any{
        let diffs = localData['diffs'];

        if(serverData['diffs'])
            diffs = diffs.concat(serverData['diffs']);
        else
            localData['data'] = serverData['data'];
        
        localData.center = serverData.center ? serverData.center : localData.center;
        localData.changeId = serverData.change_id;
        localData.data = this.mergeDiffsMap(diffs, localData.data);
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

    mergeDiffsMap(diffs: DiffItem[], data: any[]): any[] {
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

    transformBundle(bundle, type, schemas): Bundle {
        let keys = Object.keys(schemas);
        let columns = {};
        let data = {};

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
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

    private transformMapBundle(bundle) {
        let result = {
            'changeId': 0,
            'center': [],
            'data': [],
            'diffs': []
        };

        if (bundle !== null)
            result = bundle;

        result['apiVersion'] = '2.0';
        return result;
    }

    private transformDesaGeoJsonData(desaId: any, files: any[]): any {
        let result: any[] = [];

        for (let i = 0; i < files.length; i++) {
            let dataPath = path.join(DATA_SOURCES, files[i].path + '.json');

            if (!jetpack.exists(dataPath))
                continue;

            let dataSet = JSON.parse(jetpack.read(dataPath));

            for (let j = 0; j < dataSet.features.length; j++) {
                let dataSetFeature = dataSet.features[j];
                let newFeature = {
                    "id": base64.encode(uuid.v4()),
                    "type": "Feature",
                    "indicator": files[i].indicator,
                    "properties": { "type": null },
                    "geometry": dataSetFeature.geometry
                };

                result.push(newFeature);
            }
        }

        return { "desaId": desaId, "features": result };
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
