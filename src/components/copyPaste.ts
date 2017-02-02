/// <reference path="../../typings/index.d.ts" />

import { remote, app, shell, clipboard } from 'electron';
var { Component } = require('@angular/core');

@Component({
    selector: 'copy-paste',
    inputs : ['hot'], 
    templateUrl: 'templates/copyPaste.html'
})
export default class CopyPasteComponent{
    hot: any;

    constructor(){}

    cut(): void {
        this.hot.copyPaste.setCopyableText();
        var value = this.hot.copyPaste.copyPasteInstance.elTextarea.value;
        this.hot.copyPaste.triggerCut();
        clipboard.writeText(value);
    }

    copy(): void {
        this.hot.copyPaste.setCopyableText();
        var value = this.hot.copyPaste.copyPasteInstance.elTextarea.value;
        clipboard.writeText(value);
    }

    paste(): void {
        this.hot.copyPaste.onPaste(clipboard.readText());
    }
}
