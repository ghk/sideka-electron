import { Component, ApplicationRef, Input } from "@angular/core";
import schemas from '../schemas';

@Component({
    selector: 'pendudukDetail',
    templateUrl: 'templates/pendudukDetail.html'
})
export default class PendudukDetailComponent {
    private _detail;

    @Input()
    set detail(value){
        this._detail = value;
    }
    get detail(){
        return this._detail;
    }
}
