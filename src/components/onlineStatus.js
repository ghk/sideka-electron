var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var { Component } = require('@angular/core');
let OnlineStatusComponent = class OnlineStatusComponent {
    constructor() {
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        this.updateOnlineStatus();
    }
    updateOnlineStatus() {
        this.src = "sideka.png";
        this.title = "Sideka Anda Online, dan terkoneksi dengan internet";
        if (!navigator.onLine) {
            this.src = "sideka-offline.png";
            this.title = "Sideka Anda dalam mode offline";
        }
    }
};
OnlineStatusComponent = __decorate([
    Component({
        selector: 'online-status',
        templateUrl: 'templates/onlineStatus.html',
        inputs: ['type']
    })
], OnlineStatusComponent);
export default OnlineStatusComponent;
