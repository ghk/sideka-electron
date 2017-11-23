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

    html: any;
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

   initDragZoom(){
        var iframe : any = document.getElementById("report-preview");
        window["iframe"] = iframe;
        iframe.onload = function(){
            var $$ : any = $;
            var data : any = {scrollable : $(iframe.contentDocument),
                        acceptPropagatedEvent : true,
                        preventDefault : true}
            
            var dragscroll= {
                mouseDownHandler : function(event) {
                    // mousedown, left click, check propagation
                    if (event.which!=1 ||
                        (!data.acceptPropagatedEvent && event.target != this)){ 
                        return false; 
                    }
                    
                    // Initial coordinates will be the last when dragging
                    data.lastCoord = {left: event.clientX, top: event.clientY}; 
                
                    $$.event.add( iframe.contentDocument, "mouseup", 
                                dragscroll.mouseUpHandler, data );
                    $$.event.add( iframe.contentDocument, "mousemove", 
                                dragscroll.mouseMoveHandler, data );
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
                },
                mouseMoveHandler : function(event) { // User is dragging
                    // How much did the mouse move?
                    var delta = {left: (event.clientX - data.lastCoord.left),
                                top: (event.clientY - data.lastCoord.top)};
                    
                    // Set the scroll position relative to what ever the scroll is now
                    data.scrollable.scrollLeft(
                                    data.scrollable.scrollLeft() - delta.left);
                    data.scrollable.scrollTop(
                                    data.scrollable.scrollTop() - delta.top);
                    
                    // Save where the cursor is
                    data.lastCoord={left: event.clientX, top: event.clientY}
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
        
                },
                mouseUpHandler : function(event) { // Stop scrolling
                    $$.event.remove( iframe.contentDocument, "mousemove", dragscroll.mouseMoveHandler);
                    $$.event.remove( iframe.contentDocument, "mouseup", dragscroll.mouseUpHandler);
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
                }
            }
            $(iframe.contentDocument).bind('mousedown', dragscroll.mouseDownHandler);
            var zoom = 0.4;
            $(iframe.contentDocument).bind('wheel mousewheel', function(e: any){
                var delta;
        
                if (e.originalEvent.wheelDelta !== undefined)
                    delta = e.originalEvent.wheelDelta;
                else
                    delta = e.originalEvent.deltaY;
                delta = delta / 1000.0;
                zoom += delta;
                var scrollLeft = zoom * e.originalEvent.clientX * 2;
                var scrollTop = zoom * e.originalEvent.clientY * 2;
                $(iframe.contentDocument).scrollLeft(scrollLeft);
                $(iframe.contentDocument).scrollTop(scrollTop);
                $("html", iframe.contentDocument).css("transform", `scale(${zoom})`);
                e.preventDefault();
            });
        }
    }
    
    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }
    print(): void {
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'Peta Desa', extensions: ['pdf']}]
        });
        console.log(this.model);

        let options = { 
            "format": "A1", 
            "orientation": "landscape", 
            "type": "pdf",
            "quality": "75" 
        }

        if(fileName){
            temp.open("sidekahtml", (err, info) => {
                fs.writeFileSync(info.path, this.html);
                let tmpUrl = fileUrl(info.path);
                let win = new remote.BrowserWindow({show: false});
                win.loadURL(tmpUrl);
                win.webContents.on('did-finish-load', () => {
                    // Use default printing options
                    win.webContents.printToPDF({landscape: true, pageSize:"A4"}, (error, data) => {
                    if (error) throw error
                    fs.writeFile(fileName, data, (error) => {
                        if (error) throw error
                        console.log('Write PDF successfully.')
                        temp.cleanupSync();
                        win.destroy();
                        shell.openItem(fileName);
                    })
                    })
                });
            });
            //win.loadURL('data:text/html;charset=utf-8,'+this.html);
        }
    }
    setReport(type){
        this.model['reportType'] = type;
        this.html = this.getHtml(type);
        this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(this.html);
    }

    getHtml(type){
        let templatePath = ospath.join(__dirname, `templates\\siskeudes_report\\${type}.html`);
        let template = fs.readFileSync(templatePath,'utf8');
        let tempFunc = dot.template(template);    
        let data = this.getData(type); 

        return tempFunc(data);        
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
                    misi: item.uraian,
                    id_misi: item.code
                })                
            });

            let newRows = [];
            rows.forEach(item => {
                let tujuan = renstraData['tujuan'].filter(c => c.code.startsWith(item.id_misi));
                
                if(tujuan.length == 0){
                    newRows.push(Object.assign({}, item,{
                        tujuan:'',
                        id_tujuan:'',
                    }));
                }
                else {
                    tujuan.forEach(t => {
                        newRows.push(Object.assign({}, item,{
                            tujuan: t.uraian,
                            id_tujuan: t.code,
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
                    newRows.push(item);
                    return;
                }

                let sasaran = renstraData['sasaran'].filter(c => c.code.startsWith(item.id_tujuan));                
                if(sasaran.length !== 0){
                    sasaran.forEach(s => {
                        item['sasaran']= s.uraian;
                        item['id_sasaran'] = s.code;
                        newRows.push(item);
                    });
                }
                else {
                    item['sasaran']= '';
                    item['id_sasaran'] = '';
                    newRows.push(item);
                }               
            });

            let data = this.splitPerPage(type, newRows);
            let x = this.addRowspan(type, data.pages);
            console.log(x)
            data['tahun_awal']= this._references.visi[0].tahun_awal;
            data['tahun_akhir']= this._references.visi[0].tahun_akhir;
        
            results['data'] = data;
        }

        else if(this.activeSheet == 'rpjm'){
            let rkpData = [];
            let rows = [];
            let newRows = [];
            let sumsAnggaran = [];

            rows = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.rpjm));
            for(let i = 1; i <= 6; i++){
                let rkpSource = this.hots['rkp'+i].getSourceData().map(c => schemas.arrayToObj(c, schemas.rkp));
                if(rkpSource.length > 0){
                    rkpData = rkpData.concat(rkpSource);
                }
            }
            
            rows.forEach((row, i) => {
                let rkp = rkpData.filter(c => c.kode_kegiatan == row.kode_kegiatan);
                let nextRow = row[i+1];

                row['anggaran'] = rkp.map(c => c.anggaran).reduce((a, b) => a + b, 0);                
                row['sumber_dana'] = Array.from(new Set(rkp.map(c => c.sumber_dana))).join(',');
                row['volume'] = rkp.map(c => c.volume).reduce((a, b) => a + b, 0) +' '+ (rkp[0] && rkp[0].satuan ? rkp[0].satuan: '');  

                if(rkp.length !== 0)
                    newRows.push(row);
                
                if(!nextRow || row.kode_bidang !== nextRow.kode_bidang){
                    let anggaranPerBid = newRows.filter(c => c.kode_bidang == row.kode_bidang).map(c => c.anggaran);
                    let content = {};

                    content['total'] = rkp.map(c => c.anggaran).reduce((a, b) => a + b, 0);
                    content['kode_bidang'] = row.kode_bidang;                    
                    sumsAnggaran.push(content);
                }                
            });

            let data = this.splitPerPage(type, newRows);
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
            let data = this.splitPerPage(type, rows);

            data['tahun'] = parseInt(this._references.visi[0].tahun_awal) + (parseInt(index)-1);
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
                //data.pages = this.addRowspan(type, data.pages);
                data.totalPage = totalPage;                
                return data;
            case 'rpjm':
                let lastCheckPage = 0;
                totalPage = (source.length < 7) ? 1 : 
                    ((source.length < 11) ?  1 : 
                    Math.floor((source.length -10) / 12) + 1); 
                remainRows = (source.length < 11) ? source.length % 10 : (source.length - 10) % 12;
                totalPage = totalPage + (source.length < 7 ? 0 : (source.length < 11) ? 1 : (remainRows <10) ? 1 : 2);

                for(let i = 0; i < totalPage; i++){
                    perPage = (source.length <  7) ? 6 : i==0 ? 10 : 12;
                    let start = i == 0 ? 0 : (i * perPage);
                    let end = (i == 0 ? 1 : i+1)  * perPage; 

                    data.pages.push(source.slice(start, end))
                }
                data.totalPage = totalPage
                return data;
        }
        
    }

    addRowspan(type, source){
        switch(type){
            case 'renstra':
                let current ={ visi: {id: '', idx:0, page: 0}, misi:{id: '', idx:0,  page: 0}, tujuan:{id: '', idx:0,  page: 0}}
                let rowspan ={ visi: 0, misi: 0, tujuan: 0 }
                window['current'] = current;

                source.forEach((page, pageIdx) => {
                    page.forEach((row, i) => {
                        Object.keys(rowspan).forEach(item => {
                            let propId = 'id_'+item;
                            if(i === 0){
                                rowspan[item] = 1;
                                current[item].idx = 0;
                            }

                            if(row[propId] == current[item].id){
                                rowspan[item] = rowspan[item] + 1;
                                page[current[item].idx]['rowspan_'+item] = true;
                                page[current[item].idx]['total_rowspan_'+item] = (rowspan[item]);
                                
                            }
                            else {
                                page[i]['rowspan_'+item] = false;
                                page[i]['total_rowspan_'+item] = 0;
                                current[item].idx = i;
                                rowspan[item] = 1;
                            }
                            current[item].id = row[propId];                            
                        });
                        
                    })
                });
                return source;
        }
    }
}