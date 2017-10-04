import schemas from '../schemas';
import * as _ from 'lodash';

export default class DataHelper {
    public static tranformToNewSchema(fromCols: any[], toCols: any[], data: any[]): any[] {
         let fromSchema = fromCols.map(e => { return {'field': e}});
         let toSchema = toCols.map(e => { return { 'field': e }});

         let isEqual = _.isEqual(fromSchema.sort(), toSchema.sort());

         if(!isEqual) {
             let fromDataDict = schemas.arrayToObj(data, fromSchema);
             return schemas.objToArray(fromDataDict, toSchema);
         }
         
         return data;
    }
}

