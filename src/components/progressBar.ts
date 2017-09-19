import { Component, ApplicationRef, Input } from "@angular/core";
import { Progress } from 'angular-progress-http';

@Component({
    selector: 'progress-bar',
    templateUrl: 'templates/progressBar.html'
})
export default class ProgressBarComponent {
    private _progress: Progress;
    private _message: string;

    @Input()
    set progress(value) {
        this._progress = value;
    }
    get progress() {
        return this._progress;
    }

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
