import { remote, app as remoteApp, shell } from "electron";
import * as fs from "fs";
import { apbdesImporterConfig, Importer } from '../helpers/importer';
import { exportApbdes } from '../helpers/exporter';
import dataapi from '../stores/dataapi';
import schemas from '../schemas';
import { initializeTableSearch, initializeTableCount, initializeTableSelected } from '../helpers/table';
import diffProps from '../helpers/apbdesDiff';
import SumCounter from "../helpers/sumCounter";
import { Component, ApplicationRef, NgZone } from "@angular/core";

const path = require("path");
const $ = require("jquery");
const jetpack = require("fs-jetpack");
const Docxtemplater = require('docxtemplater');
const Handsontable = require('./handsontablep/dist/handsontable.full.js');

window["jQuery"] = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app = remoteApp;
var hot;

const initSheet = (subType) => {
    const elementId = 'sheet-' + subType;
    let sheetContainer = document.getElementById(elementId);

    let result = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,
        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.apbdes),
        columns: schemas.apbdes,
        colWidths: schemas.getColWidths(schemas.apbdes),
        rowHeights: 23,
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        contextMenu: ['row_above', 'remove_row']
    });

    result.sumCounter = new SumCounter(result);

    result.addHook("afterChange", (changes, source) => {
        if(source === 'edit' || source === 'undo' || source === 'autofill'){
            let renderer = false;

            changes.forEach(item => {
                let row = item[0];
                let col = item[1];
                let prevValue = item[2];
                let value = item[3];

                if(col === 2)
                    renderer = true;
            });

            if(renderer){
                result.sumCounter.calculateAll();
                result.render();
            }
        }
    });

    return result;
}

const createDefaultApbdes = () => {
     return [
        ["1", "Pendapatan"],
        ["1.1", "Pendapatan Asli Desa"],
        ["1.1.1", "Hasil Usaha Desa"],
        ["1.2", "Pendapatan Transfer"],
        ["1.2.1", "Dana Desa"],
        ["1.2.2", "Bagian dari Hasil Pajak & Retribusi Daerah Kabupaten/Kota"],
        ["1.2.3", "Alokasi Dana Desa"],
        ["1.2.4", "Bantuan Keuangan"],
        ["1.2.4.1", "Bantuan Keuangan dari APBD Propinsi"],
        ["1.2.4.2", "Bantuan Keuangan dari APBD Kabupaten"],
        ["1.3", "Lain-lain Pendapatan Desa yang Sah"],
        ["1.3.1", "Hibah dan Sumbangan dari Pihak Ke-3 yang Tidak Mengikat"],
        ["2", "Belanja"],
        ["2.1", "Bidang Penyelenggaraan Pemerintah Desa"],
        ["2.2", "Bidang Pelaksanaan Pembangunan Desa"],
        ["2.3", "Bidang Pembinaan Kemasyarakatan"],
        ["2.4", "Bidang Pemberdayaan Masyarakat"],
        ["3", "Pembiayaan"],
        ["3.1", "Penerimaan Pembiayaan"],
        ["3.1.1", "SILPA"],
        ["3.1.2", "Pencairan Dana Cadangan"],
        ["3.1.3", "Hasil Kekayaan Desa yang Dipisahkan"],
        ["3.2", "Pengeluaran Pembiayaan"],
        ["3.2.1", "Pembentukan Dana Cadangan"],
        ["3.2.2", "Penyertaan Modal Desa"],
    ];
}

const isCodeLesserThan = (code1, code2) => {
    if(!code2)
        return false;

    let splitted1: any[] = code1.split(".").map(s => parseInt(s));
    let splitted2: any[] = code2.split(".").map(s => parseInt(s));
    let min = Math.min(splitted1.length, splitted2.length);

    for(let i=0; i<min; i++){
        if(splitted1[i] > splitted2[i])
            return false;
            
        if(splitted1[i] < splitted2[i])
            return true;
    }

    if(splitted1.length < splitted2.length)
        return true;
    
    return false;
}

@Component({
    selector: 'apbdes',
    templateUrl: 'templates/apbdes.html'
})
class ApbdesComponent extends diffProps{
    appRef: any;
    zone: any;
    importer: any;
    tableSearchers: any;
    tableSearcher: any;
    activeSubType: any;
    subTypes: any;
    savingMessage: any;

    constructor(appRef, zone){
        super();
        this.appRef = appRef;
        this.zone = zone;
    }

    init(): void {
        window.addEventListener("resize", (e) => {
            if(hot)
                hot.render();
        });

        $('.modal').each((i, modal) => {
            $(modal).on('hidden.bs.modal', () => {
                if(hot)
                    hot.listen();
            });
        });

        schemas.registerCulture(window);
    }

    ngOnInit(): void {
        console.log($("title"));
        $("title").html("APBDes - " + dataapi.getActiveAuth()["desa_name"]);
        
        this.init();
        this.importer = new Importer(apbdesImporterConfig);
        this.hots = {};
        this.tableSearchers = {};
        this.initialDatas = {};

        let ctrl = this;

        let keyup = (e) => {
             if (e.ctrlKey && e.keyCode == 83){
                ctrl.openSaveDiffDialog();
                e.preventDefault();
                e.stopPropagation();
            }
        }

        document.addEventListener('keyup', keyup, false);
        this.activeSubType = null;

        dataapi.getContentSubTypes("apbdes", subTypes => {
            this.subTypes = subTypes;
            this.appRef.tick();

            if(this.subTypes.length)
                this.loadSubType(subTypes[0]);
        });

        this.initDiffComponent();
    }

    loadSubType(subType): boolean {
        if(!this.hots[subType]){
            this.hots[subType] = initSheet(subType);
            this.hot = hot = this.hots[subType];
            
            let inputSearch = document.getElementById("input-search-" + subType);

            this.tableSearchers[subType] = initializeTableSearch(hot, document, inputSearch, () => this.activeSubType === subType);
            this.tableSearcher = this.tableSearchers[subType];
            
            dataapi.getContent("apbdes", subType, [], schemas.apbdes, content => {
                this.zone.run(() => {
                    this.activeSubType = subType;
                    this.initialDatas[subType] = JSON.parse(JSON.stringify(content));
                    this.hot.loadData(content);
                    this.hot.sumCounter.calculateAll();
                    this.hot.validateCells();
                    setTimeout(() => { this.hot.render(); },500);
                });
            })
        }
        else{
            this.hot = hot = this.hots[subType];
            this.tableSearcher = this.tableSearchers[subType];
            this.activeSubType = subType;
            setTimeout(() => {
                this.hot.render();
            },0);
        }

        return false;
    }

    importExcel(): void{
        let files = remote.dialog.showOpenDialog(null);
        
        if(files && files.length){
            this.importer.init(files[0]);
            $("#modal-import-columns").modal("show");
        }
    }

    doImport(): void {
        $("#modal-import-columns").modal("hide");
        let objData = this.importer.getResults();
        let data = objData.map(o => schemas.objToArray(o, schemas.apbdes));

        hot.loadData(data);
        hot.sumCounter.calculateAll();
        hot.validateCells();
        setTimeout(function(){
            hot.render();
        },500);
    }

    exportExcel(): void{
        let data = hot.getSourceData();

        for(let i = 0; i < data.length; i++){
            let row = data[i];
            let value = row[2];

            if(!Number.isFinite(value) && !value){
                let code = row[0];

                if(code)
                    row[2] = hot.sumCounter.sums[code];
            }
        }
        exportApbdes(data, "Apbdes");
    }

    openAddRowDialog(): boolean{
        let code = null;
        let selected = this.hot.getSelected();
       
        if(selected){
            let i = selected[0];
            while(!code && Number.isFinite(i) && i >= 0){
                code = this.hot.getDataAtCell(i, 0);
                i--;
            }
        }

        if(code)
            $("input[name='account_code']").val(code);
        
        $("#modal-add").modal("show");
        setTimeout(() => {
            this.hot.unlisten();

            if(code)
                $("input[name='account_code']").select();

            $("input[name='account_code']").focus();
        }, 500);
        return false;
    }

    addRow(): void{
        let data = $("#form-add").serializeArray().map(i => i.value);
        let sourceData = hot.getSourceData();
        let position = 0;
        for(;position < sourceData.length; position++){
            if(isCodeLesserThan(data[0], sourceData[position][0]))
                break;
        };
        if(data[1]=="on"){
            data[0]="";
            data.splice(1,1)
        };
        hot.alter("insert_row", position);
        hot.populateFromArray(position, 0, [data], position, 3, null, 'overwrite');
        hot.selection.setRangeStart(new Handsontable.WalkontableCellCoords(position,0));
        hot.selection.setRangeEnd(new Handsontable.WalkontableCellCoords(position,3));
        $('#form-add')[0].reset();
    }

    addOneRow(): void{
        this.addRow();
        $("#modal-add").modal("hide");
    }

    addOneRowAndAnother(): boolean{
        let code = $("input[name='account_code']").val();
        this.addRow();
        $("input[name='account_code']").focus().val(code).select();
        return false;
    }

    openNewSubTypeDialog(): boolean{
        $("#modal-new-year").modal("show");
        setTimeout(function(){
            if(hot)
                hot.unlisten();
            $("input[name='year']").focus();
        }, 500);
        return false;
    }

    createNewSubType(): boolean{
        let year = $("#form-new-year input[name='year']").val();
      
        if(!year || !Number.isFinite(parseInt(year)))
            return;

        let is_perubahan = $("#form-new-year input[name='is_perubahan']")[0].checked;
        let subType = year;
        
        if(is_perubahan)
            subType = subType+"p";
            
        //TODO: show error already exists
        if(this.subTypes.filter(s => s == subType).length)
            return;
          
        this.activeSubType = subType;
        this.subTypes.push(subType);
        this.appRef.tick();
        
        this.hots[subType] = initSheet(subType);
        this.hot = hot = this.hots[subType];
        hot.loadData(createDefaultApbdes());
        hot.sumCounter.calculateAll();
        hot.validateCells();
        this.initialDatas[subType] = [];

        let inputSearch = document.getElementById("input-search-"+subType);
        this.tableSearchers[subType] = initializeTableSearch(hot, document, inputSearch, () => this.activeSubType == subType);
        this.tableSearcher = this.tableSearchers[subType];
        
        $("#modal-new-year").modal("hide");
        return false;
    }

    saveContent(): boolean{
        $("#modal-save-diff").modal("hide");
        let count = 0;
        this.diffs.subTypes.filter(s => this.diffs.diffs[s].total).forEach(subType => {
            count += 1;
            let timestamp = new Date().getTime();
            let content = hot.getSourceData();
            
            let that = this;
            that.savingMessage = "Menyimpan...";
            dataapi.saveContent("apbdes", subType, content, schemas.apbdes, function(err, response, body){
                count -= 1;
                that.savingMessage = "Penyimpanan "+ (err ? "gagal" : "berhasil");
                that.appRef.tick();
                if(!err){
                    that.initialDatas[subType] = JSON.parse(JSON.stringify(content));
                    if(count == 0)
                        that.afterSave();
                }
                setTimeout(function(){
                    that.savingMessage = null;
                    that.appRef.tick();
                }, 2000);
            });
        });
        return false;
    }
}

ApbdesComponent['parameters'] = [ApplicationRef, NgZone];
export default ApbdesComponent;
