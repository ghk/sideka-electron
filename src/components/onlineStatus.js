import { Component } from '@angular/core';

var OnlineStatusComponent = Component({
    selector: 'online-status',
    templateUrl: 'templates/onlineStatus.html',
})
.Class({
    constructor: function() {
        window.addEventListener('online',  () => this.updateOnlineStatus());
        window.addEventListener('offline',  () => this.updateOnlineStatus());
        this.updateOnlineStatus()
    },
    updateOnlineStatus: function(){
        this.src = "sideka.png";
        this.title = "Sideka Anda Online, dan terkoneksi dengan internet";
        if(!navigator.onLine){
            this.src = "sideka-offline.png";
            this.title = "Sideka Anda dalam mode offline";
        }
    }
});

export default OnlineStatusComponent;