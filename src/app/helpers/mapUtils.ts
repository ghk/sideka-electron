const geoJSONArea = require('@mapbox/geojson-area');
const L = require('leaflet');

export class MapUtils {
    public static readonly BUILDING_COLORS = [{
        "description": 'Sekolah',
        "color": 'darkgreen',
        "value": 'school'
    },{
        "description": 'Rumah',
        "color": '#db871e',
        "value": 'house'
    },{
        "description": 'Tempat Ibadah',
        "color": 'red',
        "value": 'place_of_worship'
    },{
        "description": 'Sumur',
        "color": 'blue',
        "value": 'waterwell'
    },{
        "description": 'Saluran Imigrasi',
        "color": '#ffe700',
        "value": 'drain'
    },{
        "description": 'Toilet',
        "color": '#e0115f',
        "value": 'toilets'
    },{
        "description": 'Lapangan Olahraga',
        "color": 'green',
        "value": 'pitch'
    },{
        "description": 'Pasar',
        "color": '#B068D9',
        "value": 'marketplace'
    },{
        "description": 'Pelabuhan',
        "color": '#FFE7FF',
        "value": 'port'
    }];

    public static readonly LANDUSE_COLORS = [{
        "description": 'Perumahan',
        "color": 'black',
        "value": 'residential'
    },{
        "description": 'Sawah',
        "color": 'darkgreen',
        "value": 'farmland'
    },{
        "description": 'Kebun',
        "color": 'green',
        "value": 'orchard'
    },{
        "description": 'Hutan',
        "color": 'yellow',
        "value": 'forest'
    },{
        "description": 'Tempat Sampah',
        "color": 'brown',
        "value": 'landfill'
    },{
        "description": 'Area Pelabuhan',
        "color": 'black',
        "value": 'harbor'
    },{
        "description": 'Sungai',
        "color": 'blue',
        "value": 'river'
    },{
        "description": 'Mata Air',
        "color": 'darkblue',
        "value": 'spring'
    }]

    public static readonly INFRASTRUCTURE_MARKERS = []

    static createGeoJson(): any{
        return {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
            },
            "features": []
        }
    }

    static setGeoJsonLayer(geoJson: any, options?: any): L.GeoJSON {
        return L.geoJSON(geoJson, options);
    }

    static setupStyle(configStyle){
        let resultStyle = Object.assign({}, configStyle);
        let color = this.getStyleColor(configStyle);
        if(color)
            resultStyle['color'] = color;
        return resultStyle;
    }

    static getStyleColor(configStyle, defaultColor=null){
        if(configStyle['cmykColor'])
            return this.cmykToRgbString(configStyle['cmykColor']);
        if(configStyle['rgbColor'])
            return this.rgbToRgbString(configStyle['rgbColor']);
        return defaultColor;
    }

    static cmykToRgbString(cmyk): any {
        let c = cmyk[0], m = cmyk[1], y = cmyk[2], k = cmyk[3];
        let r, g, b;
        r = 255 - ((Math.min(1, c * (1 - k) + k)) * 255);
        g = 255 - ((Math.min(1, m * (1 - k) + k)) * 255);
        b = 255 - ((Math.min(1, y * (1 - k) + k)) * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    }
  
    static rgbToRgbString(rgb): any {
        let r = rgb[0], g = rgb[1], b = rgb[2];
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    static createMarker(url, center): L.Marker {
        let bigIcon = L.icon({
            iconUrl: 'assets/markers/' + url,
            iconSize:     [15, 15],
            shadowSize:   [50, 64],
            iconAnchor:   [22, 24],
            shadowAnchor: [4, 62],
            popupAnchor:  [-3, -76]
        });

        return L.marker(center, {icon: bigIcon});
    }
}
