import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter } from "@angular/core";
import { DomSanitizer, SafeResourceUrl, SafeUrl} from '@angular/platform-browser';
import { remote, shell } from "electron";
import { Subscription } from 'rxjs';

import * as $ from 'jquery';
import * as fs from 'fs';
import * as jetpack from 'fs-jetpack';
import * as ospath from 'path';
import * as d3 from 'd3';
import * as dot from 'dot';
import * as base64Img from 'base64-img';
import * as fileUrl from 'file-url';
import * as os from 'os';

var temp = require('temp');
temp.dir = os.tmpdir();
temp.track();

import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SiskeudesService from '../stores/siskeudesService';
import schemas from '../schemas';
import { RENSTRA_FIELDS } from '../stores/siskeudesContentManager';
import { rupiahRenderer } from '../schemas/renderers';

enum RenstraTypes { visi = 0, misi = 2, tujuan = 4, sasaran = 6 };
RENSTRA_FIELDS

@Component({
    selector: 'siskeudes-print',
    templateUrl: '../templates/siskeudesPrint.html'
})
export default class SiskeudesPrintComponent {  
    private _parameters;  
    private _hots;  
    private _page;
    private _activeSheet;
    private _references;         

    @Input()
    set parameters(value){
        this._parameters = value;
    }
    get parameters(){
        return this._parameters;
    }

    @Input()
    set hots(value){
        this._hots = value;
    }
    get hots(){
        return this._hots;
    }

    @Input()
    set page(value){
        this._page = value;
    }
    get page(){
        return this._page;
    }

    @Input()
    set activeSheet(value){
        this._activeSheet = value;
    }
    get activeSheet(){
        return this._activeSheet;
    }

    @Input()
    set references(value){
        this._references = value;
    }
    get references(){
        return this._references;
    }

    sanitizedHtml: any;
    bigConfig: any;
    settingsSubscription: Subscription;
    settings: any;
    params: any;
    pemda: any;
    desa: any;
    model: any = {};
    reference: any = {};
    activeReport: string;
    tempFunc:any;
    dataTemplate: any;
    
    constructor(private dataApiService: DataApiService, 
        private settingsService: SettingsService,
        private sanitizer: DomSanitizer,
        private siskeudesService: SiskeudesService,
        ){}

    ngOnInit(): void {
        this.settings = {};
        this.params = {};

        this.settingsSubscription = this.settingsService.getAll().subscribe(async (settings) => {
            this.settings = settings; 
            
            let desa = await this.siskeudesService.getTaDesa();
            let pemda = await this.siskeudesService.getTaPemda();

            this.desa = desa[0];
            this.pemda = pemda[0];
            
            let reportType = this.parameters.reportTypes[0].name;
            this.setReport(reportType);

            setTimeout(() => {
                //this.initDragZoom();
            }, 0); 
        });
    }
   
    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }

    print(): void {
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'Report', extensions: ['pdf']}]
        });

        if(fileName){
            let win = new remote.BrowserWindow({show: false}); 
            let data = this.mergeModel(this.model, this.dataTemplate);
            let html = this.tempFunc(data);

            win.loadURL("data:text/html;charset=utf-8," + encodeURI(html)); 
            win.webContents.on('did-finish-load', () => {
                // Use default printing options
                win.webContents.printToPDF({}, (error, data) => {
                if (error) throw error
                fs.writeFile(fileName, data, (error) => {
                    if (error) throw error
                    console.log('Write PDF successfully.')
                    win.destroy();
                    shell.openItem(fileName);
                })
                })
            });
        }
    }

    setReport(type){
        this.activeReport = type;
        this.model['reportType'] = type;

        let templatePath = ospath.join(__dirname, `templates\\siskeudes_report\\${type}.html`);
        let template = fs.readFileSync(templatePath,'utf8');

        this.dataTemplate = this.getData(type); 
        this.tempFunc =  dot.template(template); 
        this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(this.tempFunc(this.dataTemplate));
    }

    getData(type){
        let results;

        switch(this.page){
            case 'perencanaan':
                results = this.perencanaanTransformers(type);
                break;
            case 'penganggaran':
                results =  this.penganggaranTransformers(type);
                break;
            case 'penerimaan':
                results =  this.penerimaanTransformers(type);
            case 'spp':
                results =  this.sppTransformers(type);
        }
        return results;
    }

    perencanaanTransformers(type){
        let results = {};
        Object.assign(results, this.desa, this.pemda);

        if(this.activeSheet == 'renstra'){
            let renstraData = {
                visi: [],
                misi: [],
                tujuan: [],
                sasaran: []
            };
            
            let rows = [];
            let sourceData = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.renstra));
            
            sourceData.forEach(item =>{
                let id = item.code.split('.')[3];
                renstraData[RenstraTypes[id.length]].push(item);
            });

            renstraData['misi'].forEach(item => {
                rows.push({
                    visi: renstraData['visi'][0].uraian,
                    id_visi: renstraData['visi'][0].code,
                    number_visi:'01',
                    misi: item.uraian,
                    id_misi: item.code,
                    number_misi: item.code.slice(-2)
                })                
            });

            let newRows = [];
            rows.forEach(item => {
                let tujuan = renstraData['tujuan'].filter(c => c.code.startsWith(item.id_misi));
                
                if(tujuan.length == 0){
                    newRows.push(Object.assign({}, item,{
                        tujuan:'',
                        id_tujuan:'',
                        number_tujuan: ''
                    }));
                }
                else {
                    tujuan.forEach(t => {
                        newRows.push(Object.assign({}, item,{
                            tujuan: t.uraian,
                            id_tujuan: t.code,
                            number_tujuan: t.code.slice(-2)
                        }));
                    });
                }
            })
            rows = newRows;
            newRows = [];
            
            rows.forEach(item =>{
                if(item.id_tujuan == ""){
                    item['sasaran']= '';
                    item['id_sasaran'] = '';
                    item['number_sasaran'] ='';
                    newRows.push(item);
                    return;
                }

                let sasaran = renstraData['sasaran'].filter(c => c.code.startsWith(item.id_tujuan));                
                if(sasaran.length !== 0){
                    sasaran.forEach(s => {
                        newRows.push(Object.assign({}, item,{
                            sasaran: s.uraian,
                            id_sasaran: s.code,
                            number_sasaran: s.code.slice(-2)
                        }));
                    })
                }
                else {
                    item['sasaran']= '';
                    item['id_sasaran'] = '';
                    item['number_sasaran'] = '';
                    newRows.push(item);
                }               
            });

            let data = this.splitPerPage(type, this.normalizeRows(newRows));
            data['tahun_awal']= this._references.visi[0].tahun_awal;
            data['tahun_akhir']= this._references.visi[0].tahun_akhir;        
            results['data'] = data;
        }

        else if(this.activeSheet == 'rpjm'){
            let rkpData = [];
            let rows = [];
            let newRows = [];

            rows = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.rpjm));
            for(let i = 1; i <= 6; i++){
                let rkpSource = this.hots['rkp'+i].getSourceData().map(c => schemas.arrayToObj(c, schemas.rkp));
                if(rkpSource.length > 0){
                    rkpData = rkpData.concat(rkpSource);
                }
            }
            
            rows.forEach((row, i) => {
                let rkp = rkpData.filter(c => c.kode_kegiatan == row.kode_kegiatan);

                if(rkp.length !== 0){
                    row['anggaran'] = rkp.map(c => c.anggaran).reduce((a, b) => a + b, 0);                
                    row['sumber_dana'] = Array.from(new Set(rkp.map(c => c.sumber_dana))).join(',');
                    row['volume'] = rkp.map(c => c.volume).reduce((a, b) => a + b, 0) +' '+ (rkp[0] && rkp[0].satuan ? rkp[0].satuan: '');  
                    row['nomor_bidang'] = row.kode_bidang.split('.')[2];
                    newRows.push(row);
                }
            });

            let data = this.splitPerPage(type, this.normalizeRows(newRows));
            data['tahun_awal']= this._references.visi[0].tahun_awal;
            data['tahun_akhir']= this._references.visi[0].tahun_akhir;
            results['data'] = data;
        }
        else {
            let rpjmData = this.hots['rpjm'].getSourceData().map(c => schemas.arrayToObj(c, schemas.rpjm));
            let rows = [];
            
            rows = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.rkp));
            rows.forEach(row => {
                let findResult = rpjmData.find(c => c.kode_kegiatan == row.kode_kegiatan);
                
                if(!findResult)
                    return;

                row['sasaran'] = findResult.sasaran;
                row['nomor_bidang'] = row.kode_bidang.split('.')[2];
            });

            if(type == 'rkp_kegiatan'){
                let newRows = [];

                rows.forEach(content => {
                    let row = Object.assign({},content);
                    let findResult = newRows.find(c => c.kode_kegiatan == row.kode_kegiatan);

                    if(findResult){
                        findResult['volume'] = findResult['volume'] + row['volume'];
                        findResult['anggaran'] = findResult['anggaran'] + row['anggaran'];
                        findResult['jumlah_sasaran_pria'] = findResult['jumlah_sasaran_pria'] + row['jumlah_sasaran_pria'];
                        findResult['jumlah_sasaran_wanita'] = findResult['jumlah_sasaran_wanita'] + row['jumlah_sasaran_wanita'];
                        findResult['jumlah_sasaran_rumah_tangga'] = findResult['jumlah_sasaran_rumah_tangga'] + row['jumlah_sasaran_rumah_tangga'];
                        findResult['total_sasaran'] = findResult['jumlah_sasaran_pria'] + findResult['jumlah_sasaran_wanita'] +  findResult['jumlah_sasaran_rumah_tangga'];
                    }
                    else {
                        row['total_sasaran'] = row['jumlah_sasaran_pria'] + row['jumlah_sasaran_wanita'] +  row['jumlah_sasaran_rumah_tangga'];                     
                        newRows.push(row)
                    }
                });
                rows = newRows;
            }
            else if (type == 'rkp_pagu'){
                let newRows =  [];
                let anggaranSumberdana = {};
                let currentBidang = '';
                let fields = ['kode','uraian','dds', 'add','pbh', 'pbp', 'pbk','pad', 'swd','dll', 'total'];
                let sumberDana = {'dds': 0, 'add': 0,'pbh': 0, 'pbp': 0, 'pbk': 0,'pad': 0, 'swd': 0,'dll': 0};
                                
                rows.forEach(content => {
                    let row = Object.assign({}, content);
                    let bidangId = row.kode_bidang.replace(this.desa.kode_desa,'');
                    let kegiatanId = row.kode_kegiatan.replace(this.desa.kode_desa,'');
                    let sumber = row.sumber_dana.toLowerCase();

                    //push bidang
                    if(currentBidang == '' || currentBidang !== row.kode_bidang){
                        let arr = [bidangId, row.nama_bidang,'','','','','','','','',''];
                        newRows.push(this.arrayToObj(arr, fields));
                        currentBidang = row.kode_bidang;
                    }

                    let findResult = newRows.find(c => c.kode == kegiatanId);

                    if(findResult){
                        findResult[sumber] = findResult[sumber] + row.anggaran;
                        findResult['total'] = findResult['total'] + row.anggaran;
                    }
                    else {
                      let content = Object.assign(
                          {}, 
                          { kode: kegiatanId, uraian: row.nama_kegiatan }, 
                          sumberDana, 
                          { [sumber]: row.anggaran, total: row.anggaran }
                        ); 

                        newRows.push(content);
                    }
                })
                rows = newRows;
            }

            let index = this.activeSheet.match(/\d+/g);
            let data = this.splitPerPage(type, this.normalizeRows(rows));
            let year = this._references.visi[0].tahun_awal;

            data['tahun'] = parseInt(year) + (parseInt(index)-1);
            results['data'] = data;
        }
        return results;
    }

    penganggaranTransformers(type){

    }

    penerimaanTransformers(type){

    }

    sppTransformers(type){

    }

    arrayToObj(arr: any[], schema: any[]): any {
        let result = {};

        for (var i = 0; i < schema.length; i++)
            result[schema[i]] = arr[i];

        return result;
    }

    splitPerPage(type, source){
        let data = {
            totalPage: 0,
            pages: []
        }
        let perPage, totalPage, remainRows;
        switch(type){
            case 'renstra':
                perPage = (source.length <  7) ? 6 : 8;
                totalPage = (source.length < 7) ? 1 : Math.floor(source.length / 8); 
                remainRows = source.length % perPage;

                totalPage = totalPage + (source.length < 7 ? 0 : (remainRows < 7) ? 1 : 2);
                for(let i = 0; i < totalPage; i++){
                    let start = i == 0 ? 0 : (i * perPage);
                    let end = (i == 0 ? 1 : i+1)  * perPage; 

                    data.pages.push(source.slice(start, end))
                }
                data.pages = this.addRowspan(type, data.pages);
                data.totalPage = totalPage;                
                return data;

            case 'rpjm':
            case 'rkp_tahunan':
            case 'rkp_kegiatan':
                let indexBidang = {}
                let lastCheckPage = 0;

                totalPage = (source.length < 7) ? 1 : 
                    ((source.length < 11) ?  1 : 
                    Math.floor((source.length -10) / 13) + 1); 
                remainRows = (source.length < 11) ? source.length % 10 : (source.length - 10) % 13;
                totalPage = totalPage + (source.length < 7 ? 0 : (source.length < 11) ? 1 : (remainRows <10) ? 1 : 2);

                let beforePerPage = 0, beforeStartRow = 0, beforeEndRow = 0;
                for(let i = 0; i < totalPage; i++){
                    perPage = (source.length <  7) ? 6 : i == 0 ? 10 : 13;
                    let start =beforeEndRow;
                    let end = beforeEndRow + perPage; 

                    let rowPerPage = source.slice(start, end);
                    let bidang = Array.from(new Set(rowPerPage.map(c => c.kode_bidang)));
                    let nextBidangRow = (source[end-1] && source[end-1].kode_bidang) ? source[end-1].kode_bidang : null;
                    
                    if(bidang.slice(-1)[0] == nextBidangRow){
                        bidang.splice(-1);
                    }

                    if(bidang.length > 1 && bidang.length < 4){
                        perPage = perPage -1;
                    }

                    start = beforeEndRow;
                    end = beforeEndRow + perPage; 

                    beforePerPage = perPage;
                    beforeEndRow = end;

                    data.pages.push(source.slice(start, end));
                    if(beforeEndRow <= source.length && i+1===totalPage){
                        totalPage +=1
                    }
                }
                let pages = this.addSumTotal(type, data.pages);

                pages = this.addRowspan(type, pages);
                data.pages = this.parseToCurenncy(pages);
                data.totalPage = totalPage;
                return data;
        }
        
    }

    addSumTotal(type, source){
        let results = [];
        let currentBidang ='', sum = 0, isAdded = false, stopLooping = false, sumAllBidang= 0, isAddNextPage= false;
        let sumSasaran = { total_all_sasaran: 0, total_sasaran_pria:0, total_sasaran_wanita: 0, total_sasaran_artm:0 }
        let sumAllSasaran = { total_all_sasaran_bidang: 0, total_all_sasaran_pria:0, total_all_sasaran_wanita: 0, total_all_sasaran_artm:0 }
        source.forEach((rows, pageIndex) => {
            let newRows = [];
            rows.forEach((row, rowIndex) => {
                if(stopLooping)
                    return;

                let nextRow = rows[rowIndex + 1];
                let nextPageRow = source[pageIndex+1] ? source[pageIndex+1][0] : null;
                if(isAdded){
                    let content = {kode_bidang: row.kode_bidang, total_anggaran: sum, sum_total: true }
                    if(type == 'rkp_kegiatan')
                        Object.assign(content, sumSasaran);
                    newRows.push(content);
                    isAdded = false;
                }

                if(currentBidang == row.kode_bidang){
                    sum += row.anggaran;
                    sumAllBidang += row.anggaran;
                    if(type == 'rkp_kegiatan'){
                        sumSasaran.total_all_sasaran +=row.total_sasaran;
                        sumSasaran.total_sasaran_pria +=row.jumlah_sasaran_pria;
                        sumSasaran.total_sasaran_wanita +=row.jumlah_sasaran_wanita;
                        sumSasaran.total_sasaran_artm +=row.jumlah_sasaran_rumah_tangga;   
                        
                        sumAllSasaran.total_all_sasaran_bidang +=row.total_sasaran;
                        sumAllSasaran.total_all_sasaran_pria +=row.jumlah_sasaran_pria;
                        sumAllSasaran.total_all_sasaran_wanita +=row.jumlah_sasaran_wanita;
                        sumAllSasaran.total_all_sasaran_artm +=row.jumlah_sasaran_rumah_tangga;
                    }
                }
                else{
                    sum = row.anggaran;
                    sumAllBidang += row.anggaran;
                    currentBidang = row.kode_bidang;
                    if(type == 'rkp_kegiatan'){
                        sumSasaran.total_all_sasaran =row.total_sasaran;
                        sumSasaran.total_sasaran_pria =row.jumlah_sasaran_pria;
                        sumSasaran.total_sasaran_wanita =row.jumlah_sasaran_wanita;
                        sumSasaran.total_sasaran_artm =row.jumlah_sasaran_rumah_tangga;

                        sumAllSasaran.total_all_sasaran_bidang +=row.total_sasaran;
                        sumAllSasaran.total_all_sasaran_pria +=row.jumlah_sasaran_pria;
                        sumAllSasaran.total_all_sasaran_wanita +=row.jumlah_sasaran_wanita;
                        sumAllSasaran.total_all_sasaran_artm +=row.jumlah_sasaran_rumah_tangga;
                    }
                }
                newRows.push(row);

                if(nextRow && nextRow.kode_bidang !== currentBidang){
                    let content = { kode_bidang: row.kode_bidang, total_anggaran: sum, sum_total: true }
                    if(type == 'rkp_kegiatan')
                        Object.assign(content, sumSasaran);
                    newRows.push(content);
                }
                else if(!nextRow && !source[pageIndex+1]){
                    let content = {kode_bidang: row.kode_bidang, total_anggaran: sum ,sum_total: true};
                    let contentTotalAllBidang = { jumlah_total_anggaran: sumAllBidang, is_all_total: true };
                    
                    if(type == 'rkp_kegiatan'){
                        Object.assign(content, sumSasaran);
                        Object.assign(contentTotalAllBidang, sumAllSasaran)
                    }
                        
                    newRows.push(content);
                    newRows.push(contentTotalAllBidang);
                }
                else if(!nextRow && source[pageIndex+1] &&  source[pageIndex+1].length == 0 && rowIndex+1 == rows.length){
                    isAddNextPage = true
                }
                if(rowIndex+1 == rows.length){
                    if(nextPageRow && rows.length == 13 && nextPageRow.kode_bidang !== currentBidang){
                        isAdded =true;
                    }
                }
                
            });

            if(newRows.length !== 0)
                results.push(newRows);
            if(isAddNextPage){
                let content = {kode_bidang: currentBidang, total_anggaran: sum ,sum_total: true}
                let contentTotalAllBidang = { jumlah_total_anggaran: sumAllBidang, is_all_total: true }

                if(type == 'rkp_kegiatan'){
                    Object.assign(content, sumSasaran);
                    Object.assign(contentTotalAllBidang, sumAllSasaran)
                }
                if(!results[pageIndex+1])
                    results[pageIndex+1] = [];
                    
                results[pageIndex+1].push(content);
                results[pageIndex+1].push(contentTotalAllBidang);
                isAddNextPage = false;
            }
        });
        return results;
    }

    addRowspan(type, source){
        let current = {};
        let rowspan = {};
        let entityId = {};

        switch(type){
            case 'renstra':
                current = { visi: {id: '', idx:0, page: 0}, misi:{id: '', idx:0,  page: 0}, tujuan:{id: '', idx:0,  page: 0 }};
                rowspan = { visi: 1, misi: 1, tujuan: 1 };
                entityId = 'id_';
                break;
            case "rpjm":
            case 'rkp_tahunan':
            case 'rkp_kegiatan':
                current = { bidang: {id: '', idx:0, page: 0}}
                rowspan = { bidang:1 }
                entityId = 'kode_';
                break;
        }

        source.forEach((page, pageIdx) => {                    
            Object.keys(rowspan).forEach(c => rowspan[c] = 1);
            page.forEach((row, i) => {
                if(row.sum_total || row.is_all_total)
                    return;
                Object.keys(rowspan).forEach(key => {
                    let propId = entityId+key;   
                    if(i === 0){
                        current[key].idx = 0;
                    }
                    if(current[key].id === row[propId] && row[propId] !== ''){
                        rowspan[key] += 1;

                        if(current[key].page !== pageIdx && i === 0){
                            rowspan[key] = 1;
                            row['total_rowspan_'+key] = 1;      
                            row['hidden_detail_'+key] = true;                             
                        }
                        else {
                            let rowSelected =page[current[key].idx];
                            
                            rowSelected['rowspan_'+key] = true;
                            rowSelected['total_rowspan_'+key] = rowspan[key];
                            row['total_rowspan_'+key] = 0;
                        }

                        row['rowspan_'+key] = true;
                        
                        
                        if(current[key].page !== pageIdx){
                            row['hidden_detail_'+key] = true;
                        }
                    }
                    else {
                        current[key].idx = i;
                        row['rowspan_'+key] = false;
                        rowspan[key] = 1;
                        current[key].page = pageIdx;
                    }
                    current[key].id = row[propId];
                });                
            })
        });
        return source;
    }

    normalizeRows(rows){
        rows.forEach(row => {
            Object.keys(row).forEach(key => {
                row[key] = row[key]=== undefined || row[key] === null || row[key]=== 'undefined' ? '' : row[key]; 
            })
        });
        return rows;
    }

    parseToCurenncy(pages){
        pages.forEach(rows => {
           rows.forEach(row => {
                let entityName = row.anggaran ? 'anggaran' : row.total_anggaran ? 'total_anggaran' : 'jumlah_total_anggaran';
                let budget = row[entityName];
                
                if(!budget) return;
                let	budgetString = budget.toFixed(2),

                split	= budgetString.split('.'),
                remain 	= split[0].length % 3,
                rupiah 	= split[0].substr(0, remain),
                thousand 	= split[0].substr(remain).match(/\d{1,3}/gi);
                        
                if (thousand) {
                    let separator = remain ? '.' : '';
                    rupiah += separator + thousand.join('.');
                }
                row[entityName] = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
           }); 
        });
        return pages;
    }

    mergeModel(model, data){
        Object.keys(model).forEach(key => {
            if(model[key] == '' || model[key] === undefined || model[key] === null)
                return;
            let value = model[key];
            
            if(key === 'nama_provinsi'){
                value = 'PROVINSI '+model[key].toUpperCase();
            }
            else if(key == 'nama_pemda'){
                value = 'KABUPATEN '+model[key].toUpperCase();
            }
            data[key] = value;
        });

        return data;
    }
}