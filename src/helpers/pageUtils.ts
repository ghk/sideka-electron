import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';

export default class PageUtils {
    constructor(private dataApiService: DataApiService, 
                private sharedService: SharedService, 
                private settingsService: SettingsService){

    }
}
