var { Component } = require('@angular/core');

@Component({
    selector: 'undo-redo',
    inputs : ['hot'], 
    templateUrl: 'templates/undoRedo.html'
})
export default class UndoRedoComponent{
    constructor(){}
}
