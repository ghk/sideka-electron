import * as os from "os";
import * as fs from "fs";
import * as request from "request";
import * as path from "path";
import { remote } from "electron";

import env from "../env";
import schemas from "../schemas";
import { DiffTracker } from '../helpers/diffTracker';
import settings from '../stores/settings';
import { Siskeudes } from '../stores/siskeudes';

var base64 = require("uuid-base64");
var uuid = require("uuid");
var jetpack = require("fs-jetpack");
var pjson = require("./package.json");
var progress = require('request-progress');

const APP = remote.app;
const SERVER = "http://10.10.10.107:5001";
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DESA_SOURCES = 'geojson_desa_sources';
const DATA_SOURCES = 'data';

const DATA_TYPE_DIRS = {
    "penduduk": 'penduduk',
    "logSurat": 'penduduk',
    "mutasi": 'penduduk',
    "perencanaan": 'perencanaan',
    "renstra": 'perencanaan',
    "rpjm": 'perencanaan',
    "rkp1": 'perencanaan',
    "rkp2": 'perencanaan',
    "rkp3": 'perencanaan',
    "rkp4": 'perencanaan',
    "rkp5": 'perencanaan',
    "rkp6": 'perencanaan',
    "mapping": 'mapping'
};

interface BundleData {
    [key: string]: any[]
}

interface DiffItem {
    added: any[],
    modified: any[],
    deleted: any[],
    total: number
}

interface BundleDiffs {
    [key: string]: DiffItem[]
}

interface Bundle {
    changeId: number,
    columns: { [key: string]: string[] },
    data: BundleData,
    diffs: BundleDiffs,
    createdBy?: string,
    modifiedBy?: string,
    createdTimestamp?: number,
    modifiedTimestamp?: number
}

class DataApi {
    diffTracker: DiffTracker;

    constructor() {
        this.diffTracker = new DiffTracker();
    }

    getActiveAuth(): any {
        let authFile = path.join(DATA_DIR, "auth.json");

        if (!jetpack.exists(authFile))
            return null;

        return JSON.parse(jetpack.read(authFile));
    }

    getHttpHeaders(): any {
        let auth = this.getActiveAuth();
        let token = auth ? auth['token'].trim() : null;
        return { "X-Auth-Token": token, "X-Sideka-Version": pjson.version };
    }

    getOfflineDesa(): any {
        let results = [];
        let fileName = path.join(DATA_DIR, "desa.json");

        if (jetpack.exists(fileName))
            results = JSON.parse(jetpack.read(fileName));

        return results;
    }

    getDesa(callback): void {
        let fileName = path.join(DATA_DIR, "desa.json");
        let fileContent = this.getOfflineDesa();
        let url = SERVER + '/desa';
        let headers = this.getHttpHeaders();

        request({ method: 'GET', url: url, headers: headers }, (err, response, body) => {
            if (!response || response.statusCode != 200) {
                callback(fileContent);
                return;
            }

            jetpack.write(fileName, body);
            callback(JSON.parse(body));
        });
    }

    getContent(dataType, subType, bundleData, bundleSchemas, callback): void {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let keys = Object.keys(bundleSchemas);
        let bundleDiffs = {};
        let columns = {};
        let type: string = DATA_TYPE_DIRS[dataType];
        let jsonFile = path.join(CONTENT_DIR, type + '.json');

        bundleDiffs[dataType] = [];
        columns[dataType] = [];

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            columns[key] = bundleSchemas[key].map(s => s.field);
        }

        let bundle: Bundle = {
            changeId: 0,
            columns: columns,
            data: bundleData,
            diffs: bundleDiffs
        }

        if (!jetpack.exists(jsonFile))
            jetpack.write(jsonFile, bundle);
        else
            bundle = JSON.parse(jetpack.read(jsonFile));

        if (!bundle.diffs[dataType])
            bundle.diffs[dataType] = [];

        let currentChangeId = bundle.changeId;
        let url = SERVER + "/content/2.0/" + auth['desa_id'] + "/" + type + "/" + dataType;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + currentChangeId;

        let allDiffs = bundle.diffs[dataType];
        let me = this;
        
        request({ method: 'GET', url: url, headers: me.getHttpHeaders() }, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                let result = JSON.parse(body);
                let diffs = [];

                if (result["diffs"]) {
                    diffs = result["diffs"];
                    allDiffs = diffs.concat(allDiffs);
                }

                else if (result["data"] && dataType === 'penduduk') {
                    if (Array.isArray(result["data"]))
                        bundle.data[dataType] = result["data"];
                    else
                        bundle.data = result["data"];
                }

                bundle.changeId = result.change_id;
            }

            if (allDiffs.length > 0)
                bundle.data[dataType] = this.mergeDiffs(allDiffs, bundle.data[dataType]);

            jetpack.write(jsonFile, JSON.stringify(bundle));
            callback(me.transformData(bundleSchemas[dataType], bundle.columns[dataType], bundle.data[dataType]));
        });
    }

    saveContent(dataType, subType, bundleData, bundleSchemas, callback: any): void {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let type: string = DATA_TYPE_DIRS[dataType];
        let jsonFile = path.join(CONTENT_DIR, type + '.json');
        let bundle: Bundle = JSON.parse(jetpack.read(jsonFile));

        if (!bundle.data[dataType])
            bundle.data[dataType] = [];

        let currentDiff = this.diffTracker.trackDiff(bundle.data[dataType], bundleData[dataType]);
        let currentChangeId = bundle.changeId;

        if (!bundle.diffs[dataType])
            bundle.diffs[dataType] = [];

        if (currentDiff.total > 0)
            bundle.diffs[dataType].push(currentDiff);

        let url = SERVER + "/content/2.0/" + auth['desa_id'] + "/" + type + "/" + dataType;

        if (subType)
            url += "/" + subType;

        url += "?changeId=" + currentChangeId;

        let dataBody = { "columns": bundleSchemas[dataType].map(s => s.field), "diffs": bundle.diffs[dataType] };
        let me = this;

        request({ method: 'POST', url: url, headers: headers, json: dataBody },
            (err, response, body) => {

                if (err || response.statusCode !== 200) {
                    bundle.data[dataType] = me.mergeDiffs(bundle.diffs[dataType], bundleData[dataType]);
                }

                else {
                    let diffs: DiffItem[] = body.diffs ? body.diffs : [];
                    bundle.changeId = body.change_id;

                    for (let i = 0; i < bundle.diffs[dataType].length; i++)
                        diffs.push(bundle.diffs[dataType][i]);

                    bundle.data[dataType] = me.mergeDiffs(diffs, bundle.data[dataType]);
                    bundle.diffs[dataType] = [];
                }

                jetpack.write(jsonFile, JSON.stringify(bundle));

                if (callback)
                    callback(err, bundle.data[dataType]);
            });
    }

    getContentMap(callback): void {
        let auth = this.getActiveAuth();
        let jsonFile = path.join(CONTENT_DIR, 'map.json');

        let bundle = {
            "desaId": auth['desa_id'],
            "changeId": 0,
            "center": [],
            "data": [],
            "diffs": []
        };

        if (!jetpack.exists(jsonFile))
            jetpack.write(jsonFile, bundle);
        else
            bundle = JSON.parse(jetpack.read(jsonFile));

        let allDiffs = [];
        let url = SERVER + "/content-map/" + auth['desa_id'] + "/" + bundle.changeId;

        request({ method: 'GET', url: url, headers: this.getHttpHeaders() }, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                let result = JSON.parse(body);
                let diffs = [];

                if (result["diffs"]) {
                    diffs = result["diffs"];
                    allDiffs = diffs.concat(bundle.diffs);
                }
                else if (result["data"]) {
                    bundle.data = result["data"];
                    bundle.center = result['center'];
                    bundle.desaId = auth['desa_id'];
                }

                bundle.changeId = result['change_id'];
            }

            if (allDiffs.length > 0)
                bundle.data = this.mergeDiffsMap(allDiffs, bundle.data);

            jetpack.write(path.join(CONTENT_DIR, 'map.json'), bundle);
            callback(bundle);
        });
    }

    saveContentMap(data, callback): void {
        let auth = this.getActiveAuth();
        let headers = this.getHttpHeaders();
        let jsonFile = path.join(CONTENT_DIR, 'map.json');
        let bundle = JSON.parse(jetpack.read(jsonFile));

        let currentDiff = this.diffTracker.trackDiffMapping(bundle.data, data);
        let currentChangeId = bundle.changeId;

        if (!bundle['diffs'])
            bundle['diffs'] = [];

        if (currentDiff.total > 0)
            bundle['diffs'].push(currentDiff);

        let url = SERVER + "/content-map/" + auth['desa_id'] + "/" + currentChangeId;
        let dataJson = { "diffs": bundle['diffs'] };
        let me = this;

        request({ method: 'POST', url: url, headers: headers, json: dataJson }, (err, response, body) => {
            if (err || response.statusCode !== 200) {
                bundle.data = me.mergeDiffsMap(bundle.diffs, data);
            }
            else {
                let diffs: DiffItem[] = body.diffs ? body.diffs : [];
                bundle.changeId = body.change_id;

                for (let i = 0; i < bundle.diffs.length; i++)
                    diffs.push(bundle.diffs[i]);

                bundle.data = me.mergeDiffsMap(diffs, bundle.data);
                bundle.diffs = [];
            }

            jetpack.write(jsonFile, JSON.stringify(bundle));

            if (callback)
                callback(err, bundle.data);
        });
    }

    saveActiveAuth(auth): void {
        let authFile = path.join(DATA_DIR, "auth.json");

        if (auth)
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    }

    saveToSiskeudesDB(bundleData, type, callback: any): void {
        let siskeudes = new Siskeudes(settings.data["siskeudes.path"]);
        let queries = [];

        bundleData.insert.forEach(c => {
            let table = Object.keys(c)[0];
            let query = siskeudes.createQueryInsert(table, c[table]);
            queries.push(query);
        });

        bundleData.update.forEach(c => {
            let table = Object.keys(c)[0];
            let query = siskeudes.createQueryUpdate(table, c[table]);
            queries.push(query);
        });

        bundleData.delete.forEach(c => {
            let table = Object.keys(c)[0];
            let query = siskeudes.createQueryDelete(table, c[table]);
            queries.push(query);
        });

        siskeudes.bulkExecuteWithTransaction(queries, response => {
            if(type != null)
                callback({[type]:response});
            else                
                callback(response);                   
        });
    }

    transformDesaGeoJsonData(desaId: any, files: any[]): any {
        let result: any[] = [];

        for (let i = 0; i < files.length; i++) {
            let dataPath = path.join(DATA_SOURCES, files[i].path + '.json');

            if (!jetpack.exists(dataPath))
                continue;

            let dataSet = JSON.parse(jetpack.read(dataPath));

            for (let j = 0; j < dataSet.features.length; j++) {
                let dataSetFeature = dataSet.features[j];
                let newFeature = {
                    "id": base64.encode(uuid.v4()),
                    "type": "Feature",
                    "indicator": files[i].indicator,
                    "properties": { "type": null },
                    "geometry": dataSetFeature.geometry
                };

                result.push(newFeature);
            }
        }

        return { "desaId": desaId, "features": result };
    }

    getDesaFeatures(indicator, callback): void {
        let geoJson: any = null;
        let localDirPath: string = path.join(CONTENT_DIR, 'map.json');
        let geojsonPath: string = path.join(DESA_SOURCES, 'map-example.json');

        if (!jetpack.exists(localDirPath)) {
            geoJson = JSON.parse(jetpack.read(geojsonPath));

            if (!geoJson) {
                callback({});
                return;
            }

            jetpack.write(localDirPath, JSON.stringify(geoJson));
        }
        else
            geoJson = JSON.parse(jetpack.read(localDirPath));

        let result = geoJson.filter(e => e.indicator === indicator)[0];

        callback(result);
    }

    login(user, password, callback): void {
        let info = os.type() + " " + os.platform() + " " + os.release() + " " + os.arch() + " " + os.hostname() + " " + os.totalmem();
        let url = SERVER + "/login";
        let json = { "user": user, "password": password, "info": info };
        let headers = { "X-Sideka-Version": pjson.version };

        request({ method: 'POST', url: url, json: json, headers: headers }, (err, response, body) => {
            if (!err && body.success) {
                let oldDesaId = MetadataHandler.getContentMetadata("desa_id");
                if (oldDesaId && oldDesaId != body.desa_id) {
                    let offlines = MetadataHandler.getContentMetadata("offlines");

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
        request({ method: 'GET', url: url, headers: headers }, () => { });
    }

    checkAuth(callback): void {
        let auth = this.getActiveAuth();
        let url = SERVER + "/check_auth/" + auth['desa_id'];
        let headers = this.getHttpHeaders();
        request({ method: 'GET', url: url, headers: headers }, callback);
    }

    transformData(targetSchema, dataColumns, data): any[] {
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

    evaluateDiff(pre: any[], post: any[]): DiffItem {
        let equals = (a, b) => {
            if (a === b)
                return true;

            if ((a === null || a === undefined) && (b === null || b === undefined))
                return true;

            return false;
        }

        let toMap = (arr, idIndex) => {
            var result = {};
            arr.forEach(function (i) {
                result[i[idIndex]] = i;
            })
            return result;
        }

        let result: DiffItem = { "modified": [], "added": [], "deleted": [], "total": 0 };
        let preMap = toMap(pre, 0);
        let postMap = toMap(post, 0);
        let preKeys = Object.keys(preMap);
        let postKeys = Object.keys(postMap);

        result.deleted = preKeys.filter(k => postKeys.indexOf(k) < 0).map(k => preMap[k]);
        result.added = postKeys.filter(k => preKeys.indexOf(k) < 0).map(k => postMap[k]);

        for (var i = 0; i < preKeys.length; i++) {
            var id = preKeys[i];
            var preItem = preMap[id];
            var postItem = postMap[id];

            if (!postItem)
                continue;

            for (var j = 0; j < preItem.length; j++) {
                if (!equals(preItem[j], postItem[j])) {
                    result.modified.push(postItem);
                    break;
                }
            }
        }

        result.total = result.deleted.length + result.added.length + result.modified.length;
        return result;
    }

    mergeDiffs(diffs: DiffItem[], data: any[]): any[] {
        for (let i = 0; i < diffs.length; i++) {
            let diffItem: DiffItem = diffs[i];

            for (let j = 0; j < diffItem.added.length; j++) {
                let dataItem: any[] = diffItem.added[j];
                let existingData = data.filter(e => e[0] === dataItem[0])[0];

                if (!existingData)
                    data.push(dataItem);
            }

            for (let j = 0; j < diffItem.modified.length; j++) {
                let dataItem: any[] = diffItem.modified[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k][0] === dataItem[0]) {
                        data[k] = dataItem;
                    }
                }
            }

            for (let j = 0; j < diffItem.deleted.length; j++) {
                let dataItem: any[] = diffItem.deleted[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k][0] === dataItem[0]) {
                        data.splice(k, 1);
                        break;
                    }
                }
            }
        }

        return data;
    }

    mergeDiffsMap(diffs: DiffItem[], data: any[]): any[] {
        for (let i = 0; i < diffs.length; i++) {
            let diffItem: DiffItem = diffs[i];

            for (let j = 0; j < diffItem.added.length; j++) {
                let dataItem: any[] = diffItem.added[j];
                let existingData = data.filter(e => e[0] === dataItem[0])[0];

                if (!existingData)
                    data.push(dataItem);
            }

            for (let j = 0; j < diffItem.modified.length; j++) {
                let dataItem: any[] = diffItem.modified[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k]["id"] === dataItem["id"]) {
                        data[k] = dataItem;
                    }
                }
            }

            for (let j = 0; j < diffItem.deleted.length; j++) {
                let dataItem: any[] = diffItem.deleted[j];

                for (let k = 0; k < data.length; k++) {
                    if (data[k]["id"] === dataItem["id"]) {
                        data.splice(k, 1);
                        break;
                    }
                }
            }
        }

        return data;
    }
}

class MetadataHandler {
    static rmDirContents(dirPath): void {
        try { var files = fs.readdirSync(dirPath); }
        catch (e) { return; }

        if (files.length <= 0)
            return;

        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];

            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
        }
    }

    static getMetadatas(): any {
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        if (!jetpack.exists(fileName)) {
            jetpack.write(fileName, JSON.stringify({}));
        }
        return JSON.parse(jetpack.read(fileName));
    }

    static getContentMetadata(key): any {
        let metas = MetadataHandler.getMetadatas();
        return metas[key];
    }

    static setContentMetadata(key, value): void {
        let metas = MetadataHandler.getMetadatas();
        metas[key] = value;
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas));
    }
}

export default new DataApi();
