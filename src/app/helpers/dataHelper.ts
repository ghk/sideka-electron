import schemas from '../schemas';
import * as _ from 'lodash';

export default class DataHelper {
    public static tranformToNewSchema(fromCols: any[], toCols: any[], data: any[]): any[] {
         let fromSchema = fromCols.map(e => { return {'field': e}});
         let toSchema = toCols.map(e => { return { 'field': e }});

         if(toCols.length === data.length) 
            return data;
          
         let isEqualSchema = _.isEqual(fromSchema.sort(), toSchema.sort());
   
         if(!isEqualSchema) {
             let fromDataDict = schemas.arrayToObj(data, fromSchema);
             return schemas.objToArray(fromDataDict, toSchema);
         }
    }
}

