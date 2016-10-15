import os from 'os'; // native node.js module
import $ from 'jquery';
import { remote } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import env from './env';
import dataapi from './dataapi/dataapi';
<<<<<<< HEAD
import { initializeOnlineStatusImg } from './helpers/misc'; 
=======
import datapost from './helpers/datapost';
import request from 'request';
>>>>>>> 6037511dbd088a187cb38f227506dcb0fa2e2b68

console.log('Loaded environment variables:', env);

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var auth = dataapi.getActiveAuth();
var $xml;
var displayAuth = function() {
    if(auth == null){
        $("title").html("Sideka");
        $("#login-form").removeClass("hidden")
        $("#app-menu").addClass("hidden")
    } else {
        $("title").html("Sideka - " + auth.desa_name);
        $("#login-form").addClass("hidden")
        $("#app-menu").removeClass("hidden")
        $("#desa-name").html(auth["desa_name"]);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    displayAuth();
    $.get({
        url: "http://kabar.sideka.id/feed",
        dataType: "xml",
        success: function(data) {
            $xml = $(data);          
            datapost.saveContent("post",(new XMLSerializer()).serializeToString(data));            
        }
    }).fail(function(){
        $.get({
            url: datapost.getDir("post"),
            dataType: "xml",
            success: function(data) {
                $xml = $(data);                
            }
        })
    }).done(function(){
        var items = [];
            $xml.find("item").each(function(i) {
                if (i === 30) return false;
                var $this = $(this);

                items.push({
                    title: $this.find("title").text(), 
                    link:$this.find("link").text(),
                    description: $this.find("description").text(),
                    pubDate: $this.find("pubDate").text()
                });                
            });
            for(var i = 0; i < items.length; i++){
                var item = items[i];
                var pubDate = new Date(item.pubDate);
                var feedPost = $("#feed-post-template").clone().removeClass("hidden");
                $("a", feedPost).attr("href", item.link);
                $("h4", feedPost).html(item.title);
                $("p", feedPost).html(item.description);
                $("span.feed-date", feedPost).html(pubDate.toDateString());
                $(".panel-container").append(feedPost);
            }
    });

    $("#login-form form").submit(function(){
        var user = $("#login-form input[name='user']").val();
        var password = $("#login-form input[name='password']").val();
        dataapi.login(user, password, function(err, response, body){
            console.log(err, response, body);
            if(body.success){
                auth = body;
                dataapi.saveActiveAuth(auth);
                displayAuth();
            }
        });
        return false;
    });
    
    $("#logout-link").click(function(){
        auth = null;
        dataapi.saveActiveAuth(null);
        displayAuth();
        return false;
    });
    
    initializeOnlineStatusImg($("img.brand")[0]);

});
