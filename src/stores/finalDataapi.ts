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

const equals = (a, b) => {
    if(a === b)
        return true;

    if((a === null || a === undefined ) && (b === null || b === undefined))
        return true;

    return false;
}

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

const mergeDiff = (diffs, localData) => {
    for(let i=0; i<diffs.length; i++){
        for (let j=0; j < diffs[i].deleted.length; j++){
            for(let k=0; k<localData.length; k++){
                if(localData[k][0] === diffs[i]["deleted"][j][0] && localData[k][1] === diffs[i]["deleted"][j][1]){
                    localData.splice(k, 1);
                    break;
                }
            }
        }

        for (let j=0; j < diffs[i].added.length; j++){
            for(let k=0; k<localData.length; k++){
                if(localData[k][0] === diffs[i]["added"][j][0] && localData[k][1] === diffs[i]["added"][j][1]){
                    localData.push(diffs[i]["added"])
                    break;
                }
            }
        }

        for (let j=0; j < diffs[i].modified.length; j++){
            for(let k=0; k<localData.length; k++){
                if(localData[k][0] === diffs[i]["modified"][j][0] && localData[k][1] === diffs[i]["modified"][j][1]){
                    localData[k] = diffs[i]["modified"][j];
                    break;
                }
            }
        }
    }

    return localData;
}

 const toMap = function(arr, idIndex){
    var result = {};
    arr.forEach(function(i){
        result[i[idIndex]] = i;
    })
    return result;
}

const getDiff = (pre, post) => {
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

class FinalDataapi{
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

    getContent(type, subType, data, schema, callback): void {
        let changeIds: any = MetadataHandler.getContentMetadata("changeIds");
        let locals: any = MetadataHandler.getContentMetadata("locals");
        let diffs: any = MetadataHandler.getContentMetadata("diffs");

        if(!changeIds){
          changeIds = {};
          changeIds[type] = [];
          MetadataHandler.setContentMetadata("changeIds", changeIds);
        }

        if(!locals){
          locals = {};
          locals[type] = {};
          MetadataHandler.setContentMetadata("locals", locals);
        }

        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let changeId: number = changeIds[type].length > 0 ? changeIds[type][changeIds[type].length - 1] : 0;
        let content: any = { "data": null, "diffs": [], "columns": schema.map(e => e.field) };
        let result: any = {"content": content, "changeId": 0};

        let url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "?changeId=" + changeId;
        
        if(subType){
              url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "/" + subType + "?changeId=" 
                + changeId;
        }

        request({ method: 'GET', url: url, headers: headers }, (err, resp, body) => {
             if(err || resp.statusCode !== 200){
                if(locals[type])
                    callback(convertData(schema, locals[type].columns, locals[type].data));
                return;
            }

            result = JSON.parse(body);

            let lastChangeId = changeIds[type][changeIds[type].length - 1];

            if(lastChangeId != result.changeId)
                changeIds[type].push(result.changeId);

            if(result["diffs"]){
                let mergedData = mergeDiff(result["diffs"], locals[type]["data"]);
                locals[type]["data"] = mergedData;
            }
            else if(result["content"]){
                locals[type] = result["content"];
            }
            
            if(!locals[type]["diffs"])
                locals[type]["diffs"] = [];
            
            MetadataHandler.setContentMetadata('locals', locals);
            MetadataHandler.setContentMetadata('changeIds', changeIds);
            callback(convertData(schema, locals[type].columns, locals[type].data));
        });
    }

    saveContent(type, subType, data, schema, callback): void {
        let changeIds: any = MetadataHandler.getContentMetadata("changeIds");
        let locals = MetadataHandler.getContentMetadata("locals");
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let localData = locals[type]["data"];
        let changeId = changeIds[type][changeIds[type].length - 1];
        let currentDiff = getDiff(localData, data);
        
        //Mesti cek diff yang di lokal, klo currentDiff udah ada jangan dipush
        if(locals[type]["diffs"].indexOf(currentDiff) === -1)
           locals[type]["diffs"].push(currentDiff);

        let content = { "diffs": locals[type]["diffs"], "columns": schema.map(s => s.field)};

        let result = {"content": content, "changeId": 0};
        let url = SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "?changeId=" + changeId;

        if(subType)
            url= SERVER + "/content_new/" + auth['desa_id'] + "/" + type + "/" + subType + "?changeId=" + changeId;
        
        request({ method: 'POST', url: url, headers: headers, json: content }, (err, resp, body) => {
            if(!err && resp.statusCode === 200){
                changeIds[type].push(body.changeId);
                MetadataHandler.setContentMetadata("changeIds", changeIds);

                //reset diffs
                locals[type]["diffs"] = [];   
            }
        
            MetadataHandler.setContentMetadata("locals", locals);

            if(callback)
                callback(err, resp, body);
        });
    }
}

export default new FinalDataapi();
