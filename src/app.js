import os from 'os'; // native node.js module
import $ from 'jquery';
import { remote } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import env from './env';
import dataapi from './dataapi/dataapi';

console.log('Loaded environment variables:', env);

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var auth = dataapi.getActiveAuth();

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
});
