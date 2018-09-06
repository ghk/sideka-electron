import { Component, ApplicationRef, EventEmitter, Input, Output, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { MapUtils } from '../helpers/mapUtils';

@Component({
    selector: 'popup-pane',
    templateUrl: '../templates/popupPane.html'
})
export class PopupPaneComponent implements OnInit, OnDestroy {
    private _indicator;
    private _feature;

    @Input()
    set indicator(value) {
        this._indicator = value;
    }
    get indicator() {
        return this._indicator;
    }

    @Input()
    set feature(value) {
        this._feature = value;
    }
    get feature() {
        return this._feature;
    }

    @Output()
    onRemoveLayer: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onAddMarker: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onEditFeature: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onDevelopFeature: EventEmitter<any> = new EventEmitter<any>();

    element: any = null;
    attribute: any = null;
    attributes: any[] = [];
    
    constructor() {}

    ngOnInit(): void {
        this.element = this.indicator.elements
            .filter(e => e.values && Object.keys(e.values)
            .every(valueKey => e.values[valueKey] === this.feature.feature.properties[valueKey]))[0];

        if (this.element)
            this.changeElement();
    }

    changeElement(): void {
        if(this.element.values) {
            Object.keys(this.element.values).forEach(valueKey => {
                this.feature.feature.properties[valueKey] = this.element.values[valueKey];
            });
        }

        this.attributes = [];

        if(this.element.attributeSetNames){
            this.element.attributeSetNames.forEach(attributeSetName => {
                this.attributes = this.attributes.concat(this.indicator.attributeSets[attributeSetName]);
            });
        }

        if(this.element.attributes)
            this.attributes = this.attributes.concat(this.element.attributes);
        
        this.attribute = this.feature.feature.properties;

        if(this.element['style']){
            let style = MapUtils.setupStyle(this.element['style']);
            this.feature.setStyle(style);
        }

        if(this.indicator !== 'facilities_infrastructures')
          this.onEditFeature.emit(this.feature.feature.id);
    }

    changeAttribute(key: string): void {
        let attribute = this.attributes.filter(e => e.key === key)[0];

        if(attribute && attribute['options']) {
            let options = attribute['options'].filter(e => e.value == this.attribute[key])[0];

            if(options['marker']) {
                let bounds = null;
                let center = null;

                if (this.feature.feature.geometry.type === 'Point') {
                    bounds = null;
                    center = this.feature.feature.geometry.coordinates;
                }
                else {
                    bounds = this.feature.getBounds();
                    center = bounds.getCenter();
                }   

                if(this.feature['marker'])
                    this.onRemoveLayer.emit(this.feature['marker']);

                this.feature['marker'] = MapUtils.createMarker(options['marker'], center);
                this.feature.feature.properties['icon'] = options['marker'];   
                this.onAddMarker.emit(this.feature['marker']);
            }
            else if(options['style']) {
                let style = MapUtils.setupStyle(options['style']);
                this.feature.feature.properties['boundary_sign'] = style.dashArray;
                this.feature.setStyle(style);
            }
        }

        this.copy(this.feature.feature.properties, this.attribute);
        this.onEditFeature.emit(this.feature.feature.id);
    }

    copy(target, source) {
        Object.assign(target, source);
    }

    develop(): void {
        this.onDevelopFeature.emit(this.feature);
    }

    ngOnDestroy(): void {}
}