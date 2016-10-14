import path from 'path';
import fs from 'fs';
import $ from 'jquery';
import { remote, app, shell } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import Docxtemplater from 'docxtemplater';
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
import dataapi from '../dataapi/dataapi';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';


var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("Data Keluarga - " +dataapi.getActiveAuth().desa_name);

    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    window.hot = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.keluarga),
        columns: schemas.keluarga,

        colWidths: schemas.getColWidths(schemas.keluarga),
        rowHeights: 23,

        columnSorting: true,
        sortIndicator: true,

        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,

        search: true,
        filters: true,
        dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });
    
    var formSearch = document.getElementById("form-search");
    var inputSearch = document.getElementById("input-search");
    initializeTableSearch(hot, document, formSearch, inputSearch);
    
    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot, spanCount);

    window.addEventListener('resize', function(e){
        hot.render();
    })
    
    document.getElementById('btn-save').onclick = function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getSourceData()
        };
        //disable save for now
        //dataapi.saveContent("keluarga", content);
    };


    var allPenduduks = {};
    
    var updateKeluarga = function(keluargas, penduduks){

        var existsKeluargas = {};
        var keluargaMap = {};
        for(var i = 0; i < keluargas.length; i++){
            var k = keluargas[i];
            existsKeluargas[k[0]] = true;
            keluargaMap[k[0]] = k;
        }

        for(var i = 0; i < penduduks.length; i++){
            var p = penduduks[i];
            var po = schemas.arrayToObj(p, schemas.penduduk);
            if(!po.no_kk)
                continue;
                
            if(!existsKeluargas[po.no_kk]){
                var ko = {no_kk: po.no_kk, raskin: null, jamkesmas: null, pkh: null};
                var k = schemas.objToArray(ko, schemas.keluarga);
                keluargas.push(k);
                keluargaMap[po.no_kk] = k;
                existsKeluargas[po.no_kk] = true;
            }
            
            if(!allPenduduks[po.no_kk]){
                allPenduduks[po.no_kk] = [];
            }
            allPenduduks[po.no_kk].push(po)

            if(po.hubungan_keluarga = "Kepala Keluarga"){
                keluargaMap[po.no_kk][1] = po.nama_penduduk;
                keluargaMap[po.no_kk][2] = po.nik;
            }
        }
        
        for(var i = 0; i < keluargas.length; i++){
            var k = keluargas[i];
            var count = 0;
            if(allPenduduks[k[0]])
                count = allPenduduks[k[0]].length;
            k[3] = count;
        }
        
    }

    document.getElementById('btn-print').onclick = function(){
        var selected = hot.getSelected();
        if(!selected)
            return;
            
        var fileName = remote.dialog.showSaveDialog({
            filters: [
                {name: 'Word document', extensions: ['docx']},
            ]
        });
        if(fileName){
            if(!fileName.endsWith(".docx"))
                fileName = fileName+".docx";
            var no_kk = hot.getDataAtRow(selected[0])[0];
            var penduduks = allPenduduks[no_kk];
            var content = fs.readFileSync(path.join(app.getAppPath(), "templates","kk.docx"),"binary");
            var doc=new Docxtemplater(content);
            doc.setData({penduduk:penduduks});
            doc.render();

            var buf = doc.getZip().generate({type:"nodebuffer"});
            fs.writeFileSync(fileName, buf);
            shell.openItem(fileName);
        }
    };
    
    dataapi.getContent("keluarga", {data: []}, function(keluargaContent){
        dataapi.getContent("penduduk", {data: []}, function(pendudukContent){
            updateKeluarga(keluargaContent.data, pendudukContent.data);
            hot.loadData(keluargaContent.data);
            setTimeout(function(){
                hot.render();
            },500);
        })
    })
    
});
