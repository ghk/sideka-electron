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
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let changeId = 0;

        const CHANGES_PATH = path.join(PENDUDUK_DIR, 'changes.json');
        const LOCAL_PATH = path.join(PENDUDUK_DIR, 'local_data.json');
        
        if(jetpack.exists(CHANGES_PATH)){
            let changeIds = JSON.parse(jetpack.read(CHANGES_PATH));
            changeId = changeIds[changeIds.length - 1];
        }
        
        const URL = SERVER + "/content/" + auth['desa_id'] + "/penduduk?changeId=" + changeId;
        
        request({ method: 'GET', url: URL, headers: headers}, (err, resp, body) => {
            if(!resp || resp.statusCode != 200){
                if(jetpack.exists(LOCAL_PATH)){
                    let fileContent = JSON.parse(jetpack.read(LOCAL_PATH));
                    callback(this.convertData(schemas.penduduk, fileContent.columns, fileContent.data));
                }
                return;
            }

            let content = JSON.parse(body);

            if(jetpack.exists(CHANGES_PATH)){
                let changeIds = JSON.parse(jetpack.read(CHANGES_PATH));
                changeIds.push(content.changeId);
                jetpack.write(CHANGES_PATH, changeIds);
            }

            if(jetpack.exists(LOCAL_PATH)){
                let data = content;
                jetpack.write(LOCAL_PATH, body);
            }

            callback();
        });
    }

    savePenduduk(data): void {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let mergedData = this.mergePenduduk(data);

        let content = {
            data: mergedData,
            columns: schemas.penduduk.map(s => s.field),
            changeId: null
        };

        const URL = SERVER + "/content/" + auth['desa_id'] + "/penduduk";
       
        request({ method: 'POST', url: URL, headers: headers, json: content}, (err, resp,  body) => {
            if(err || resp.statusCode != 200){
               this.savePendudukDiff(content);
               return;
            }

            content.changeId = resp['id'];

            jetpack.write(path.join(PENDUDUK_DIR, 'server_data.json'), JSON.stringify(content));
            
            if(!jetpack.exists(path)){
                jetpack.write(path, JSON.stringify([content.changeId]));
                return;
            }
           
            let fileData = JSON.parse(jetpack.read(path));
            fileData.push(content.changeId);
            jetpack.write(path, JSON.stringify(fileData));
        });
    }
    
    //Merge diff1 + diff2 + ... + diffn
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

    convertData(targetSchema, dataColumns, data): any {
        if(!dataColumns)
            return data;
        
        var targetColumns = targetSchema.map(s => s.field);

        if(targetColumns.length == dataColumns.length){
            var sameSchema = true;

            for(let i = 0; i < targetColumns.length; i++){
                if(targetColumns[i] !== dataColumns[i]){
                    sameSchema = false;
                    break;
                }
            }

            console.log("same schema:" + sameSchema);

            if(sameSchema)
                return data; 
        }

        var result = [];
        var columnMaps = {};

        targetColumns.forEach(c => {
            var index = dataColumns.indexOf(c);
            columnMaps[c] = index;
        });

        for(let i = 0; i < data.length; i++){
            var dataRow = data[i];
            var targetRow = targetColumns.map(c => {
                var index = columnMaps[c];

                if(index >= 0)
                    return dataRow[index];

                return null;
            });

            result.push(targetRow);
        }

        return result;
    }
}
