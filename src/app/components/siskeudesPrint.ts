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
            
            this.html = this.getHtml();

            
            this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(this.html)
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

    getHtml(){
        let templatePath = ospath.join(__dirname, `templates\\siskeudes_report\\${this.parameters.sheet}.html`);
        let template = fs.readFileSync(templatePath,'utf8');
        let tempFunc = dot.template(template);    
        let data = this.getData(); 

        return tempFunc(data);        
    }
    
    getData(){
        let results;

        switch(this.page){
            case 'perencanaan':
                results = this.perencanaanTransformers();
                break;
            case 'penganggaran':
                results =  this.penganggaranTransformers();
                break;
            case 'penerimaan':
                results =  this.penerimaanTransformers();
            case 'spp':
                results =  this.sppTransformers();
        }
        return results;
    }

     perencanaanTransformers(){
        let results = {};
        Object.assign(results, this.desa, this.pemda);

        if(this.activeSheet == 'renstra'){
            let renstraData = {};
            let data = {
                rows:[],
                tahun_awal: this._references.visi.tahun_awal,
                tahun_akhir: this._references.visi.tahun_akhir,
            };
            let sourceData = this.hots[this.activeSheet].getSourceData().map(c => schemas.arrayToObj(c, schemas.renstra));
            let lengthRows = [0,0,0,0]; // ini arr[0] visi, [1] misi, [2] tujuan, [3] sasaran

            sourceData.forEach(item =>{
                let id = item.code.split('.')[3];
                if(!renstraData[RenstraTypes[id.length]])
                renstraData[RenstraTypes[id.length]] = [];
                renstraData[RenstraTypes[id.length]].push(item);
            });

            renstraData['misi'].forEach(item => {
                data.rows.push({
                    visi: renstraData['visi'][0].uraian,
                    id_visi: renstraData['visi'][0].code,
                    misi: item.uraian,
                    id_misi: item.code
                })                
            });

            let newRows = [];
            data.rows.forEach(item => {
                let tujuan = renstraData['tujuan'].filter(c => c.code.startsWith(item.id_misi));

                if(tujuan.length == 0){
                    newRows.push(Object.assign({}, item,{
                        tujuan:'',
                        id_tujuan:'',
                        sasaran: '',
                        id_sasaran: '',
                    }));
                }
                else {
                    tujuan.forEach(t => {
                        newRows.push(Object.assign({}, item,{
                            tujuan: t.uraian,
                            id_tujuan: t.code,
                            sasaran: '',
                            id_sasaran: '',
                        }));
                    });
                }
            })
            data.rows = newRows;
            newRows = [];
            
            data.rows.forEach(item =>{
                let sasaran = renstraData['sasaran'].filter(c => c.code.startsWith(item.id_tujuan));
            
                if(sasaran.length == 0){
                    newRows.push(Object.assign({}, item,{
                        sasaran: '',
                        id_sasaran: '',
                    }));
                }
                else {
                    sasaran.forEach(s => {
                        newRows.push(Object.assign({}, item,{
                            sasaran: s.uraian,
                            id_sasaran: s.code,
                        }));
                    });
                }
            })
            data.rows=newRows;
            results['data'] = data;
        }
        else if(this.activeSheet == 'rpjm'){

        }
        else {

        }
        return results;
    }

    penganggaranTransformers(){

    }

    penerimaanTransformers(){

    }

    sppTransformers(){

    }
}