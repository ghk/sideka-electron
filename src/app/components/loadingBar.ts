import { Component, ApplicationRef, Input } from "@angular/core";

@Component({
    selector: 'loading-bar',
    templateUrl: '../templates/loadingBar.html'
})
export class LoadingBarComponent {
    private _message: string;
   
    @Input()
    set message(value){
        this._message = value;
    }
    get message(){
        return this._message;
    }

    constructor() { }

    ngOnInit(): void {
    }
}
