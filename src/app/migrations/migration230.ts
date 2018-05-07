import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const jetpack = require('fs-jetpack');
import { IMigration, Migrator } from "./migrator";

export class Migration230 implements IMigration {

    version = "2.3.1";

    apply(migrator: Migrator) {
        var dataDir = migrator.sharedService.getDataDirectory();
        var metadataFile = path.join(dataDir, "contents", "metadata.json");
        if(jetpack.exists(metadataFile)){
            var metadata = JSON.parse(jetpack.read(path.join(dataDir, "auth.json")));
            var desaId = metadata["desa_id"]+"";
            fs.mkdirSync(path.join(dataDir, "desa"));
            fs.mkdirSync(path.join(dataDir, "desa", desaId));
            jetpack.move(path.join(dataDir, "contents"), path.join(dataDir, "desa", desaId, "contents"));
            if(jetpack.exists(path.join(dataDir, "settings.json"))){
                jetpack.move(path.join(dataDir, "settings.json"), path.join(dataDir, "desa", desaId, "settings.json"));
            }
            if(jetpack.exists(path.join(dataDir, "auth.json"))){
                jetpack.copy(path.join(dataDir, "auth.json"), path.join(dataDir, "desa", desaId, "auth.json"));
            }
            if(jetpack.exists(path.join(dataDir, "surat_logs"))){
                jetpack.move(path.join(dataDir, "surat_logs"), path.join(dataDir, "desa", desaId, "surat_logs"));
            }
        }
    }


}