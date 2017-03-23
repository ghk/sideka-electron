import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import { Siskeudes } from '../stores/siskeudes';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import SumCounter from "../helpers/sumCounter";
import { Component, ApplicationRef, NgZone } from "@angular/core";


const fileNameSiskeudes = 'C:\\microvac\\WORKSPACE\\SimKeu_DesaV1.2\\DataAPBDES2016(1).mde'

const path = require("path");
const $ = require("jquery");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');

window["jQuery"] = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app = remote.app;
var hot;
var sheetContainer;
var resultBefore=[];
var temp1;

var init = () => {
    sheetContainer = document.getElementById('sheet');
    window['hot'] = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,
        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.renstra),
        columns: schemas.renstra,
        colWidths: schemas.getColWidths(schemas.renstra),
        rowHeights: 23,
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        contextMenu: ['row_above', 'remove_row']
    });

    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot, spanCount);

    window.addEventListener('resize', function(e){
        hot.render();
    })
};

@Component({
    selector: 'perencanaan',
    templateUrl: 'templates/perencanaan.html'
})
class PerencanaanComponent {
    hot: any;
    appRef: any;
    zone: any;
    siskeudes:any;
    visiRPJM:any;
    renstraRPJM:any;
    pageEditing: boolean;

    constructor(appRef, zone){
        this.appRef = appRef;   
       this.pageEditing=false;
        this.siskeudes = new Siskeudes(fileNameSiskeudes); 
        
    }

    ngOnInit(){  
        this.siskeudes.getVisiRPJM((data)=>{ 
            this.visiRPJM = data;
        })                    
    }

    importPerencanaan(idVisi){
        init();
        this.pageEditing = true;
        this.hot = window['hot'];
        var ctrl = this;
        this.siskeudes.getRenstraRPJM(idVisi,data=>{
            var results = data.map(o => schemas.objToArray(o, schemas.renstra));
            console.log(results)
            hot.loadData(results);
            setTimeout(function(){
                //hot.validateCells();
                hot.render();
            },500);
        })  
    }


    /*
    parseObject(data){
        var results = []
        data.forEach(content=>{
            var resultsIndex = results.indexOf(results.filter(c=>c.uraian_visi==content.Uraian_Visi)[0])
            if(resultsIndex == -1 ){
                results.push({
                    uraian_visi: content.Uraian_Visi,
                    misi:[]
                });
            }else{
                var misi = results[resultsIndex].misi;
                var indexMisi = misi.indexOf(misi.filter(c=>c.uraian_misi == content.Uraian_Misi)[0])
                if(indexMisi == -1 ){
                    misi.push({
                        uraian_misi: content.Uraian_Misi,
                        tujuan:[]
                    });
                }else{
                    var tujuan = results[resultsIndex].misi[indexMisi].tujuan;
                    var indexTujuan = tujuan.indexOf(tujuan.filter(c=>c.uraian_tujuan == content.Uraian_Tujuan)[0])
                    if(indexTujuan == -1 ){
                        misi.push({
                            uraian_tujuan: content.Uraian_Tujuan,
                            sasaran:[]
                        });
                    }else{
                        var sasaran = results[resultsIndex].misi[indexMisi].tujuan[indexTujuan].sasaran;
                        var indexSasaran = sasaran.indexOf(sasaran.filter(c=>c.uraian_sasaran == content.Uraian_Sasaran)[0])
                        if(indexMisi == -1 ){
                            misi.push({
                                uraian_sasaran: content.Uraian_Sasaran
                            });
                        }
                    }
                }              
            }
        })
        console.log(results)
    }*/
    

}

PerencanaanComponent['parameters'] = [ApplicationRef, NgZone];
export default PerencanaanComponent;
