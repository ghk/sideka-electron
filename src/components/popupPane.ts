import { Component, ApplicationRef, EventEmitter, Input, Output } from "@angular/core";

interface SubIndicator{
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
export default class PopupPaneComponent{
    private _indicators;
    private _selectedLayer;
    private _selectedIndicator;

    @Input()
    set indicators(value){
        this._indicators = value;
    }
    get indicators(){
        return this._indicators;
    }

    @Input()
    set selectedLayer(value){
        this._selectedLayer = value;
    }
    get selectedLayer(){
        return this._selectedLayer;
    }

    @Input()
    set selectedIndicator(value){
        this._selectedIndicator = value;
    }
    get selectedIndicator(){
        return this._selectedIndicator;
    }

    subIndicators: SubIndicator[];
    color: any;

    ngOnInit(): void {}

    onTypeChange(): void {
        this.loadSubIndicators(this.selectedIndicator.id, this.selectedLayer);
    }

    loadSubIndicators(indicatorId, layer): void{
        let subIndicators: SubIndicator[] = [];

        if(indicatorId === 'landuse'){
            switch(layer.feature.properties.type){
                case 'residential':
                    layer.feature.properties.style = {"fillColor": 'black', "color": 'black'};
                break;
                case 'farmland':
                    layer.feature.properties.style = {"fillColor": 'darkgreen', "color": 'darkgreen'};
                    subIndicators = [{id: 'crop', label: 'Tanaman', type: 'text'}];
                break;
                case 'orchard':
                    layer.feature.properties.style = {"fillColor": 'green', "color": 'green'};
                    subIndicators = [{id: 'trees', label: 'Pohon', type: 'text'}];
                break;
                case 'forest':
                    layer.feature.properties.style = {"fillColor": 'yellow', "color": 'yellow'};
                    subIndicators = [{id: 'trees', label: 'Pohon', type: 'text'}];
                break;
                case 'river':
                    layer.feature.properties.style = {"fillColor": 'blue', "color": 'blue'};
                    subIndicators = [{id: 'name', label: 'Nama', type: 'text'}, {id: 'width', label: 'Panjang', type: 'text'}];
                break;
                case 'spring':
                    layer.feature.properties.style = {"fillColor": 'darkblue', "color": 'darkblue'};
                    subIndicators = [{id: 'drinking_water', label: 'Air Minum', type: 'boolean'}];
                break;
            }
        }

        else if(indicatorId === 'boundary'){
            subIndicators = [{id: 'name', label: 'Nama', type: 'text'}];
        }

        else if(indicatorId === 'building'){
            switch(layer.feature.properties.type){
                case 'house':
                    layer.feature.properties.style = {"fillColor": '#db871e', "color": '#db871e'};
                    layer.setStyle(layer.feature.properties.style);
                break;
                case 'port':
                    layer.feature.properties.style = {"fillColor": '#FFE7FF', "color": '#FFE7FF'}
                    layer.setStyle(layer.feature.properties.style);
                break;
                case 'school':
                    layer.feature.properties.style = {"fillColor": 'darkgreen', "color": 'darkgreen'};

                    subIndicators = [{id: 'capacity', label: 'Kapasitas', type: 'text'}, 
                                     {id: 'name', label: 'Nama', type: 'text'}, 
                                     {id: 'addr', label: 'Alamat', type: 'text'},
                                     {id: 'isced', label: 'Tingkat', type: 'option_object', 
                                      options: [{"value": 0, "label": 'PAUD/TK'}, 
                                                {"value": 1, "label": 'SD'},
                                                {"value": 2, "label": 'SMP'},
                                                {"value": 3, "label": 'SMA'},
                                                {"value": 4, "label": 'Universitas'}]}];
                break;
                case 'place_of_worship':
                    layer.feature.properties.style = {"fillColor": 'red', "color": 'red'};

                    subIndicators = [{id: 'building', label: 'Bangunan', type: 'option', options: ['Masjid', 'Gereja', 'Vihara', 'Pura']}, 
                                     {id: 'religion', label: 'Agama', type: 'option', options: ['Islam', 'Kristen', 'Katolik', 'Buddha', 'Hindu']},
                                     {id: 'name', label: 'Name', type: 'text'}];
                break;     
                case 'waterwell':
                    layer.feature.properties.style = {"fillColor": 'blue', "color": 'blue'};

                    subIndicators = [{id: 'pump', label: 'Pompa', type: 'text'}, 
                                     {id: 'drinking_water', label: 'Air Minum', type: 'boolean'}];
                break;              
                case 'drain':
                    layer.feature.properties.style = {"fillColor": '#ffe700', "color": '#ffe700'};
                    subIndicators = [{id: 'width', label: 'Panjang', type: 'text'}];
                break;
                case 'toilets':
                    layer.feature.properties.style = {"fillColor": '#e0115f', "color": '#e0115f'};
                    subIndicators = [{id: 'access', label: 'Akses', type: 'text'}];
                break;
                case 'pitch':
                    layer.feature.properties.style = {"fillColor": 'green', "color": 'green'};
                    subIndicators = [{id: 'sport', label: 'Olahraga', type: 'text'}, {id: 'surface', label: 'Permukaan', type: 'text'}];
                break;
                case 'marketplace':
                    layer.feature.properties.style = {"fillColor": '#B068D9', "color": '#B068D9'};
                    subIndicators = [{id: 'name', label: 'Nama', type: 'text'}, {id: 'opening_hours', label: 'Jam Buka', type: 'time'}]
                break;
            }
        }

        else if(indicatorId === 'highway'){
            switch(layer.feature.properties.type){
                case 'way':
                    subIndicators = [{id: 'highway', label: 'Jalan', type: 'text'},
                                     {id: 'name', label: 'Name', type: 'text'},
                                     {id: 'lanes', label: 'Jalur', type: 'text'},
                                     {id: 'lit', label: 'Lit', type: 'boolean'},
                                     {id: 'surface', label: 'Permukaan', type: 'text'},
                                     {id: 'incline', label: 'Incline', type: 'text'},
                                     {id: 'width', label: 'Panjang', type: 'text'},
                                     {id: 'one_way', label: 'Satu Jalur', type: 'boolean'}];
                    break;
                case 'bridge':
                    subIndicators = [{id: 'name', label: 'Nama', type: 'text'}];
                    break;
            }
        }

        layer.setStyle(layer.feature.properties.style);
        this.subIndicators = subIndicators;
    }
}
