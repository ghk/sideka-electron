import $ from 'jquery';

export function initializeOnlineStatusImg(img){
    function updateOnlineStatus(){
        var src = "sideka.png";
        var title = "Sideka Anda Online, dan terkoneksi dengan internet";
        if(!navigator.onLine){
            src = "sideka-offline.png";
            title = "Sideka Anda dalam mode offline";
        }
        $(img).attr("src", src);
        $(img).attr("title", title);
    }

    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline',  updateOnlineStatus);
    updateOnlineStatus()
}