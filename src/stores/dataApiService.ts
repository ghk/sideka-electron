import { Injectable }              from '@angular/core';
import { Http, Response, Headers, RequestOptions }          from '@angular/http';
import { remote }                  from "electron";
import { Observable }              from 'rxjs/Observable';

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import * as path from "path";

var jetpack = require("fs-jetpack");
var pjson = require("./package.json");

const APP = remote.app;
const SERVER = "http://127.0.0.1:5001";
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

    constructor(private http: Http){}

    getContent(dataType, subType, bundleData, bundleSchemas, callback): Observable<any> {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let keys = Object.keys(bundleSchemas);
        let bundleDiffs = {};
        let columns = {};
        let type: string = DATA_TYPE_DIRS[dataType];
        let jsonFile = path.join(CONTENT_DIR, type + '.json');
        
        bundleDiffs[dataType] = [];
        columns[dataType] = [];

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            columns[key] = bundleSchemas[key].map(s => s.field);
        }

        let bundle: Bundle = {
            changeId: 0,
            columns: columns,
            data: bundleData,
            diffs: bundleDiffs
        }
        
        try{
            if (!jetpack.exists(jsonFile))
                jetpack.write(jsonFile, bundle);
            else
                bundle = JSON.parse(jetpack.read(jsonFile));
        }
        catch(exception){
            jetpack.write(jsonFile, bundle);
        }

        if(!bundle.diffs)
            bundle.diffs = {};

        if (!bundle.diffs[dataType])
            bundle.diffs[dataType] = [];

        let currentChangeId = bundle.changeId ? bundle.changeId : 0;
        let url = SERVER + "/content/2.0/" + auth['desa_id'] + "/" + type + "/" + dataType;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + currentChangeId;

        let allDiffs = bundle.diffs[dataType];
        let options = new RequestOptions({ headers: headers});

        return this.http.get(url, options).map(res => {
            if(res.status === 200){
                let result = JSON.parse(res.json());
            }
        });
    }

    getActiveAuth(): any {
        let authFile = path.join(DATA_DIR, "auth.json");

        if (!jetpack.exists(authFile))
            return null;

        return JSON.parse(jetpack.read(authFile));
    }

    getHttpHeaders(): Headers {
        let httpHeaders = new Headers();
        let auth = this.getActiveAuth();
        let token = auth ? auth['token'].trim() : null;
        httpHeaders.append("X-Auth-Token", token);
        httpHeaders.append("X-Sideka-Version", pjson.version);
       
        return httpHeaders;
    }
}
