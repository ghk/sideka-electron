export default class Auth {

    user_id: string;
    token: string;

    desa_id: string;
    desa_name: string;
    siteurl: string;

    user_display_name: string;
    roles: string[];

    constructor(obj){
        for(let key of Object.keys(obj)){
            this[key] = obj[key];
        }
    }
}