import { DataApiService } from '../stores/dataApiService';

export class KeuanganUtils {
    constructor(
        protected dataApiService: DataApiService, 
    ){
        
    }

    static sliceObject(obj:any, values:any[]): any {
        let res = {};
        let keys = Object.keys(obj);

        for (let i = 0; i < keys.length; i++) {
            if (values.indexOf(keys[i]) !== -1) continue;
            res[keys[i]] = obj[keys[i]]
        }
        return res;
    }

    arrayToObj(arr, schema): any {
        let result = {};
        for (let i = 0; i < schema.length; i++) {
            let newValue;
            if (arr[i] == 'true' || arr[i] == 'false')
                newValue = arr[i] == 'true' ? true : false;
            else
                newValue = arr[i];

            result[schema[i]] = newValue;
        }

        return result;
    }

    rupiahCurrency(value){ 
        if(isNaN(value))
            return;
        
        let	stringValue = value.toFixed(2),

        split	= stringValue.split('.'),
        remain 	= split[0].length % 3,
        rupiah 	= split[0].substr(0, remain),
        thousand 	= split[0].substr(remain).match(/\d{1,3}/gi);
                
        if (thousand) {
            let separator = remain ? '.' : '';
            rupiah += separator + thousand.join('.');
        }
        return split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    }
}
