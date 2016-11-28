import { apbdesImporterConfig, Importer } from '../src/helpers/importer';

var importer = new Importer(apbdesImporterConfig);
importer.init("C:\\Users\\Egoz\\Desktop\\desa\\APBDES NAPAN\\LAMPIRAN APBDes  2016.xlsx")
console.log(importer.maps)