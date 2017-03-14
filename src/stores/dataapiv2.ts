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
jetpack.dir(CONTENT_DIR);

class DataapiV2{
    getAllPenduduk(callback): void{
        
    }

    savePenduduk(data): void {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        
        let mergedData = this.mergePenduduk(data);

        let content = {
            data: mergedData,
            columns: schemas.penduduk.map(s => s.field),
            id: null
        };

        let localContent = {
            data: mergedData,
            columns: schemas.penduduk.map(s => s.field)
        }

        const URL = SERVER + "/content/" + auth['desa_id'] + "/penduduk";
       
        let saveLocal = () => {};
        request({ method: 'POST', url: URL, headers: headers, json: content}, (err, resp,  body) => {
            if(err || resp.statusCode != 200){
               this.savePendudukDiff(content);
               return;
            }

            content.id = resp['id'];

            jetpack.write(path.join(PENDUDUK_DIR, 'local_data.json'), JSON.stringify(localContent));
            jetpack.write(path.join(PENDUDUK_DIR, 'server_data.json'), JSON.stringify(content));
            this.trackChanges(path.join(PENDUDUK_DIR, 'changes.json'), content.id);
        });
    }
    
    savePendudukDiff(data){

    }

    trackChanges(path, id){
        if(!jetpack.exists(path)){
            jetpack.write(path, JSON.stringify([id]));
            return;
        }
           
        let fileData = JSON.parse(jetpack.read(path));
        fileData.push(id);

        jetpack.write(path, JSON.stringify(fileData));
    }

    mergePenduduk(data): any{
        return null;
    }

    getActiveAuth(): any {
        let authFile = path.join(DATA_DIR, "auth.json");

        if(!jetpack.exists(authFile))
            return null;

        return JSON.parse(jetpack.read(authFile));
    }

    getHttpHeaders(): any {
        let auth = this.getActiveAuth();
        let token = auth ? auth['token'].trim() : null;
        return { "X-Auth-Token": token, "X-Sideka-Version": pjson.version }; 
    }
}
