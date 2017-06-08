import { Component } from '@angular/core';
import { remote } from "electron";
import * as path from 'path';

const app = remote.app;
const jetpack = require("fs-jetpack");
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
const DATA_TYPE_DIRS = {
    "penduduk": path.join(CONTENT_DIR, "penduduk.json"),
    "perencanaan": path.join(CONTENT_DIR, "perencanaan.json")
}

export interface Diff {
    added: any[],
    modified: any[],
    deleted: any[],
    total: number
}

export class DiffTracker {
    constructor() { }

    equals(a, b): boolean {
        if (a === b)
            return true;

        if ((a === null || a === undefined) && (b === null || b === undefined))
            return true;

        return false;
    }

    toMap(arr: any[], index: number): any {
        var result = {};
        arr.forEach(function (i) {
            result[i[index]] = i;
        })
        return result;
    }

    trackDiff(oldData, newData): Diff {
        let result: Diff = { "modified": [], "added": [], "deleted": [], "total": 0 };
        let oldMap = this.toMap(oldData, 0);
        let newMap = this.toMap(newData, 0);
        let oldKeys = Object.keys(oldMap);
        let newKeys = Object.keys(newMap);

        result.added = newKeys.filter(k => oldKeys.indexOf(k) < 0).map(k => newMap[k]);
        result.deleted = oldKeys.filter(k => newKeys.indexOf(k) < 0).map(k => oldMap[k]);

        for (let i = 0; i < oldKeys.length; i++) {
            var id = oldKeys[i];
            var oldItem = oldMap[id];
            var newItem = newMap[id];

            if (!newItem)
                continue;

            for (let j = 0; j < newItem.length; j++) {
                if (!this.equals(oldItem[j], newItem[j])) {
                    result.modified.push(newItem);
                    break;
                }
            }
        }

        result.total = result.deleted.length + result.added.length + result.modified.length;
        return result;
    }

    trackDiffMapping(oldData, newData): Diff {
        let result: Diff = { "modified": [], "added": [], "deleted": [], "total": 0 };

        for (let i = 0; i < newData.length; i++) {
            if (!oldData[i])
                result.added = newData[i];

            if (oldData[i].id === newData[i].id) {
                let propertyKeys = Object.keys(newData[i]['properties']);

                for (let j = 0; j < propertyKeys.length; j++) {
                    let newProperty = newData[i]["properties"][propertyKeys[j]];
                    let oldProperty = oldData[i]["properties"][propertyKeys[j]];

                    if (newProperty != oldProperty) {
                        result.modified.push(newData[i]);
                        break;
                    }
                }
            }
        }

        result.total = result.added.length + result.deleted.length + result.modified.length;
        return result;
    }
}
