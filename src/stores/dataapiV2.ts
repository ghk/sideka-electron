import * as os from "os";
import * as fs from "fs";
import * as request from "request";
import * as path from "path";
import env from "../env";
import { remote } from "electron";
import schemas from "../schemas";

const base64 = require("uuid-base64");
const uuid = require("uuid");
const changesets = require('diff-json');
const jetpack = require("fs-jetpack");
const pjson = require("./package.json");
const app = remote.app;
const SERVER = 'http://localhost:5001';
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

const convertData = (targetSchema, dataColumns, data) => {
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

const evaluateDiff = (pre, post) => {
    let equals = (a, b) => {
        if(a === b)
            return true;

        if((a === null || a === undefined ) && (b === null || b === undefined))
            return true;

        return false;
    }

    let toMap = (arr, idIndex) => {
        var result = {};
        arr.forEach(function(i){
            result[i[idIndex]] = i;
        })
        return result;
    }

    let result: any = { "modified": [], "added": [], "deleted": [], "total": 0}; 
    let preMap = toMap(pre, 0);
    let postMap = toMap(post, 0);
    let preKeys = Object.keys(preMap);
    let postKeys = Object.keys(postMap);

    result.deleted = preKeys.filter(k => postKeys.indexOf(k) < 0).map(k => preMap[k]);
    result.added = postKeys.filter(k => preKeys.indexOf(k) < 0).map(k => postMap[k]);
    
    for(var i = 0; i < preKeys.length; i++) {
        var id = preKeys[i];
        var preItem = preMap[id];
        var postItem = postMap[id];

        if(!postItem)
            continue;

        for(var j = 0; j < preItem.length; j++){
            if(!equals(preItem[j], postItem[j])){
                result.modified.push(postItem);
                break;
            }
        }
    }
    
    result.total = result.deleted.length + result.added.length + result.modified.length;
    return result;
}

const mergeDiff = (diffs, data) => {
    for(let i=0; i<diffs.length; i++){
        for (let j=0; j < diffs[i].deleted.length; j++){
            for(let k=0; k<data.length; k++){
                if(data[k][0] === diffs[i]["deleted"][j][0]){
                    data.splice(k, 1);
                    break;
                }
            }
        }

        for (let j=0; j < diffs[i].added.length; j++){
            for(let k=0; k<data.length; k++){
                if(data[k][0] === diffs[i]["added"][j][0] && data[k][1] === diffs[i]["added"][j][1]){
                    data.push(diffs[i]["added"])
                    break;
                }
            }
        }

        for (let j=0; j < diffs[i].modified.length; j++){
            for(let k=0; k<data.length; k++){
                if(data[k][0] === diffs[i]["modified"][j][0] && data[k][1] === diffs[i]["modified"][j][1]){
                    data[k] = diffs[i]["modified"][j];
                    break;
                }
            }
        }
    }

    return data;
}

class DataapiV2{
    constructor(){}

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

    getContent(type, subType, data, schema, callback): void{
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let pathType = path.join(CONTENT_DIR,  type + ".json");
        let dataType = { 
            "changeId": 0, 
            "content": { "columns": schema.map(s => s.field), "data": [], "diffs": [] } 
        }

        if(!jetpack.exists(pathType))
           jetpack.write(pathType, dataType);
        else
           dataType = JSON.parse(jetpack.read(pathType));

        let activeChangeId = dataType.changeId;
        let url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "?changeId=" + activeChangeId;

        if(subType)
            url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "/" + subType + "?changeId=" + activeChangeId;
        
        request({ method: 'GET', url: url, headers: headers }, (err, response, body) => {
            if(!err && response.statusCode === 200){
                let result = JSON.parse(body);

                if(result["diffs"])
                    dataType.content.diffs = result["diffs"];
                else if(result["content"])
                    dataType.content.data = result["content"];
            }
 
            if(dataType.content.diffs && dataType.content.diffs.length > 0){
                dataType.content.data = mergeDiff(dataType.content.diffs, dataType.content.data);
                dataType.content.diffs = [];
            }

            jetpack.write(pathType, JSON.stringify(dataType));

            if(dataType.content.data.length > 0)
                callback(convertData(schema, dataType.content.columns, dataType.content.data));
        });
    }

    saveContent(type, subType, data, schema, callback): void {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let pathType = path.join(CONTENT_DIR,  type + ".json");
        let dataType = JSON.parse(jetpack.read(pathType));
        let currentDiff = evaluateDiff(dataType.content.data, data);
        let activeChangeId = dataType.changeId;
        let content = { "diffs": dataType.content.diffs, "columns": dataType.content.columns };
        let url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "?changeId=" + activeChangeId;
        
        if(!dataType.content.diffs)
            dataType.content.diffs = [];

        dataType.content.diffs.push(currentDiff);

        if(subType)
             url= SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "/" + subType + "?changeId=" + activeChangeId;

        request({ method: 'POST', url: url, headers: headers, json: content }, (err, response, body) => {
            if(!err && response.statusCode === 200)
                dataType.changeId = body.changeId;
            
            dataType.content.diffs = [];
            jetpack.write(pathType, JSON.stringify(dataType));

            if(callback)
                callback(err, response, body);
        });
    }
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

export default new DataapiV2();
