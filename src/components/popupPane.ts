import { Component, ApplicationRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import PendudukSelectorComponent from '../components/pendudukSelector';

var convert = require('color-convert');

interface SubIndicator {
    id: string;
    label: string;
    type: string;
    order?: number;
    options?: any[]
};

@Component({
    selector: 'popup-pane',
    templateUrl: 'templates/popupPane.html'
})
export default class PopupPaneComponent {
    private _selectedIndicator;
    private _selectedFeature;
    
    @ViewChild(PendudukSelectorComponent)
    pendudukSelectorComponent: PendudukSelectorComponent;

    @Input()
    set selectedIndicator(value) {
        this._selectedIndicator = value;
    }
    get selectedIndicator() {
        return this._selectedIndicator;
    }

    @Input()
    set selectedFeature(value) {
        this._selectedFeature = value;
    }
    get selectedFeature() {
        return this._selectedFeature;
    }

    selectedElement: any;
    
    subElements: any[] = [];
    elements: any[] = [];
    attributes: any[] = [];
    selectedAttribute: any;

    color: any;
    
    ngOnInit(): void { 
       this.selectedElement = this.selectedIndicator.elements.filter(e => e.value === this.selectedFeature.feature.properties['type'])[0];
      
       if(this.selectedElement)
          this.onElementChange();
    }

    onElementChange(): void {
       this.selectedFeature.feature.properties['type'] = this.selectedElement.value;
       this.attributes = this.selectedIndicator.attributes.concat(this.selectedElement.attributes);
       this.selectedAttribute = this.selectedFeature.feature.properties;

       if(this.selectedElement['style']){
           let style = Object.assign({}, this.selectedElement['style']);
           style['color'] = this.cmykToRgb(this.selectedElement['style']['color']);

           this.selectedFeature.setStyle(style);
       }
    }

    onAttributeChange(): void {
        Object.assign(this.selectedFeature.feature.properties, this.selectedAttribute)
    }

    cmykToRgb(cmyk): any {
        let c = cmyk[0], m = cmyk[1], y = cmyk[2], k = cmyk[3];
        let r, g, b;
        r = 255 - ((Math.min(1, c * (1 - k) + k)) * 255);
        g = 255 - ((Math.min(1, m * (1 - k) + k)) * 255);
        b = 255 - ((Math.min(1, y * (1 - k) + k)) * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    onPendudukSelected(data){
        this.selectedAttribute['penduduk'] = data.id;
        this.selectedAttribute['nik'] = data.nik;
        this.selectedAttribute['nama'] = data.nama;
        this.selectedAttribute['kk'] = data.no_kk;
        this.onAttributeChange();
    }
}
