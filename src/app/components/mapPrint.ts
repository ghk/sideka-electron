import { Component, Input, Output, EventEmitter } from "@angular/core";
import { DomSanitizer } from '@angular/platform-browser';
import { remote, shell, PrintToPDFOptions } from "electron";
import { Subscription } from 'rxjs';

import * as fs from 'fs';
import * as jetpack from 'fs-jetpack';
import * as ospath from 'path';
import * as d3 from 'd3';
import * as dot from 'dot';
import * as base64Img from 'base64-img';
import * as fileUrl from 'file-url';
import * as os from 'os';
import * as turf from '@turf/turf';

import { DataApiService } from '../stores/dataApiService';
import { MapUtils } from '../helpers/mapUtils';
import { SettingsService } from '../stores/settingsService';

let utm = require('utm');

let temp = require('temp');
temp.dir = os.tmpdir();
temp.track();

@Component({
    selector: 'map-print',
    templateUrl: '../templates/mapPrint.html'
})
export class MapPrintComponent {
    @Output()
    doPrint: EventEmitter<any> = new EventEmitter<any>();

    html: any;
    sanitizedHtml: any;
    settingsSubscription: Subscription;
    settings: any;

    bigConfig: any;
    seconds: number = 0.000278
    width: number;
    widthOffset: number;
    height: number;
    heightOffset: number;

    constructor(private dataApiService: DataApiService,
        private settingsService: SettingsService,
        private sanitizer: DomSanitizer) { }

    ngOnInit(): void {
        this.bigConfig = jetpack.cwd(__dirname).read('assets/bigConfig.json', 'json');
        this.settings = {};

        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings;
        });

        this.width = (760 / 1189) * document.getElementById('map-preview').offsetWidth;
        this.widthOffset = (10 / 1189) * document.getElementById('map-preview').offsetWidth;
        this.height = (760 / 841) * document.getElementById('map-preview').offsetHeight;
        this.heightOffset = (10 / 841) * document.getElementById('map-preview').offsetHeight;
    }

    initDragZoom() {
        var iframe: any = document.getElementById("map-preview");
        window["iframe"] = iframe;
        iframe.onload = function () {
            var $$: any = $;
            var data: any = {
                scrollable: $(iframe.contentDocument),
                acceptPropagatedEvent: true,
                preventDefault: true
            }

            var dragscroll = {
                mouseDownHandler: function (event) {
                    // mousedown, left click, check propagation
                    if (event.which != 1 ||
                        (!data.acceptPropagatedEvent && event.target != this)) {
                        return false;
                    }

                    // Initial coordinates will be the last when dragging
                    data.lastCoord = { left: event.clientX, top: event.clientY };

                    $$.event.add(iframe.contentDocument, "mouseup",
                        dragscroll.mouseUpHandler, data);
                    $$.event.add(iframe.contentDocument, "mousemove",
                        dragscroll.mouseMoveHandler, data);
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
                },
                mouseMoveHandler: function (event) { // User is dragging
                    // How much did the mouse move?
                    var delta = {
                        left: (event.clientX - data.lastCoord.left),
                        top: (event.clientY - data.lastCoord.top)
                    };

                    // Set the scroll position relative to what ever the scroll is now
                    data.scrollable.scrollLeft(
                        data.scrollable.scrollLeft() - delta.left);
                    data.scrollable.scrollTop(
                        data.scrollable.scrollTop() - delta.top);

                    // Save where the cursor is
                    data.lastCoord = { left: event.clientX, top: event.clientY }
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }

                },
                mouseUpHandler: function (event) { // Stop scrolling
                    $$.event.remove(iframe.contentDocument, "mousemove", dragscroll.mouseMoveHandler);
                    $$.event.remove(iframe.contentDocument, "mouseup", dragscroll.mouseUpHandler);
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
                }
            }
            $(iframe.contentDocument).bind('mousedown', dragscroll.mouseDownHandler);

            var zoom = 0.4;
            $(iframe.contentDocument).bind('wheel mousewheel', function (e: any) {
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

    initialize(geojson: any): void {
        let center = turf.center(geojson);
        let mapScale = this.getScale(geojson, 'A0');
        let step = this.getStep(mapScale);
        let borderPolygon = this.getMapBorder(center, mapScale);

        let utmZone = d3.scale.linear()
            .domain([-177, 177])
            .rangeRound([1, 60])
            .clamp(true);

        let zone = utmZone(center.geometry.coordinates[0]);
        let rotation = 183 - (zone * 6);
        let projection = d3.geo.transverseMercator().scale(1).translate([0, 0]).rotate([rotation, 0, 0]);
        let path = d3.geo.path().projection(projection);
        let bounds = path.bounds(borderPolygon);
        
        let dx = bounds[1][0] - bounds[0][0];
        let dy = bounds[1][1] - bounds[0][1];
        let scale = Math.min((this.width - this.widthOffset) / dx, (this.height - this.heightOffset) / dy)

        let scaleTranslateX = scale * (bounds[1][0] + bounds[0][0]);
        let scaleTranslateY = scale * (bounds[1][1] + bounds[0][1]);

        let transl = [
            (this.width - this.widthOffset - scaleTranslateX) / 2,
            (this.height - this.heightOffset - scaleTranslateY) / 2
        ] as [number, number];

        projection.scale(scale).translate(transl);

        let graticuleExtent = turf.bbox(borderPolygon);
        let graticule = d3.geo.graticule().extent([[graticuleExtent[0], graticuleExtent[1]], [graticuleExtent[2], graticuleExtent[3]]]).step([step, step]);
        let labeledGraticule = null;
        if ((step / 5) === 0.000278) {
            let newStep = step * 2
            labeledGraticule = d3.geo.graticule().extent([[graticuleExtent[0], graticuleExtent[1]], [graticuleExtent[2], graticuleExtent[3]]]).step([newStep, newStep]);
        }

        let svgContainer = d3.select(".svg-container")
            .append("svg")            
            .attr("width", this.width)
            .attr("height", this.height)                        

        let svg = svgContainer.append("svg")
            .attr("x", this.widthOffset / 2)
            .attr("y", this.heightOffset / 2)
            .attr("width", this.width - this.widthOffset)
            .attr("height", this.height - this.heightOffset)

        let legends = [];
        let symbols = [];

        for (let i = 0; i < geojson.features.length; i++) {
            let feature = geojson.features[i];

            let indicator = this.bigConfig.filter(e => e.id === feature.indicator)[0];
            if (!indicator)
                continue;

            let keys = Object.keys(feature.properties);
            if (keys.length === 0) {
                svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", "steelblue");
                continue;
            }

            for (let j = 0; j < keys.length; j++) {
                let element = indicator.elements.filter(e => e.values[keys[j]] === feature['properties'][keys[j]])[0];
                let color = 'steelblue';             

                if (element && 'style' in element)
                    color = MapUtils.getStyleColor(element['style'], '#ffffff');

                if (feature['properties']['icon']) {
                    let featureCenter = turf.center(feature);
                    let project = projection(turf.getCoord(featureCenter) as [number, number]);
                    let marker = base64Img.base64Sync(ospath.join(__dirname, 'assets\\markers\\' + feature['properties']['icon']));

                    svg.append("svg:image")
                        .attr('class', 'mark')
                        .attr('width', 10)
                        .attr('height', 10)
                        .attr("xlink:href", marker)
                        .attr("x", project[0])
                        .attr("y", project[1])

                    svg.append("path")
                        .attr("d", path(feature))
                        .style("fill", color === 'steelblue' ? 'transparent' : color)
                        .style("stroke", color);

                    let attribute = null;

                    if (keys[j] === 'amenity') {
                        attribute = element.attributes.filter(e => e.key === 'isced')[0];
                    }

                    if (attribute) {
                        let value = attribute.key;
                        let label = attribute.label;

                        if (attribute['options']) {
                            let attributeOption = attribute.options.filter(e => e.marker === feature['properties']['icon'])[0];

                            if (attributeOption) {
                                value = attributeOption.value;
                                label = attributeOption.label;
                            }
                        }

                        let existingElement = symbols.filter(e => e.value === value)[0];

                        if (!existingElement)
                            symbols.push({ "value": value, "label": label, "marker": marker });
                    }

                    continue;
                }

                if (!element || !('style' in element)) {
                    svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", "steelblue");
                    continue;
                }

                let dashArray = element['style']['dashArray'] ? element['style']['dashArray'] : null;
                if (indicator.id == 'network_transportation') {
                    svg.append("path")
                        .attr("d", path(feature))
                        .style("fill", "transparent")
                        .style("stroke", color)
                        .style("stroke-dasharray", dashArray);
                }
                else {
                    svg.append("path")
                        .attr("d", path(feature))
                        .style("fill", color)
                        .style("stroke", color);
                }

                let existingElement = legends.filter(e => e.value === element.values[keys[j]])[0];
                if (!existingElement)
                    legends.push({ "value": element.values[keys[j]], "label": element.label, "color": color });
            }
        }

        graticule.lines().forEach(line => {
            svg.append("path")
                .attr("d", path(line))
                .style("fill", "transparent")
                .style("stroke", "steelblue");
        });

        if (labeledGraticule != null) {
            this.addGraticuleLabel(svgContainer, labeledGraticule, projection, zone);
        } else {
            this.addGraticuleLabel(svgContainer, graticule, projection, zone);
        }

        svg.append("path")
            .attr("d", path(borderPolygon))
            .style("fill", "transparent")
            .style("stroke", "black");

        this.dataApiService.getDesa(false).subscribe(result => {
            let desa = { kabupaten: null, kecamatan: null, desa: null };

            if (result)
                desa = result;

            let templatePath = ospath.join(__dirname, 'assets\\peta_preview\\landuse.html');
            let template = fs.readFileSync(templatePath, 'utf8');
            let tempFunc = dot.template(template);

            let compassImg = base64Img.base64Sync(ospath.join(__dirname, 'assets\\peta_preview\\utara.png'));

            this.html = tempFunc({
                "svg": (svgContainer[0][0] as HTMLElement).outerHTML,
                "compass": compassImg,
                "legends": legends,
                "symbols": symbols,
                "scale": mapScale,
                "utmZone": utm.fromLatLon(center.geometry.coordinates[1], center.geometry.coordinates[0]),
                "kabupaten": desa.kabupaten ? desa.kabupaten : '',
                "kecamatan": desa.kecamatan ? desa.kecamatan : '',
                "desa": desa.desa ? desa.desa : '',
                "logo": this.settings.logo
            });

            this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(this.html);

            setTimeout(() => {
                this.initDragZoom();
            }, 0);
        });
    }

    getScale(geojson: any, paperSize: string): number {
        if (paperSize === 'A0') {
            let bbox = turf.bbox(geojson);
            let longitudeLine = turf.lineString([[bbox["0"], bbox["1"]], [bbox["2"], bbox["1"]]]);
            let latitudeLine = turf.lineString([[bbox["0"], bbox["1"]], [bbox["0"], bbox["3"]]]);
            let longitudeLength = turf.length(longitudeLine, { units: 'kilometers' });
            let latitudeLength = turf.length(latitudeLine, { units: 'kilometers' });
            let length = Math.max(longitudeLength, latitudeLength);

            if (length <= 1.875) {
                return 2500;
            } else if (length < 3.5) {
                return 5000;
            } else {
                return 10000;
            }
        }

        return 2500;
    }

    getMapBorder(center: turf.Feature<turf.Point>, scale: number): turf.Feature<turf.Polygon> {
        let distance = 53.033008588991066 * scale / 100000;
        let topLeft = turf.destination(center, distance, -45);
        let bottomRight = turf.destination(center, distance, 135);
        let topLeftLng = turf.getCoord(topLeft)[0];
        let topLeftLat = turf.getCoord(topLeft)[1];
        let bottomRightLng = turf.getCoord(bottomRight)[0];
        let bottomRightLat = turf.getCoord(bottomRight)[1];
        let polygon = turf.polygon([[[topLeftLng, topLeftLat], [topLeftLng, bottomRightLat], [bottomRightLng, bottomRightLat], [bottomRightLng, topLeftLat], [topLeftLng, topLeftLat]]], { name: 'border' });
        return polygon;
    }

    getStep(scale: number): number {
        switch (scale) {
            case 2500:
                return this.seconds * 5;
            case 5000:
                return this.seconds * 10;
            default:
                return this.seconds * 20;
        }
    }

    getDMSFromDD(degree: number, lng: boolean) {
        return [
            0 | (degree < 0 ? degree = -degree : degree),
            String.fromCharCode(176),
            0 | (degree < 0 ? degree = -degree : degree) % 1 * 60,
            "'",
            0 | degree * 60 % 1 * 60,
            '"',
            degree < 0 ? lng ? 'B' : 'S' : lng ? 'T' : 'U'
        ].join('');
    }

    addGraticuleLabel(svg: d3.Selection<any>, graticule: d3.geo.Graticule, projection: d3.geo.Projection, zone: number) {
        let that = this;

        graticule.lines().slice(0, -1).forEach(line => {
            console.log(utm.fromLatLon(line.coordinates[0][1], line.coordinates[0][0]));

            svg.append("text")
                .datum(line)
                .text(function (d) {
                    var c = d.coordinates;
                    if (c[0][0] == c[1][0]) { return Math.floor(utm.fromLatLon(c[0][1], c[0][0]).easting); }
                    else if (c[0][1] == c[1][1]) { return Math.floor(utm.fromLatLon(c[0][1], c[0][0]).northing); }
                })
                .attr("class", "label-graticule-A0")
                .attr("text-anchor", function(d) {
                    var c = d.coordinates;
                    return (c[0][1] == c[1][1]) ? "end" : "start";
                })
                .attr("x", function(d) {
                    var c = d.coordinates;
                    return (c[0][1] == c[1][1]) ? that.widthOffset / 2 : projection(c[0])[0];
                })
                .attr("y", function(d) {
                    var c = d.coordinates;
                    return (c[0][1] == c[1][1]) ? projection(c[0])[1] : that.heightOffset / 2;
                })   
                .attr("transform", function(d) {
                    var c = d.coordinates;
                    return (c[0][1] == c[1][1]) ? "rotate(-90," + that.widthOffset / 2 + "," + projection(c[0])[1] + ")" : "";
                })               
        });
    }

    print(): void {
        let fileName = remote.dialog.showSaveDialog({
            filters: [{ name: 'Peta Desa', extensions: ['pdf'] }]
        });

        let options: PrintToPDFOptions = {
            printBackground: true,
            marginsType: 0,
        }

        if (fileName) {
            temp.open("sidekahtml", (err, info) => {
                fs.writeFileSync(info.path, this.html);
                let tmpUrl = fileUrl(info.path);
                let win = new remote.BrowserWindow({ show: false });
                win.loadURL(tmpUrl);
                win.webContents.on('did-finish-load', () => {
                    // Use default printing options
                    win.webContents.printToPDF(options, (error, data) => {
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
        }
    }
}
