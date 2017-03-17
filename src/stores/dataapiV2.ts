import * as os from "os";
import * as fs from "fs";
import * as request from "request";
import * as path from "path";
import env from "../env";
import { remote } from "electron";
import schemas from "../schemas";

const changesets = require('diff-json');
const jetpack = require("fs-jetpack");
const pjson = require("./package.json");
const app = remote.app;
const SERVER = 'http://localhost:5001';
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

interface Diff{
    modified: any[];
    deleted: any[];
    added: any[];
    total: number;
}

interface Content{
    data: any;
    diffs: Diff[];
    columns: any;
}

interface Body{
    content: Content;
    changeId: number;
}

class MetadataHandler{
    static rmDirContents(dirPath): void {
        try { var files = fs.readdirSync(dirPath); }
        catch(e) { return; }

        if (files.length <= 0)
            return;
        
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
        }
    }

    static getMetadatas(): any{
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        if(!jetpack.exists(fileName)){
            jetpack.write(fileName, JSON.stringify({}));
        }
        return JSON.parse(jetpack.read(fileName));
    }

    static getContentMetadata(key): any {
        let metas = MetadataHandler.getMetadatas();
        return metas[key];
    }

    static setContentMetadata(key, value): void{
        let metas = MetadataHandler.getMetadatas();
        metas[key] = value;
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas));
    }
}

class DataapiV2{
    constructor(){}
    
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

    getActiveAuth(): any{
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

    getLatestDiff(type, after): Diff {
        let result: Diff = {
            modified: [],
            added: [],
            deleted: [],
            total: 0
        }

        let localData = MetadataHandler.getContentMetadata("local");

        if(!localData[type])
            return after;
        
        let before: any[] = localData[type].data;
        
        for(let i=0; i<before.length; i++){
            let beforeData: any = before[i];
            let afterData: any= after[i];
            let diff = changesets.diff(beforeData, afterData);
            
            if(diff.length > 0){
                let changeType = diff[0].type;

                if(changeType === 'update')
                    result.modified.push(afterData);
                
                else if(changeType === 'add')
                    result.added.push(afterData);
                
                else if(changeType === 'delete')
                    result.deleted.push(afterData);

                result.total += 1;
            }
        }
       
        return result;
    }

    getContent(type, subType, data, schema, callback): void {
        let changeIds: any = MetadataHandler.getContentMetadata("changeIds");
        let localData = MetadataHandler.getContentMetadata("local");
        let diffs: any = MetadataHandler.getContentMetadata("diffs");
        
        if(!changeIds){
            MetadataHandler.setContentMetadata("changeIds", {});
            changeIds = {};
        }  

        if(!localData){
             MetadataHandler.setContentMetadata("local", {});
             localData = {};
        }

        if(!diffs){
             MetadataHandler.setContentMetadata("diffs", {});
             diffs = {};
        }

        if(!changeIds[type]){
            changeIds[type] = [0];
            MetadataHandler.setContentMetadata("changeIds", changeIds);
        }

        if(!localData[type]){
            localData[type] = {};
            MetadataHandler.setContentMetadata("local", localData);
        }

        if(!diffs[type]){
            diffs[type] = [];
            MetadataHandler.setContentMetadata("diffs", diffs);
        }

        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let changeId = changeIds[type].length > 0 ? changeIds[type][changeIds[type].length - 1] : 0;

        let content: Content = {
            data: null,
            diffs: [],
            columns: schema.map(s => s.field)
        }

        let result: Body = {"content": content, "changeId": 0};

        let url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "?changeId=" + changeId;
        
        if(subType)
            url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "/" + subType + "?changeId=" + changeId;

        request({ method: 'GET', url: url, headers: headers}, (err, response, body) => {
            if(err || response.statusCode !== 200){
                callback(this.convertData(schema, localData[type].columns, localData[type].data));
                return;
            }

            result = JSON.parse(body);
            
            let lastChangeId = changeIds[type][changeIds[type].length - 1];

            if(lastChangeId != result.changeId)
                changeIds[type].push(result.changeId);

            localData[type] = result.content;
            
            MetadataHandler.setContentMetadata('local', localData);
            MetadataHandler.setContentMetadata('changeIds', changeIds);
            callback(this.convertData(schema, result.content.columns, result.content.data));
        });
    }

    saveContent(type, subType, data, schema, callback): void{
        let changeIds: any = MetadataHandler.getContentMetadata("changeIds");
        let localData = MetadataHandler.getContentMetadata("local");
        let diffs: any = MetadataHandler.getContentMetadata("diffs");
        
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let currentDiff = this.getLatestDiff(type, data);
        let changeId = changeIds[type][changeIds[type].length - 1];

        let content: Content= {
            data: null,
            diffs: diffs[type].concat(currentDiff),
            columns: schema.map(s => s.field),
        }

        let result: Body = {content: content, changeId: 0};
        let url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "?changeId=" + changeId;

        if(subType)
            url= SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "/" + subType + "?changeId=" + changeId;

        request({ method: 'POST', url: url, headers: headers, json: content}, (err, response, body) => {
            if(err || response.statusCode !== 200){  
                //Harus dicek lagi diffnya, kalau sama (gak berubah ya ga usah dipush)
                //diffs[type].push(currentDiff);
                MetadataHandler.setContentMetadata("diffs", diffs);
            }
            else{
                result = body;
                localData[type] = data;
                changeIds[type].push(result["changeId"]);
                MetadataHandler.setContentMetadata("changeIds", changeIds);
                MetadataHandler.setContentMetadata("local", localData);
                diffs[type] = [];
                MetadataHandler.setContentMetadata("diffs", diffs);
            }
            if(callback)
                callback(err, response, body);
        });
    }
}

export default new DataapiV2();
