import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter } from "@angular/core";
import { DomSanitizer, SafeResourceUrl, SafeUrl} from '@angular/platform-browser';
import { remote, shell } from "electron";
import { Subscription } from 'rxjs';

import * as $ from 'jquery';
import * as fs from 'fs';
import * as jetpack from 'fs-jetpack';

import DataApiService from '../stores/dataApiService';
import MapUtils from '../helpers/mapUtils';
import SettingsService from '../stores/settingsService';

var d3 = require("d3");
var dot = require('dot');
var pdf = require('html-pdf');
var base64Img = require('base64-img');

@Component({
    selector: 'map-print',
    templateUrl: 'templates/mapPrint.html'
})
export default class MapPrintComponent {
    private _width;
    private _height;

    @Input()
    set width(value){
        this._width = value;
    }
    get width(){
        return this._width;
    }

    @Input()
    set height(value){
        this._height = value;
    }
    get height(){
        return this._height;
    }

    @Output()
    doPrint: EventEmitter<any> = new EventEmitter<any>();

    html: any;
    sanitizedHtml: any;
    bigConfig: any;
    settingsSubscription: Subscription;
    settings: any;

    constructor(private dataApiService: DataApiService, 
                private settingsService: SettingsService,
                private sanitizer: DomSanitizer){}

    ngOnInit(): void {
        this.bigConfig = jetpack.cwd(__dirname).read('bigConfig.json', 'json');
        this.settings = {};

        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings; 
        });
    }
    
    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }

    initialize(geojson): void {  
       let projection = d3.geo.mercator().scale(1).translate([0, 0]);
       let path = d3.geo.path().projection(projection);
       let bounds = path.bounds(geojson);

       let scale = .95 / Math.max((bounds[1][0] - bounds[0][0]) / this.width,
            (bounds[1][1] - bounds[0][1]) / this.height);
            
       let transl = [(this.width - scale * (bounds[1][0] + bounds[0][0])) / 2,
            (this.height - scale * (bounds[1][1] + bounds[0][1])) / 2];
       
       console.log(scale, transl);
       projection.scale(scale).translate(transl);
        
       let svg = d3.select(".svg-container").append("svg").attr("width", this.width).attr("height", this.height);
       
       for(let i=0; i<geojson.features.length; i++){
          let feature = geojson.features[i];
          let indicator = this.bigConfig.filter(e => e.id === feature.indicator)[0];
         
          if(!indicator)
            continue;

          let keys = Object.keys(feature.properties);

          if(keys.length === 0){
             svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", "steelblue");
             continue;
          }
  
          for(let j=0; j<keys.length; j++){
              let element = indicator.elements.filter(e => e.value === feature['properties'][keys[j]])[0];

              if(!element || !element['style']){
                  svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", "steelblue");
                  continue;
              }
            
              let color = MapUtils.getStyleColor(element['style'], '#ffffff');
              svg.append("path").attr("d", path(feature)).style("fill", color).style("fill-opacity", 0.5).style("stroke", color);
          }
       }

       this.dataApiService.getDesa(false).subscribe(result => {
            let desa = result;
            let templatePath = 'app\\map_preview_templates\\A1_example.html'
            let template = fs.readFileSync(templatePath,'utf8');
            let tempFunc = dot.template(template);
            
            let skalaImg = base64Img.base64Sync('app\\skala.png');
            let petaSkalaImg = base64Img.base64Sync('app\\peta-skala.png');

            this.html = tempFunc({"svg": svg[0][0].outerHTML, "skala": skalaImg, "petaSkala": petaSkalaImg, "desa": desa, "logo": this.settings.logo});
            this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(this.html);
       });
    }

    print(): void {
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'Report', extensions: ['pdf']}]
        });

        let options = { 
            "format": "A1", 
            "orientation": "landscape", 
            "base": 'file:///' + __dirname + '\\app\\',
            "type": "pdf",
            "quality": "75" 
        }

        if(fileName){
            pdf.create(this.html, options).toFile(fileName, function(err, res) {
                if (err) 
                    return console.log(err);
                
                shell.openItem(fileName);
            });         
        }
    }
}
