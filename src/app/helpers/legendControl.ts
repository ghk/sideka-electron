import MapUtils from '../helpers/mapUtils';

import * as L from 'leaflet';
import * as geoJSONArea from '@mapbox/geojson-area';
import * as geoJSONLength from 'geojson-length';

export class LegendControl extends L.Control {
    public features = null;
    public indicator = null;

    protected div = null;
    protected surfaces = null;

    constructor() {
        super();
        this.onAdd = (map: L.Map) => {
            this.div = L.DomUtil.create('div', 'info legend');
            this.updateFromData();
            return this.div;
        };
    }

    updateFromData(){}

    roundNumber(num, scale): number {
        if(!("" + num).includes("e")) {
            return +(Math.round(parseFloat(num + "e+" + scale))  + "e-" + scale);
        } 
        else {
            let arr = ("" + num).split("e");
            let sig = "";

            if(+arr[1] + scale > 0) 
                sig = "+";
            
            return +(Math.round(parseFloat(+arr[0] + "e" + sig + (+arr[1] + scale))) + "e-" + scale);
        }
    }
}

export class LanduseControl extends LegendControl {
    updateFromData(){
        let landuseAreas = {};
        this.features.filter(f => f.properties && Object.keys(f.properties).length).forEach(f => {
            let landuse = f.properties.landuse;
            if(landuse && f.geometry){
                let area = geoJSONArea.geometry(f.geometry);
                if(!landuseAreas[landuse])
                    landuseAreas[landuse] = 0;
                landuseAreas[landuse] += area;
            }
        });
        this.div.innerHTML = "";
        this.indicator.elements.forEach(element => {
            if(element.values && landuseAreas[element.values.landuse]){
                let area = this.roundNumber((landuseAreas[element.values.landuse] / 10000), 2) + " ha";
                this.div.innerHTML += '<i style="background:' + MapUtils.getStyleColor(element["style"]) + '"></i>' + element.label +" (" + area + ')<br/><br/>';
            }
        });
    }
}

export class TransportationControl extends LegendControl {
    updateFromData(){
        let highwayLengths = {};
        this.features.filter(f => f.properties && Object.keys(f.properties).length).forEach(f => {
            let surface = f.properties.surface;
            if(surface && f.geometry){
                let highway = f.properties.highway ? f.properties.highway : '';

                if(!highwayLengths[highway])
                    highwayLengths[highway] = {};
                let surfaceLengths = highwayLengths[highway];

                let length = geoJSONLength(f.geometry);
                if(!surfaceLengths[surface])
                    surfaceLengths[surface] = 0;
                surfaceLengths[surface] += length;
            }
        });
        if(!this.surfaces){
            this.surfaces = this.indicator.attributeSets.highway.filter(e => e.key == "surface")[0].options;
        }
        this.div.innerHTML = "";
        this.indicator.elements.forEach(indicatorElement => {
            let highway = indicatorElement.values.highway;
            let surfaceLengths = highwayLengths[highway];
            if(surfaceLengths){
                let highwayLength = Object.keys(surfaceLengths).reduce((memo, key) => memo + surfaceLengths[key],0);
                if(highwayLength){
                    let length = this.roundNumber(highwayLength, 2) + " m";
                    this.div.innerHTML += '<i style="background:' + MapUtils.getStyleColor(indicatorElement["style"]) + '"></i>' + indicatorElement.label +" (" + length + ')<br/>';
                    this.surfaces.forEach(element => {
                        if(surfaceLengths && surfaceLengths[element.value]){
                            let length = this.roundNumber(surfaceLengths[element.value], 2) + " m";
                            this.div.innerHTML += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  "+element.label +" (" + length + ')<br/>';
                        }
                    });
                }
                this.div.innerHTML += "<br/>";
            }
        });
    }
}

export class BoundaryControl extends LegendControl {
    updateFromData(){
        let area = 0;
        let definitiveLength = 0;
        let indicativeLength = 0;

        this.features.filter(f => f.properties && Object.keys(f.properties).length).forEach(f => {
            let admin_level = f.properties.admin_level;
            if(admin_level == 7 && f.geometry){
                window["f"] = f;
                window["geoJSONLength"] = geoJSONLength;
                area += geoJSONArea.geometry(f.geometry);
                definitiveLength += geoJSONLength(f.geometry);
            }
        });
        let areaString = this.roundNumber((area / 10000), 2) + " ha";
        let lengthString = this.roundNumber((definitiveLength / 100), 2) + " km";
        this.div.innerHTML = "";
        this.div.innerHTML += "Luas Desa: " + areaString + '<br/><br/>';
        this.div.innerHTML += "Keliling Desa: " + lengthString + '<br/><br/>';
    }
}

export class InfrastructureControl extends LegendControl {
    updateFromData(){
        let infrastructures = {};
    }
}