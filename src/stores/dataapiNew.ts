import * as os from 'os';
import * as fs from 'fs';
import env from '../env';
import * as request from 'request';
import { remote } from 'electron';

var path = require('path');
var jetpack = require('fs-jetpack');
var pjson = require("./package.json");
var SERVER = "https://api.sideka.id";
var app = remote.app;
var DATA_DIR = app.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");
jetpack.dir(CONTENT_DIR);

class DataApiNew {
    constructor(){}
    
    getAllPenduduk(): void {

    }

    getAllKeluarga(): void {

    }

    getAllDesa(): void{

    }

    saveDesa(data: any): void {
        //if offline
        //var changes = this.getChanges(data: any);
        //otherwise save penduduk data

        let auth = this.getActiveAuth();
        let content = {};
        let URL = SERVER + "/content/" + auth['desa_id'] + "/desa";
    }

    savePenduduk(data: any): void {
        //if offline
        //var changes = this.getChanges(data: any);
        //otherwise save penduduk data

        let auth = this.getActiveAuth();
        let content = {};
        let URL = SERVER + "/content/" + auth['desa_id'] + "/penduduk";

        request.get(URL, { headers: this.getHttpHeaders(), json: content})
        .on('response', (resp) => {
            //online save
        });
    }

    saveKeluarga(data: any): void {
        //if offline
        //var changes = this.getChanges(data: any);
        //otherwise save penduduk data
    }

    //store contents to db that have been changed (online)
    storeChanges(data: any, type: string): void {

    }
    
    //Get only changed content
    getChanges(data: any): any{
        return null;
    }

    getHttpHeaders(): any {
        let auth = this.getActiveAuth();
        let token = auth ? auth['token'].trim() : null;
        return { "X-Auth-Token": token, "X-Sideka-Version": pjson.version };
    }

    getActiveAuth(): any {
        let authFile = path.join(DATA_DIR, "auth.json");

        if(!jetpack.exists(authFile))
            return null;

        return JSON.parse(jetpack.read(authFile));
    }

    login(): void {
        
    }

    logout(): void {

    }
}

export default new DataApiNew();
