/// <reference path="../../app/typings/index.d.ts" />

import { Component } from '@angular/core';
import { remote } from "electron";
import * as path from 'path';

const app = remote.app;
const jetpack = require("fs-jetpack");
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

const DATA_TYPE_DIRS = {
    "penduduk": path.join(CONTENT_DIR,  "penduduk.json"),
    "perencanaan": path.join(CONTENT_DIR,  "penduduk.json"),
}

var $ =  require('jquery');

var computeDiff = (pre, post, idIndex) => {
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
    
    let result = { "modified": [], "added": [], "deleted": [], "total": 0 }; 
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

var computeWithChildrenDiff = function(pre, post, idIndex){
    var toMap = function(arr){
        var result = {};
        var children = {};
        var lastId = null;
        arr.forEach(function(i){
            var id = i[idIndex];
            if(id){
                result[i[idIndex]] = i;
                lastId = id;
            } else {
                if(lastId){
                    if(!children[lastId])
                        children[lastId] = [];
                    children[lastId].push(i);
                }
            }
        })
        return [result, children];
    }
    
    var allPreMap = toMap(pre);
    var preMap = allPreMap[0];
    var preChildrenMap = allPreMap[1];
    var allPostMap = toMap(post);
    var postMap = allPostMap[0];
    var postChildrenMap = allPostMap[1];
    var preKeys = Object.keys(preMap);
    var postKeys = Object.keys(postMap);

    var diff = {
        deleted: preKeys.filter(k => postKeys.indexOf(k) < 0).map(k => preMap[k]),
        added: postKeys.filter(k => preKeys.indexOf(k) < 0).map(k => postMap[k]),
        modified: [],
        total: null
    }
    
    for(var i = 0; i < preKeys.length; i++)
    {
        var id = preKeys[i];
        var preItem = preMap[id];
        var postItem = postMap[id];
        if(!postItem)
            continue;
        var different = false;
        var maxLength = Math.max(preItem.length, postItem.length);
        for(var j = 0; j < maxLength; j++){
            if(preItem[j] !== postItem[j]){
                different = true;
                break;
            }
        }
        if(!different){
            var preChildren = preChildrenMap[id];
            var postChildren = postChildrenMap[id];
            if(!preChildren && !postChildren)
                continue;
            if(!preChildren || !postChildren){
                different = true;
            } else if (preChildren.length !== postChildren.length){
                different = true;
            } else {
                for(var k = 0; k < preChildren.length && !different; k++){
                    var maxLength = Math.max(preChildren[k].length, postChildren[k].length);
                    for(var l = 0; l < maxLength; l++){
                        if(preChildren[k][l] !== postChildren[k][l]){
                            different = true;
                            break;
                        }
                    }
                }
            }
        }
        if(different){
            diff.modified.push(postItem);
        }
    }
    
    diff.total = diff.deleted.length + diff.added.length + diff.modified.length;
    
    return diff;
}

export default class Diff{
    computeDiff: any;
    afterSaveAction: string;
    closeTarget: string;
    isForceQuit: boolean;
    diff: any;
    initialData: any;
    hot: any;

    constructor(){}

    initDiffComponent(isWithChildren?){
        this.computeDiff = isWithChildren ? computeWithChildrenDiff : computeDiff;
        var ctrl = this;
        window.addEventListener('beforeunload', onbeforeunload);
        function onbeforeunload(e) {
            if(ctrl.isForceQuit){
                return;
            }
                
            ctrl.afterSaveAction = ctrl.closeTarget == 'home' ? 'home' : 'quit';
            ctrl.closeTarget = null;
            
            ctrl.diff = ctrl.computeDiff(ctrl.initialData, ctrl.hot.getSourceData(), 0);
            if(ctrl.diff.total > 0){
                e.returnValue = "not closing";
                $("#modal-save-diff").modal("show");
            }
        };
    }

    openSaveDiffDialog(type){
        let data = this.initialData;

        if(type)
            data = JSON.parse(jetpack.read(DATA_TYPE_DIRS[type]))["data"][type];
            
        this.diff = this.computeDiff(data, this.initialData, 0);
        console.log(this.diff);
        if(this.diff.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff").modal("show");
            setTimeout(() => {
                this.hot.unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
    }

    forceQuit(){
        this.isForceQuit = true;
        this.afterSave();
    }

    afterSave(){
        if(this.afterSaveAction == "home"){
            document.location.href="app.html";
        } else if(this.afterSaveAction == "quit"){
            app.quit();
        }
    }
}
