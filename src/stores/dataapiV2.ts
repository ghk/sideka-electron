import * as os from "os";
import * as fs from "fs";
import * as request from "request";
import * as path from "path";
import env from "../env";
import { remote } from "electron";
import schemas from "../schemas";

const jetpack = require("fs-jetpack");
const pjson = require("./package.json");
const app = remote.app;
const SERVER = 'http://10.10.10.107:5001';
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

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
        let dataBundle = { 
            "changeId": 0, 
            "content": { "columns": schema.map(s => s.field), "data": [], "diffs": [] } 
        }
        
        if(!jetpack.exists(pathType))
           jetpack.write(pathType, dataBundle);
        else
           dataBundle = JSON.parse(jetpack.read(pathType));

        let activeChangeId = dataBundle.changeId;
        let url = SERVER + "/v2/content/" + auth['desa_id'] + "/" + type;

        if(subType)
            url += "/" + subType;

        url += "?changeId=" + activeChangeId
      
        let that = this;
        
        request({ method: 'GET', url: url, headers: headers }, (err, response, body) => {
            if(!err && response.statusCode === 200){
                let result = JSON.parse(body);

                if(result["diffs"])
                    dataBundle.content.diffs = result["diffs"];
                else if(result["content"])
                    dataBundle.content.data = result["content"].data;
                
                if(dataBundle.content.diffs && dataBundle.content.diffs.length > 0){
                    dataBundle.content.data = that.mergeDiff(dataBundle.content.diffs, dataBundle.content.data);
                    dataBundle.content.diffs = [];
                }
            }
 
            jetpack.write(pathType, JSON.stringify(dataBundle));
            callback(that.transformData(schema, dataBundle.content.columns, dataBundle.content.data));
        });
    }
    
    getOfflineDesa(): any{
        let results = [];
        let fileName = path.join(DATA_DIR, "desa.json");

        if(jetpack.exists(fileName))
            results =  JSON.parse(jetpack.read(fileName));

        return results;
    }

    getDesa(callback): void {
        let fileName = path.join(DATA_DIR, "desa.json");
        let fileContent = this.getOfflineDesa();
        let url = SERVER + '/desa';
        let headers = this.getHttpHeaders();

        request({ method: 'GET', url: url, headers: headers }, (err, response, body) => {
            if(!response || response.statusCode != 200){
                callback(fileContent);
                return;
            }
             
            jetpack.write(fileName, body);
            callback(JSON.parse(body));
        });
    }

    saveContent(type, subType, data, schema, callback): void {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let pathType = path.join(CONTENT_DIR,  type + ".json");
        let dataBundle = JSON.parse(jetpack.read(pathType));
        let currentDiff = this.evaluateDiff(dataBundle.content.data, data);
     
        let activeChangeId = dataBundle.changeId;
        let content = { "diffs": dataBundle.content.diffs, "columns": dataBundle.content.columns };
       
        if(!dataBundle.content.diffs)
            dataBundle.content.diffs = [];

        dataBundle.content.diffs.push(currentDiff);

        let url = SERVER + "/v2/content/" + auth['desa_id'] + "/" + type;
        
        if(subType)
            url += "/" + subType;

        url += "?changeId=" + activeChangeId;

        request({ method: 'POST', url: url, headers: headers, json: content }, (err, response, body) => {
            if(!err && response.statusCode === 200)
                dataBundle.changeId = body.changeId;
            
            dataBundle.content.diffs = [];
            jetpack.write(pathType, JSON.stringify(dataBundle));

            if(callback)
                callback(err, response, body);
        });
    }

    saveActiveAuth(auth): void {
        let authFile = path.join(DATA_DIR, "auth.json");
        if(auth)
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    }

    login(user, password, callback): void{
        let info = os.type()+" "+os.platform()+" "+os.release()+" "+os.arch()+" "+os.hostname()+" "+os.totalmem();
        let url = SERVER + "/login";
        let json = {"user": user, "password": password, "info": info};
        let headers = { "X-Sideka-Version": pjson.version };

        request({ method: 'POST', url: url, json: json, headers: headers }, (err, response, body) => {
            if(!err && body.success){
                let oldDesaId = MetadataHandler.getContentMetadata("desa_id");
                if(oldDesaId && oldDesaId != body.desa_id){
                    let offlines = MetadataHandler.getContentMetadata("offlines");

                    if(offlines && offlines.length > 0){
                        let dialog = remote.dialog;
                        let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
                            type: 'question',
                            buttons: ['Batal', 'Hapus Data Offline'],
                            title: 'Hapus Penyimpanan Offline',
                            message: 'Anda berganti desa tetapi data desa sebelumnya masih tersimpan secara offline. Hapus data offline tersebut?'
                        });

                        if(choice == 0){
                            callback(1, response, null);
                            return;
                        }
                    }
                    
                    MetadataHandler.rmDirContents(CONTENT_DIR);
                }
            }

            callback(err, response, body);
        });
    }

    logout(): void {
        let headers = this.getHttpHeaders();
        this.saveActiveAuth(null);
        let url = SERVER + "/logout";
        request({ method: 'GET', url: url, headers: headers}, () =>{});
    }

    checkAuth(callback): void{
        let auth = this.getActiveAuth();
        let url = SERVER + "/check_auth/" + auth['desa_id'];
        let headers = this.getHttpHeaders();
        request({ method: 'GET', url: url, headers: headers}, callback);
    }

    transformData(targetSchema, dataColumns, data): any {
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

    evaluateDiff(pre, post): any{
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

    mergeDiff(diffs, data): any{
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
