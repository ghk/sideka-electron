var { Component } = require('@angular/core');

@Component({
    selector: 'desa-registration',
    templateUrl: 'templates/desaRegistration.html',
    inputs : ['type']
})
export default class DesaRegistrationComponent{
    
    kemendagriCode: string;
    domainName: string;
    domainKind: string = ".desa.id";
    userEmail: string;
    username: string;
    
    state = 1;
    
    constructor() {
    }
    
    nextState(){
        this.state += 1;
    }
    
    previousState(){
        this.state -= 1;
        return false;
    }
    
}