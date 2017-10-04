import schemas from '../schemas';
import * as _ from 'lodash';

export default class DataHelper {

    public static transformBundleDataColumns(bundle, targetBundleSchemas){
        let schemaKeys = Object.keys(targetBundleSchemas);
        schemaKeys.forEach(key => {
            if(!bundle['data'][key] || !bundle['columns'][key])
            return;
        
            let fromColumns = bundle['columns'][key];
            let toColumns = targetBundleSchemas[key].map(e => e.field);

            bundle['data'][key] = DataHelper.transformToNewSchema(fromColumns, toColumns, bundle['data'][key]);
            bundle['columns'][key] = toColumns;
        });
    }


    public static transformToNewSchema(fromCols: any[], toCols: any[], data: any[]): any[] {
         if(_.isEqual(fromCols, toCols)){
             return data;
         }
         
         let fromSchema = fromCols.map(e => { return {'field': e}});
         let toSchema = toCols.map(e => { return { 'field': e }});
         let fromDataDict = data.map( d => schemas.arrayToObj(d, fromSchema));

         return fromDataDict.map(d => schemas.objToArray(d, toSchema));
    }
}

