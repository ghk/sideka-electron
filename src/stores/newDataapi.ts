import * as os from 'os';
import * as fs from 'fs';
import env from '../env';
import * as request from 'request';
import { remote } from 'electron';
import schemas from "../schemas";

var path = require('path');
var jetpack = require('fs-jetpack');
var pjson = require("./package.json");
var app = remote.app;

const SERVER = 'https://api.sideka.id';
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

jetpack.dir(CONTENT_DIR);

let getActiveAuth = () => {
    let authFile = path.join(DATA_DIR, "auth.json");

    if(!jetpack.exists(authFile))
        return null;

    return JSON.parse(jetpack.read(authFile));
}

let getHttpHeaders = () => {
    let auth = this.getActiveAuth();
    let token = auth ? auth['token'].trim() : null;
    return { "X-Auth-Token": token, "X-Sideka-Version": pjson.version }; 
}

interface Diff {
    updated: any[];
    deleted: any[];
    added: any[];
    total: number;
}

interface Content{
    data: any;
    columns: any;
    changeId: number;
    diffs: Diff[]
}

class NewDataApi{
    constructor(){}

    getContent(type, subType, data, schema, dir, callback): void {
        const CHANGE_IDS_PATH = path.join(dir, 'changes_ids.json');
        const LOCAL_DATA_PATH = path.join(dir, 'local_data.json');
        const DIFF_PATH = path.join(dir, 'diffs.json');

        let auth = getActiveAuth();
        let headers = getHttpHeaders();
        let changeId = 0;
        
        if(LocalHandler.isChangeExists(CHANGE_IDS_PATH))
           changeId = LocalHandler.loadChangeId(CHANGE_IDS_PATH);

        let content: Content = {
            data: null,
            columns: schema.map(s => s.field),
            changeId: changeId,
            diffs: []
        }

        let url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "?changeId=" + changeId;
        
        if(subType)
            url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "/" + subType + "?changeId=" + changeId;

        request({ method: 'GET', url: url, headers: headers }, (err, resp, body) => {
            if(err || resp.statusCode !== 200){
                content = LocalHandler.loadLocalData(LOCAL_DATA_PATH);
                callback(content);
                return;
            }

            content = JSON.parse(body);

            if(content.diffs.length > 0)
               content = this.mergeDiff(DIFF_PATH, content);

            LocalHandler.storeLocalData(LOCAL_DATA_PATH, content);
            LocalHandler.storeChangeId(CHANGE_IDS_PATH, content.changeId);

            callback(content);
        });
    }

    saveContent(type, subType, data, schema, dir, callback): void {
        const CHANGE_IDS_PATH = path.join(dir, 'changes_ids.json');
        const LOCAL_DATA_PATH = path.join(dir, 'local_data.json');
        const DIFF_PATH = path.join(dir, 'diffs.json');

        let auth = getActiveAuth();
        let headers = getHttpHeaders();
        let currentDiff = this.mergeDiff(dir, data);
     
        let content: any = {
            data: data,
            columns: schemas.penduduk.map(e => e.field),
            diffs: [currentDiff],
            changeId: LocalHandler.loadChangeId(CHANGE_IDS_PATH)
        }

        let url = SERVER + "/content/" + auth['desa_id'] + "/" + type;

        if(subType)
            url= SERVER + "/content/" + auth['desa_id'] + "/" + type + "/" + subType;

        request({ method: 'POST', url: url, headers: headers, json: content}, (err, resp, body) => {
            if(err || resp.statusCode !== 200){
                LocalHandler.storeDiff(DIFF_PATH, currentDiff);
            }

            else{
                currentDiff.changeId = resp['id'];
                LocalHandler.storeChangeId(CHANGE_IDS_PATH, currentDiff.changeId);
                LocalHandler.storeLocalData(LOCAL_DATA_PATH, currentDiff);
            }
        
            if(callback)
                callback(currentDiff);
        });
    }
    
    mergeDiff(dir, currentData): any {
        const LOCAL_DATA_PATH = path.join(dir, 'local_data.json');
        let localData = LocalHandler.loadLocalData(LOCAL_DATA_PATH);
        return {};
    }
}

class LocalHandler{
    static storeDiff(filePath, data): void{
        let diffs: any[] = [];

        if(jetpack.exists(filePath))
          diffs = JSON.parse(jetpack.read(filePath));
        
        diffs.push(data);

        jetpack.write(filePath, JSON.stringify(diffs));
    }

    static storeLocalData(filePath, data): void{
        jetpack.write(filePath, JSON.stringify(data));
    }

    static storeChangeId(filePath, id): void {
        let changeIds: any[] = [];

        if(jetpack.exists(filePath))
          changeIds = JSON.parse(jetpack.read(filePath));
        
        changeIds.push(id);

        jetpack.write(filePath, JSON.stringify(changeIds));
    }

    static isChangeExists(filePath): boolean{
        if(!jetpack.read(filePath))
            return false;

        return true;
    } 

    static loadChangeId(filePath): any{
        let changes: any[] = JSON.parse(jetpack.read(filePath));
        return changes[changes.length - 1];
    }

    static loadLocalData(filePath): any{
        if(jetpack.exists(filePath))
            return JSON.parse(jetpack.read(filePath));

        return {};
    }
}
