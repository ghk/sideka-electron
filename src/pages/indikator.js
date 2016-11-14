import { Component } from '@angular/core';

import path from 'path';
import fs from 'fs';
import $ from 'jquery';
import { remote, app, shell } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import Docxtemplater from 'docxtemplater';
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
import { importTPB } from '../helpers/importer';
import dataapi from '../stores/dataapi';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';

window.jQuery = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app = remote.app;
var hot;
var sheetContainer;
var pathFile = "app/indikatorTPB.xlsx";

var init = function () {
    sheetContainer = document.getElementById('sheet');
    window.hot = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.indikator),
        columns: schemas.indikator,

        colWidths: schemas.getColWidths(schemas.indikator),
        rowHeights: 23,
        
        //columnSorting: true,
        //sortIndicator: true,
        
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        //filters: true,
        contextMenu: ['row_above', 'remove_row'],
        //dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
    });
    
    window.addEventListener('resize', function(e){
        hot.render();
    })
    $('.modal').each(function(i, modal){
        $(modal).on('hidden.bs.modal', function () {
            hot.listen();
        })
    });
    schemas.registerCulture(window);
    
};

var isCodeLesserThan = function(code1, code2){
    if(!code2)
        return false;
    var splitted1 = code1.split(".").map(s => parseInt(s));
    var splitted2 = code2.split(".").map(s => parseInt(s));
    var min = Math.min(splitted1.length, splitted2.length);
    for(var i = 0; i < min; i++){
        if(splitted1[i] > splitted2[i]){ 
            return false;
        }
        if(splitted1[i] < splitted2[i]){ 
            return true;
        }
    }

    if(splitted1.length < splitted2.length) 
        return true;
        
    return false;
};

var createDefaultIndikator = function(){
    var objData = importTPB(pathFile)
    var data = objData.map(o => schemas.objToArray(o, schemas.indikator));
    return data;
}

var IndikatorComponent = Component({
    selector: 'indikator',
    templateUrl: 'templates/indikator.html'
})
.Class({
    constructor: function() {
    },
    ngOnInit: function(){
        $("title").html("Indikator TPB - " +dataapi.getActiveAuth().desa_name);
        init();
        
        var inputSearch = document.getElementById("input-search");
        this.tableSearcher = initializeTableSearch(hot, document, inputSearch);
    
        this.hot = window.hot;
        var ctrl = this;

        function keyup(e) {
            //ctrl+s
            if (e.ctrlKey && e.keyCode == 83){
                ctrl.saveSubType();
                e.preventDefault();
                e.stopPropagation();
            }
        }
        document.addEventListener('keyup', keyup, false);

        this.activeSubType = null;
        dataapi.getContentSubTypes("indikator", subTypes => {
            this.subTypes = subTypes;
            if(this.subTypes.length)
                this.loadSubType(subTypes[0]);
        });
    },
    loadSubType(subType){
        var defaultIndicators = createDefaultIndikator();
        var indicatorMaps = {};
        defaultIndicators.forEach(r => {
            indicatorMaps[r[0]] = r;
        });
        dataapi.getContent("indikator", subType, [], content => {
            this.activeSubType = subType;
            hot.loadData(content.data.map(r => {
                var i = indicatorMaps[r[0]];
                if (!i){
                    i = [];
                }
                return [r[0], i[1], r[1], i[3], i[4]];
            }));
            setTimeout(function(){
                hot.render();
            },500);
        });
        return false;
    },
    openNewSubTypeDialog: function(){
        $("#modal-new-year").modal("show");
        setTimeout(function(){
            hot.unlisten();
            $("input[name='year']").focus();
        }, 500);
        return false;
    },
    createNewSubType: function(){
        var year = $("#form-new-year input[name='year']").val();
        var subType = year;
        this.activeSubType = subType;
        this.subTypes.push(subType);
        hot.loadData(createDefaultIndikator());
        hot.render();
        $("#modal-new-year").modal("hide");
        return false;
    },
    saveContent: function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getSourceData().map(r => [r[0], r[2]])
        };
        
        var that = this;
        that.savingMessage = "Menyimpan...";
        dataapi.saveContent("indikator", this.activeSubType, content, function(err, response, body){
            that.savingMessage = "Penyimpanan "+ (err ? "gagal" : "berhasil");
            setTimeout(function(){
                that.savingMessage = null;
            }, 2000);
        });
    }
});

export default IndikatorComponent;