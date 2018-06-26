import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { Response, Headers, RequestOptions } from '@angular/http';
import { ProgressHttp } from 'angular-progress-http';
import { Observable, ReplaySubject } from 'rxjs';
import { BundleData, BundleDiffs, Bundle, DiffItem } from './bundle';
import { SchemaDict, SchemaColumn } from '../schemas/schema';

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
import SharedService from './sharedService';
import Auth from './auth';

const uuid = require('uuid');
const base64 = require('uuid-base64');
const jetpack = require('fs-jetpack');
const pjson = require('../../../package.json');
const storeSettings = require('../storeSettings.json');
const prodeskelUrl = 'http://prodeskel.binapemdes.kemendagri.go.id';

declare var ENV: string;

let SERVER = storeSettings.live_api_url;

//if (ENV !== 'production') 
//   SERVER = storeSettings.live_api_url;

@Injectable()
export default class DataApiService {
    private _desa = new ReplaySubject<any>(1);
    private _auth : Auth = null;

    constructor(private http: ProgressHttp, private sharedService: SharedService) {
        this._auth = this.getAuthFromFile();
    }

    getLocalDesas(): any[] {
        let result = [];
        let fileName = path.join(this.sharedService.getDataDirectory(), "desa.json");

        if (jetpack.exists(fileName))
            result = JSON.parse(jetpack.read(fileName));

        return result;
    }

    getLocalContent(bundleSchemas: SchemaDict, type: string, subType?: string): Bundle {
        let bundle: Bundle = null;
        let jsonFile = this.sharedService.getContentFile(type, subType);
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

    getEmptyContent(bundleSchemas: SchemaDict): Bundle {
        return {
            apiVersion: '2.0',
            changeId: 0,
            columns: this.schemaToColumns(bundleSchemas),
            data: this.schemaToEmptyDataArray(bundleSchemas),
            diffs: this.schemaToEmptyDataArray(bundleSchemas),
        };
    }

    getDesa(refresh?: boolean): any {
        let desa = {};
        if(this._auth){
            let desaId = this._auth.desa_id;
            let desas = this.getLocalDesas();
            let empty = {};

            desa = desas.filter(desa => desa['blog_id'] === desaId)[0] 
                ? desas.filter(desa => desa['blog_id'] === desaId)[0] : {};  
                          
        }

        this._desa.next(desa);
      
        return this._desa;
    }

    getContentInfo(type, subType, changeId, progressListener: any): Observable<any> {
        let url = '/content_info/'+this.auth.desa_id+"/"+type;
        if (subType)
            url += "/" + subType;
        url += "?changeId=" + changeId;
        return this.get(url, progressListener);
    }

    getDesas(progressListener: any): Observable<any> {
        let url = '/desa';
        return this.get(url, progressListener);
    }

    getContentSubType(type: string, progressListener): Observable<any> {
        let url = '/content/' + this.auth.desa_id + '/' + type + '/subtypes';

        return this.get(url, progressListener);
    }

    getContent(type: string, subType: string, changeId: number, progressListener): Observable<any> {
        let url = "/content/v2/" + this.auth.desa_id + "/" + type;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + changeId;

        this.setContentMetadata('desa_id', this.auth.desa_id);

        return this.get(url, progressListener);
    }

    saveContent(type: string, subType: string, localBundle, bundleSchemas: SchemaDict, progressListener): Observable<any> {
        let url = "/content/v2/" + this.auth.desa_id + "/" + type;
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
        
        this.setContentMetadata("desa_id", this.auth.desa_id);

        return this.post(url, body, progressListener);
    }

    login(user: string, password: string): Observable<Auth> {
        let url = "/login";
        let body = { "user": user, "password": password };
        return this.post(url, body)
            .map(res => {
                this.auth = new Auth(res);
                this.getDesa();
                return this.auth;
            });
    }

    logout(): Observable<any> {
        let url = "/logout";

        try {
            this.auth = null;
            return this.get(url, null);
        }
        catch (exception) {
            return this.handleError(exception);
        }
    }

    checkAuth(): void{
        let url = "/check_auth/" + this.auth.desa_id;

        this.get(url, null) .subscribe(res => {
            this.auth = res ? new Auth(res) : null;
            return this.auth;
        });
    }


    get(url: string, progressListener?): Observable<any> {
        let headers = this.getHttpHeaders();
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

    post(url: string, body, progressListener?): Observable<any> {
        let headers = this.getHttpHeaders();
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

    wordpressGet(url: string, progressListener?): Observable<any> {
        let headers = this.getHttpHeaders();
        let options = new RequestOptions({ headers: headers });
        url = this.auth.siteurl + "/wp-json/wp/v2" + url;

        let res : any = this.http;
        if (progressListener){
            res = res.withDownloadProgressListener(progressListener);
        }
        return res.get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    wordpressPost(url: string, body, progressListener?): Observable<any> {
        let headers = this.getHttpHeaders();
        let options = new RequestOptions({ headers: headers });
        url = this.auth.siteurl + "/wp-json/wp/v2" + url;

        let res : any = this.http;
        if (progressListener){
            res = res.withUploadProgressListener(progressListener);
        }
        return res.post(url, body, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    wordpressFeeds(categoryId, perPage, offset, progressListener?): Observable<any> {
        let headers = this.getHttpHeaders();
        let options = new RequestOptions({ headers: headers });

        let url = 'https://kabar.sideka.id/wp-json/wp/v2/posts?_embed&&per_page=' + perPage +'&offset=' + offset;
        if(categoryId)
            url += "&categories="+categoryId;

        let res : any = this.http;
        if (progressListener){
            res = res.withUploadProgressListener(progressListener);
        }

        return res.get(url, options)
            .map(res => res.json())
            .catch(this.handleError);
    }

    schemaToColumns(schema: SchemaDict){
        let columns = {};
        let keys = Object.keys(schema);

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            
            if(schema[key] === 'dict')
                columns[key] = 'dict';
            else
                columns[key] = (schema[key] as SchemaColumn[]).map(s => s.field)
        }
        return columns;
    }

    schemaToEmptyDataArray(schema: SchemaDict) {
        let columns = {};
        let keys = Object.keys(schema);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            columns[key] = [];
        }
        return columns;
    }


    get auth(): Auth {
        return this._auth;
    }

    set auth(auth: Auth) {
        this._auth = auth;
        let authFile = path.join(this.sharedService.getDataDirectory(), "auth.json");
        let desaAuthFile = path.join(this.sharedService.getDesaDirectory(), "auth.json");

        if (auth){
            this.writeFile(auth, authFile, null);
            this.writeFile(auth, desaAuthFile, null);
        }
        else {
            jetpack.remove(authFile);
            jetpack.remove(desaAuthFile);
        }
    }

    private getAuthFromFile(): Auth {
        let result = null;
        let authFile = path.join(this.sharedService.getDataDirectory(), "auth.json");

        try {
            if (!jetpack.exists(authFile))
                return null;
            return new Auth(JSON.parse(jetpack.read(authFile)));
        }
        catch (exception) {
            return null;
        }
    }

    writeFile(data, path: string, toastr?): void {
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

    getMetadatas(): any {
        let fileName = path.join(this.sharedService.getContentDirectory(), "metadata.json");

        if (!jetpack.exists(fileName))
            jetpack.write(fileName, JSON.stringify({}), { atomic: true });

        return JSON.parse(jetpack.read(fileName));
    }

    getContentMetadata(key: string): any {
        let metas = this.getMetadatas();
        return metas[key];
    }

    setContentMetadata(key: string, value): void {
        let metas = this.getMetadatas();
        metas[key] = value;
        let fileName = path.join(this.sharedService.getContentDirectory(), "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas), { atomic: true });
    }

    rmDirContents(dirPath: string): void {
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
            let filePath = path.join(this.sharedService.getContentDirectory(), files[i] + ".json");
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

    private getHttpHeaders(): any {
        let result = {};
        let token = null;
        let auth = this.auth;

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
        console.log(error);
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
