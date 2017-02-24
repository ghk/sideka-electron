import { Component } from "@angular/core";

var hot: any;

@Component({
    selector: 'surat-list',
    inputs : ['hot'], 
    templateUrl: 'templates/printSurat.html'
})
export default class PrintSuratComponent{
    hot: any;

    constructor(){   
        this.hot = hot;
    }

    print(): void {
        
    }
}

