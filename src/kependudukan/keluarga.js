import path from 'path';
import fs from 'fs';
import $ from 'jquery';
import { remote, app, shell } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import Docxtemplater from 'docxtemplater';
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
import dataapi from '../dataapi/dataapi';
import schemas from '../schemas';


var app = remote.app;
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("Data Keluarga - " +dataapi.getActiveAuth().desa_name);

    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    hot = new Handsontable(sheetContainer, {
        data: [],
        rowHeaders: true,
        topOverlay: 34,
        renderAllRows: false,
        columnSorting: true,
        sortIndicator: true,
        outsideClickDeselects: false,
        stretchH: "none",
        colHeaders: schemas.getHeader(schemas.keluarga),
        columns: schemas.keluarga,
        fixedColumnsLeft: 2,
        search: true,
        filters: true,
        dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });
    
    var searchField = document.getElementById('search-field');
    Handsontable.Dom.addEvent(searchField, 'keyup', function(event) {
        console.log(this.value);
        var queryResult = hot.search.query(this.value);
        hot.render();
    });
    var searchForm = document.getElementById('search-form');
    searchForm.onsubmit = function(){
        return false;
    };
    
    document.getElementById('save-btn').onclick = function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getData()
        };
        //disable save for now
        //dataapi.saveContent("keluarga", content);
    };

    window.addEventListener('resize', function(e){
        hot.render();
    })

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

    document.getElementById('print-btn').onclick = function(){
        var selected = hot.getSelected();
        if(!selected)
            return;
            
        var fileName = remote.dialog.showSaveDialog();
        if(fileName){
            var no_kk = hot.getData()[selected[0]][0];
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
