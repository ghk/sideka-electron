import schemas from '../schemas';
import * as _ from 'lodash';

export default class DataHelper {

    public static transformBundleToNewSchema(bundle, targetBundleSchemas){
        let schemaKeys = Object.keys(targetBundleSchemas);
        schemaKeys.forEach(key => {
            if(targetBundleSchemas[key] == "dict")
                return;

            let toColumns = targetBundleSchemas[key].map(e => e.field);
            if(!bundle['columns'][key]){
                bundle['columns'][key] = toColumns;
                bundle['data'][key] = [];
                return;
            } 
            let fromColumns = bundle['columns'][key];

            if(bundle['data']){
                if(!bundle['data'][key]){
                    bundle['data'][key] = [];
                }
                bundle['data'][key] = DataHelper.transformDataToNewSchema(fromColumns, toColumns, bundle['data'][key]);
            }

            if(bundle['diffs']){
                if(!bundle['diffs'][key]){
                    bundle['diffs'][key] = [];
                }
                bundle['diffs'][key] = bundle['diffs'][key].map(oldDiff => { return {
                    added: DataHelper.transformDataToNewSchema(fromColumns, toColumns, oldDiff.added),
                    modified: DataHelper.transformDataToNewSchema(fromColumns, toColumns, oldDiff.modified),
                    deleted: DataHelper.transformDataToNewSchema(fromColumns, toColumns, oldDiff.deleted),
                }});
            }

            bundle['columns'][key] = toColumns;
        });
    }


    public static transformDataToNewSchema(fromCols: any[], toCols: any[], data: any[]): any[] {
         if(_.isEqual(fromCols, toCols)){
             return data;
         }
         
         let fromSchema = fromCols.map(e => { return {'field': e}});
         let toSchema = toCols.map(e => { return { 'field': e }});
         let fromDataDict = data.map( d => schemas.arrayToObj(d, fromSchema));

         return fromDataDict.map(d => schemas.objToArray(d, toSchema));
    }

    public static equalsObject(obj1, obj2): boolean {
       let keys1 = Object.keys(obj1);
       let keys2 = Object.keys(obj2);

       if(keys1.length !== keys2.length)
          return false;

        for(let i=0; i<keys1.length; i++) {
           let key1 = keys1[i];
           let key2 = keys2[i];

           if(key1 !== key2 || obj1[key1] !== obj2[key2])
             return false;
        }

        return true;
    }
}

