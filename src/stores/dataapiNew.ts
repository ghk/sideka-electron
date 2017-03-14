import * as os from 'os';
import * as fs from 'fs';
import env from '../env';
import * as request from 'request';
import { remote } from 'electron';
import schemas from "../schemas";

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
    
    getAllPenduduk(callback): void {
        let auth = this.getActiveAuth();
        let timestamp = 0;
        let fileName =  path.join(CONTENT_DIR, "penduduk.json");
        let fileContent = {data: [], timestamp: null, columns: null};
        
        this.setContentMetadata("desa_id", auth['desa_id']);

        if(jetpack.exists(fileName)){
            fileContent = JSON.parse(jetpack.read(fileName));
            timestamp = fileContent.timestamp;
        }

        let offlines = this.getContentMetadata("offlines");

        if(offlines && offlines.indexOf('penduduk') != -1){
            callback(this.convertData(schemas.penduduk, fileContent.columns, fileContent.data));
            return;
        }

        const URL = SERVER + "/content/" + auth['desa_id'] + "/penduduk" + "?timestamp=" + timestamp;

        request({ method: 'GET', url: URL, headers: this.getHttpHeaders() }, (err, resp, body) => {
            if(!resp || resp.statusCode != 200){
                callback(this.convertData(schemas.penduduk, fileContent.columns, fileContent.data));
                return;
            }

            jetpack.write(fileName, body);
            let content = JSON.parse(body);
            callback(this.convertData(schemas.penduduk, content.columns, content.data));
        });
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
        let offlines = this.getContentMetadata('offlines');
        
        if(offlines && offlines.indexOf(type) > -1){
            
        }
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

    getMetadatas(): any{
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        if(!jetpack.exists(fileName)){
            jetpack.write(fileName, JSON.stringify({}));
        }
        return JSON.parse(jetpack.read(fileName));
    }

    getContentMetadata(key): any {
        let metas = this.getMetadatas();
        return metas[key];
    }

    setContentMetadata(key, value): void{
        let metas = this.getMetadatas();
        metas[key] = value;
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas));
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

export default new DataApiNew();
