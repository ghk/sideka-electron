import schemas from '../schemas';
import * as _ from 'lodash';

export default class DataHelper {
    public static tranformToNewSchema(fromCols: any[], toCols: any[], data: any[]): any[] {
         if(_.isEqual(fromCols, toCols)){
             return data;
         }
         
         let fromSchema = fromCols.map(e => { return {'field': e}});
         let toSchema = toCols.map(e => { return { 'field': e }});
         let fromDataDict = data.map( d => schemas.arrayToObj(d, fromSchema));

         return fromDataDict.map(d => schemas.objToArray(d, toSchema));
    }
}

