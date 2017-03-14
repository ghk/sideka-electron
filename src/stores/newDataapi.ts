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
const PENDUDUK_DIR = path.join(DATA_DIR, "penduduk");
const DESA_DIR = path.join(DATA_DIR, "desa");
const APBDES_DIR = path.join(DATA_DIR, "apbdes");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

const PENDUDUK_DIR_FILE = {
    SERVER_DATA: path.join(PENDUDUK_DIR, 'server_data.json'),
    LOCAL_DATA: path.join(PENDUDUK_DIR, 'local_data.json'),
    CHANGE_IDS: path.join(PENDUDUK_DIR, 'change_ids.json'),
    DIFFS: path.join(PENDUDUK_DIR, 'diffs.json')
}

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

class NewDataApi{
    constructor(){}

    getPenduduks(callback): void{
        let auth = getActiveAuth();
        let headers = getHttpHeaders();
        let changeId: number = 0; //full content
       
        if(PendudukLocalHandler.isChangeExists())
            changeId = PendudukLocalHandler.getLatestChangeId(); //get full content + diffs
        
        let URL =  SERVER + "/content/" + auth['desa_id'] + "/penduduk?changeId=" + changeId;
        let content = {
            data: null,
            columns: schemas.penduduk.map(e => e.field),
            changeId: null,
            diffs: []
        }

        request({ method: 'GET', url: URL, headers: getHttpHeaders() }, (err, resp, body) => {
            //Oops, there is something wrong.. Let's get data from local file
            if(err || resp.statusCode !== 200){
                content = PendudukLocalHandler.getLocalFileData();
                callback(content);
                return;
            }

            //Yeeeiy! latest content is successfully loaded!
            content = JSON.parse(body);

            //Now let's check some diffs from content
            //Wow, there are some diffs inside here.. let's merge them!
            if(content.diffs.length > 0)
              content = PendudukLocalHandler.mergeDiff(content.diffs);
            
            //Consider current data as local data
            PendudukLocalHandler.storeLocalData(content);

            //Final content is ready sir!
            callback(content);
        });
    }

    savePenduduk(data, callback): void {
        let auth = getActiveAuth();
        let headers = getHttpHeaders();

        let content: any = {
            data: data,
            columns: schemas.penduduk.map(e => e.field),
            diffs: PendudukLocalHandler.loadDiffs(),
            changeId: null
        }

        const URL = SERVER + "/content/" + auth['desa_id'] + "/penduduk";

        request({ method: 'POST', url: URL, headers: headers, json: content}, (err, resp, body) => {
            //Oops there is something wrong, let's consider this as a diff
            if(err || resp.statusCode !== 200){
                PendudukLocalHandler.storeDiff(data);
                return;
            }
            
            //Yeiy content has been saved! let's change local file stuffs
            else{
                PendudukLocalHandler.storeChangeId(resp['id']);
            
                //and store current data as server data and local data as well
                //wait, let's add latest change id to current content
                content.changeId = resp['id'];
                PendudukLocalHandler.storeServerData(content);
                PendudukLocalHandler.storeLocalData(content);
            }
           
            if(callback)
                callback(err, resp, body);
        });
    }
}

class PendudukLocalHandler{
    static storeDiff(diff): void {
        let diffs: any[] = [];

        if(jetpack.exists(PENDUDUK_DIR_FILE.DIFFS))
          diffs = JSON.parse(jetpack.read(PENDUDUK_DIR_FILE.DIFFS));
        
        diffs.push(diff);

        jetpack.write(PENDUDUK_DIR_FILE, JSON.stringify(diffs));
    }

    static loadDiffs(): any {
        if(jetpack.exists(PENDUDUK_DIR_FILE.DIFFS))
            return JSON.parse(jetpack.read(PENDUDUK_DIR_FILE.DIFFS));

        return [];
    }

    static mergeDiff(diffs): any {
        return {};
    }

    static storeChangeId(id): void{
        let changeIds: any[] = [];

        if(jetpack.exists(PENDUDUK_DIR_FILE.CHANGE_IDS))
          changeIds = JSON.parse(jetpack.read(PENDUDUK_DIR_FILE.CHANGE_IDS));
        
        changeIds.push(id);

        jetpack.write(PENDUDUK_DIR_FILE, JSON.stringify(changeIds));
    }

    static getLocalFileData(): any{
        if(jetpack.exists(PENDUDUK_DIR_FILE.LOCAL_DATA))
            return JSON.parse(jetpack.read(PENDUDUK_DIR_FILE.LOCAL_DATA));

        return {};
    }

    static getLatestChangeId(): any {
        let changes: any[] = JSON.parse(jetpack.read(PENDUDUK_DIR_FILE.CHANGE_IDS));
        return changes[changes.length - 1];
    }

    static isChangeExists(): boolean{
        if(!jetpack.read(PENDUDUK_DIR_FILE.CHANGE_IDS))
            return false;

        return true;
    }

    static storeServerData(data): void{
        jetpack.write(PENDUDUK_DIR_FILE.SERVER_DATA, JSON.stringify(data));
    }

    static storeLocalData(data): void{
        jetpack.write(PENDUDUK_DIR_FILE.LOCAL_DATA, JSON.stringify(data));
    }
}

class DesaLocalHandler{

}

class ApbdesLocalHandler{
    
}
