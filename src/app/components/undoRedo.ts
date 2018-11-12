import { Component, Input} from '@angular/core';

@Component({
    selector: 'undo-redo',
    templateUrl: '../templates/undoRedo.html'
})
export class UndoRedoComponent{
    private _hot;
    @Input()
    set hot(value) {
        this._hot = value;
    }
    get hot() {
        return this._hot;
    }
    constructor(){}
}
