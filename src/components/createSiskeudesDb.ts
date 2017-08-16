import { Component, NgZone } from '@angular/core';

import SharedService from '../stores/sharedService';

@Component({
    selector: 'create-siskeudes-db',
    templateUrl: 'templates/createSiskeudesDb.html',    
})

export default class CreateSiskeudesDbComponent {    
    constructor(
        private zone: NgZone,
        private sharedService: SharedService
    ) {

    }
    
    ngOnInit() {

    }
}