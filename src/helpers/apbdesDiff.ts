/// <reference path="../../app/typings/index.d.ts" />

import { Component } from "@angular/core";

var $ = require('jquery');

declare var app;

var equals = function(a, b){
    if(a === b)
        return true;
    if((a === null || a === undefined ) && (b === null || b === undefined))
        return true;
    return false;
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
            if(!equals(preItem[j], postItem[j])){
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
                        if(!equals(preChildren[k][l], postChildren[k][l])){
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

var computeDiff = function(pres, hots){
    var result = {diffs: {}, subTypes: [], total: 0};
    var subTypes = Object.keys(pres);
    for(var i = 0; i < subTypes.length; i++){
        var subType = subTypes[i];
        result.subTypes.push(subType);
        result.diffs[subType] = computeWithChildrenDiff(pres[subType], hots[subType].getSourceData(), 0);
        result.total += result.diffs[subType].total ;
    }
    console.log(result);
    return result;
}

export default class DiffProps{
    isForceQuit: boolean;
    afterSaveAction: string;
    closeTarget: string;
    initialDatas: any;
    diffs: any;
    hots: any;
    hot: any;

    constructor(){}

    initDiffComponent(){
        var ctrl = this;
        window.addEventListener('beforeunload', onbeforeunload);
        function onbeforeunload(e) {
            if(ctrl.isForceQuit){
                return;
            }
                
            ctrl.afterSaveAction = ctrl.closeTarget == 'home' ? 'home' : 'quit';
            ctrl.closeTarget = null;
            
            ctrl.diffs = computeDiff(ctrl.initialDatas, ctrl.hots);
            if(ctrl.diffs.total > 0){
                e.returnValue = "not closing";
                $("#modal-save-diff").modal("show");
            }
        };
    }

    openSaveDiffDialog(){
        this.diffs = computeDiff(this.initialDatas, this.hots);
        console.log(this.diffs);
        if(this.diffs.total > 0){
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
