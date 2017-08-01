import { Component, ApplicationRef, EventEmitter, Input, Output } from "@angular/core";

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

    subIndicators: SubIndicator[];
    color: any;
    
    ngOnInit(): void { 
       this.selectedElement = this.selectedIndicator.elements.filter(e => e.id === this.selectedFeature.feature.properties['id'])[0];
    }

    onElementChange(): void {
       this.selectedFeature.feature.properties = this.selectedElement;

       if(this.selectedElement['style'])
            this.selectedFeature.setStyle(this.selectedElement['style']);
    }
}
