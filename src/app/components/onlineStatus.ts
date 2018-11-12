import { Component, Input } from '@angular/core';

@Component({
    selector: 'online-status',
    templateUrl: '../templates/onlineStatus.html',
})
export class OnlineStatusComponent{
    src: string;
    title: string;

    private _type;
    @Input()
    set type(value) {
        this._type = value;
    }
    get type() {
        return this._type;
    }
    
    constructor() {
        window.addEventListener('online',  () => this.updateOnlineStatus());
        window.addEventListener('offline',  () => this.updateOnlineStatus());
        this.updateOnlineStatus()
    }

    updateOnlineStatus(){
        this.src = "assets/sideka.png";
        this.title = "Sideka Anda Online, dan terkoneksi dengan internet";
        if(!navigator.onLine){
            this.src = "assets/sideka-offline.png";
            this.title = "Sideka Anda dalam mode offline";
        }
    }
}
