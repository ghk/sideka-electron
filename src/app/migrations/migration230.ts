import { IMigration, Migrator } from "./migrator";

export class Migration230 implements IMigration {

    isEligible(migrator: Migrator): boolean {
        return migrator.isVersionGreaterThan("2.3.1", migrator.dataVersion);
    }

    apply(migrator: Migrator) {
    }

}