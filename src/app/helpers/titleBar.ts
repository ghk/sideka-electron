import { remote } from 'electron';

class TitleBar {
    isButtonsInitialized = false;
    constructor() { 
    }

    initializeButtons(): any {
        if(this.isButtonsInitialized)
            return;
        this.isButtonsInitialized = true;
        $('#titlebar-close-button').click(function () {
            remote.getCurrentWindow().close();
            return false;
        });
        $('#titlebar-maximize-button').click(function () {
            remote.getCurrentWindow().isMaximized() ? remote.getCurrentWindow().unmaximize() : remote.getCurrentWindow().maximize();
            return false;
        });
        $('#titlebar-minimize-button').click(function () {
            remote.getCurrentWindow().minimize();
            return false;
        });
        $('.titlebar-buttons').show();
    }

    title(title) {
        $('title').html(title);
        $('.titlebar-title').html(title);
    }

    removeTitle() {
        $('title').html('');
        $('.titlebar-title').html('');
    }

    normal(title = null) {
        if (title) {
            this.title(title);
        }
        $('.titlebar').removeClass('blue');
    }

    blue(title = null) {
        if (title) {
            this.title(title);
        }
        $('.titlebar').addClass('blue');
    }
}

let titleBar = new TitleBar();
export { titleBar }
