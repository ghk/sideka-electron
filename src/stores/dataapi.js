import * as request from 'request';
import { remote } from 'electron';
import * as os from 'os';
import * as fs from 'fs';
const path = require('path');
const jetpack = require('fs-jetpack');
const pjson = require("./package.json");
const SERVER = "https://api.sideka.id";
//if(env.name !== "production")
//    SERVER = "http://10.10.10.107:5001";
const app = remote.app;
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
jetpack.dir(CONTENT_DIR);
class DataApi {
    constructor() {
        this.auth = {};
    }
    rmDirContents(dirPath) {
        try {
            var files = fs.readdirSync(dirPath);
        }
        catch (e) {
            return;
        }
        if (files.length <= 0)
            return;
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
        }
    }
    convertData(targetSchema, dataColumns, data) {
        if (!dataColumns)
            return data;
        var targetColumns = targetSchema.map(s => s.field);
        if (targetColumns.length == dataColumns.length) {
            var sameSchema = true;
            for (let i = 0; i < targetColumns.length; i++) {
                if (targetColumns[i] !== dataColumns[i]) {
                    sameSchema = false;
                    break;
                }
            }
            console.log("same schema:" + sameSchema);
            if (sameSchema)
                return data;
        }
        var result = [];
        var columnMaps = {};
        targetColumns.forEach(c => {
            var index = dataColumns.indexOf(c);
            columnMaps[c] = index;
        });
        for (let i = 0; i < data.length; i++) {
            var dataRow = data[i];
            var targetRow = targetColumns.map(c => {
                var index = columnMaps[c];
                if (index >= 0)
                    return dataRow[index];
                return null;
            });
            result.push(targetRow);
        }
        return result;
    }
    getActiveAuth() {
        let authFile = path.join(DATA_DIR, "auth.json");
        if (!jetpack.exists(authFile))
            return null;
        return JSON.parse(jetpack.read(authFile));
    }
    saveActiveAuth(auth) {
        let authFile = path.join(DATA_DIR, "auth.json");
        if (auth)
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    }
    getMetadatas() {
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        if (!jetpack.exists(fileName)) {
            jetpack.write(fileName, JSON.stringify({}));
        }
        return JSON.parse(jetpack.read(fileName));
    }
    getContentMetadata(key) {
        let metas = this.getMetadatas();
        return metas[key];
    }
    setContentMetadata(key, value) {
        let metas = this.getMetadatas();
        metas[key] = value;
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas));
    }
    login(user, password, callback) {
        let info = os.type() + " " + os.platform() + " " + os.release() + " " + os.arch() + " " + os.hostname() + " " + os.totalmem();
        let url = SERVER + "/login";
        let json = { "user": user, "password": password, "info": info };
        let headers = { "X-Sideka-Version": pjson.version };
        let me = this;
        request({ method: 'POST', url: url, json: json, headers: headers }, (err, response, body) => {
            if (!err && body.success) {
                let oldDesaId = me.getContentMetadata("desa_id");
                if (oldDesaId && oldDesaId != body.desa_id) {
                    let offlines = me.getContentMetadata("offlines");
                    if (offlines && offlines.length > 0) {
                        let dialog = remote.dialog;
                        let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
                            type: 'question',
                            buttons: ['Batal', 'Hapus Data Offline'],
                            title: 'Hapus Penyimpanan Offline',
                            message: 'Anda berganti desa tetapi data desa sebelumnya masih tersimpan secara offline. Hapus data offline tersebut?'
                        });
                        if (choice == 0) {
                            callback(1, response, null);
                            return;
                        }
                    }
                    me.rmDirContents(CONTENT_DIR);
                }
            }
            callback(err, response, body);
        });
    }
    logout() {
        let auth = this.getActiveAuth();
        this.saveActiveAuth(null);
        let url = SERVER + "/logout";
        let headers = { "X-Auth-Token": auth['token'].trim(), "X-Sideka-Version": pjson.version };
        request({ method: 'GET', url: url, headers: headers }, () => { });
    }
    checkAuth(callback) {
        let auth = this.getActiveAuth();
        let url = SERVER + "/check_auth/" + auth['desa_id'];
        let headers = { "X-Auth-Token": auth['token'].trim(), "X-Sideka-Version": pjson.version };
        request({ method: 'GET', url: url, headers: headers }, callback);
    }
    getOfflineDesa() {
        let results = [];
        let fileName = path.join(DATA_DIR, "desa.json");
        if (jetpack.exists(fileName))
            results = JSON.parse(jetpack.read(fileName));
        return results;
    }
    getDesa(callback) {
        let fileName = path.join(DATA_DIR, "desa.json");
        let fileContent = this.getOfflineDesa();
        let auth = this.getActiveAuth();
        let url = SERVER + '/desa';
        let headers = { "X-Auth-Token": auth['token'].trim(), "X-Sideka-Version": pjson.version };
        request({ method: 'GET', url: url, headers: headers }, (err, response, body) => {
            if (!response || response.statusCode != 200) {
                callback(fileContent);
                return;
            }
            jetpack.write(fileName, body);
            callback(JSON.parse(body));
        });
    }
    getContentSubTypes(type, callback) {
        let fileName = path.join(CONTENT_DIR, type + "_subtypes.json");
        let fileContent = [];
        let auth = this.getActiveAuth();
        let headers = { "X-Auth-Token": auth['token'].trim(), "X-Sideka-Version": pjson.version };
        let url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "/subtypes";
        if (jetpack.exists(fileName))
            fileContent = JSON.parse(jetpack.read(fileName));
        request({ method: 'GET', url: url, headers: headers }, (err, response, body) => {
            if (!response || response.statusCode != 200) {
                callback(fileContent);
                return;
            }
            jetpack.write(fileName, body);
            callback(JSON.parse(body));
        });
    }
    addOfflineContentSubType(type, subType) {
        let fileName = path.join(CONTENT_DIR, type + "_subtypes.json");
        let fileContent = [];
        if (jetpack.exists(fileName))
            fileContent = JSON.parse(jetpack.read(fileName));
        if (fileContent.indexOf(subType) == -1) {
            fileContent.push(subType);
            jetpack.write(fileName, JSON.stringify(fileContent));
        }
    }
    getContent(type, subType, defaultValue, schema, callback) {
        let key = type;
        if (subType)
            key = type + '_' + subType;
        let fileName = path.join(CONTENT_DIR, key + ".json");
        let fileContent = { data: defaultValue, timestamp: null, columns: null };
        let timestamp = 0;
        let auth = this.getActiveAuth();
        this.setContentMetadata("desa_id", auth['desa_id']);
        if (jetpack.exists(fileName)) {
            fileContent = JSON.parse(jetpack.read(fileName));
            timestamp = fileContent.timestamp;
        }
        let offlines = this.getContentMetadata("offlines");
        if (offlines && offlines.indexOf(key) != -1) {
            callback(this.convertData(schema, fileContent.columns, fileContent.data));
            return;
        }
        let url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "?timestamp=" + timestamp;
        if (subType)
            url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "/" + subType + "?timestamp=" + timestamp;
        let headers = { "X-Auth-Token": auth['token'].trim(), "X-Sideka-Version": pjson.version };
        let me = this;
        request({ method: 'GET', url: url, headers: headers }, (err, response, body) => {
            if (!response || response.statusCode != 200) {
                callback(me.convertData(schema, fileContent.columns, fileContent.data));
                return;
            }
            jetpack.write(fileName, body);
            let content = JSON.parse(body);
            callback(me.convertData(schema, content.columns, content.data));
        });
    }
    saveContent(type, subType, data, schema, callback) {
        let content = {
            data: data,
            columns: schema.map(s => s.field),
            timestamp: new Date().getTime()
        };
        let key = type;
        if (subType)
            key = type + '_' + subType;
        let fileName = path.join(CONTENT_DIR, key + ".json");
        let auth = this.getActiveAuth();
        this.setContentMetadata("desa_id", auth['desa_id']);
        let url = SERVER + "/content/" + auth['desa_id'] + "/" + type;
        if (subType)
            url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "/" + subType;
        let headers = { "X-Auth-Token": auth['token'].trim(), "X-Sideka-Version": pjson.version };
        let me = this;
        request({ method: 'POST', url: url, headers: headers, json: content }, (err, response, body) => {
            if (!err && response.statusCode == 200) {
                jetpack.write(fileName, JSON.stringify(content));
                //mark this content is no longer saved offline
                me.unMarkOfflineContent(key);
            }
            else if (err) {
                let dialog = remote.dialog;
                let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
                    type: 'question',
                    buttons: ['Tidak', 'Simpan Offline'],
                    title: 'Penyimpanan Offline',
                    message: 'Penyimpanan ke server gagal, apakah anda ingin menyimpan secara offline?'
                });
                if (choice == 1) {
                    me.markOfflineContent(key);
                    if (subType)
                        me.addOfflineContentSubType(type, subType);
                    jetpack.write(fileName, JSON.stringify(content));
                    err = null;
                }
            }
            if (callback)
                callback(err, response, body);
        });
    }
    saveNextOfflineContent() {
        let offlines = this.getContentMetadata("offlines");
        let auth = this.getActiveAuth();
        if (!offlines || !offlines.length || !auth) {
            //timeout 10 minutes;
            console.log("offline save: no offline or no auth.");
            setTimeout(() => {
                this.saveNextOfflineContent();
            }, 600000);
            return;
        }
        let key = offlines[0];
        let splitted = key.split("_");
        let type = splitted[0];
        let subType = splitted.length > 1 ? splitted[1] : null;
        let fileName = path.join(CONTENT_DIR, key + ".json");
        let content = JSON.parse(jetpack.read(fileName));
        console.log("offline save: saving " + key);
        let url = SERVER + "/content/" + auth['desa_id'] + "/" + type;
        if (subType)
            url = SERVER + "/content/" + auth['desa_id'] + "/" + type + "/" + subType;
        let headers = { "X-Auth-Token": auth['token'].trim(), "X-Sideka-Version": pjson.version };
        let me = this;
        request({ method: 'POST', url: url, headers: headers }, (err, response, body) => {
            console.log("offline save: result: ", err, response);
            if (!err && response.statusCode == 200) {
                jetpack.write(fileName, JSON.stringify(content));
                me.unMarkOfflineContent(key);
            }
            setTimeout(() => {
                this.saveNextOfflineContent();
            }, 600000);
        });
    }
    markOfflineContent(key) {
        let offlines = this.getContentMetadata("offlines");
        if (!offlines)
            offlines = [];
        if (offlines.indexOf(key) == -1)
            offlines.push(key);
        this.setContentMetadata("offlines", offlines);
    }
    unMarkOfflineContent(key) {
        let offlines = this.getContentMetadata("offlines");
        if (offlines) {
            let idx = offlines.indexOf(key);
            if (idx != -1) {
                offlines.splice(idx, 1);
                this.setContentMetadata("offlines", offlines);
            }
        }
    }
}
export default new DataApi();
