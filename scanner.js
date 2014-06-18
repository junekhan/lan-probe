/**
 * Created by Administrator on 2014/6/11 0011.
 */

var nbt = require('smb.js');
//var ips = new Array("192.168.9.234",  "192.168.9.8", "192.168.9.5");
var ifs = [];
var callback;
var time_out_id = 0;

function wrapped_cb()
{
    if(typeof callback === 'function')
    {
        callback(ifs);
    }
}

function If_info()
{
    this.name = "";
    this.ip = "";
    this.netmask = "";
    this.gateway = "";
    this.status = "inactive";
    this.machine_infos = [];
    this.incomplete_ips = [];
}

function Machine_info(opt)
{
    this.ip = opt.ip;
    this.name = opt.name;
    this.mac = opt.mac;
    this.type = opt.type;
    this.os_version = opt.os_version;
}

function _ip2int(ip)
{
    var num = 0;
    ip = ip.split(".");
    num = Number(ip[0]) * 256 * 256 * 256 + Number(ip[1]) * 256 * 256 + Number(ip[2]) * 256 + Number(ip[3]);
    num = num >>> 0;
    return num;
}

function cb_on_get_one(machine_info)
{
    clearTimeout(time_out_id);
//    console.log("==========Name:" + machine_info.name);
//    console.log("Ip:" + machine_info.ip);
//    console.log("Type:" + machine_info.type);
//    console.log("OS Version:" + machine_info.os_version);
//    console.log("========================");
    for(var i = 0; i < ifs.length; i++)
    {
        var netmask = parseInt(ifs[i].netmask);
        if((netmask & _ip2int(ifs[i].ip)) == (netmask & _ip2int(machine_info.ip)))
        {
            if(machine_info.name != null)
            {
                ifs[i].machine_infos[machine_info.ip].name = machine_info.name;
            }
            ifs[i].machine_infos[machine_info.ip].type = machine_info.type;
            ifs[i].machine_infos[machine_info.ip].os_version = machine_info.os_version;
            break;
        }
    }
    time_out_id = setTimeout(wrapped_cb, 3000);
//    for(var each in ifs[0].machine_infos)
//    {
//        console.log(ifs[0].machine_infos[each]);
//    }
}

exports.do_scan = function(cb)
{
    var spawn = require('child_process').spawn;
    callback = cb;
    var ifconfig = spawn('ifconfig', ['-u']);
    ifconfig.stdout.on('data', function(data) {
        var reg = /^en\d/gm;
        var res;
        while(res = reg.exec(data))
        {
            var cur_info = new If_info();
            cur_info.name = res[0];
            ifs.push(cur_info);
        }

        reg = /(^en\d).+\n(^\s+.*\n)*^\s+inet\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+netmask\s+([^\s]+)/gm;
        while(res = reg.exec(data)) {
            for(var i = 0; i < ifs.length; i++) {
                if(ifs[i].name == res[1]) {
                    ifs[i].ip = res[3];
                    ifs[i].netmask = res[4];
                    ifs[i].status = "active";
                    break;
                }
            }
        }

        var exec = require("child_process").exec

        var netstat = exec("netstat -rn | grep default",
            function (error, data, stderr) {
                if(error != null) {
                    console.log("error:" + error);
                    console.log("stderr:" + stderr);
                    return;
                }
                var reg = /^default\s+([\S]+)\s+\S+\s+\S+\s+\S+\s+(\S+)/gm;
                var res;
                while(res = reg.exec(data)) {
                    for(var i = 0; i < ifs.length; i++) {
                        if(ifs[i].name == res[2])
                        {
                            ifs[i].gateway = res[1];
                            break;
                        }
                    }
                }
            });


        var arp = exec("arp -an",
            function (error, data, stderr) {
                if(error != null) {
                    console.log("error:" + error);
                    console.log("stderr:" + stderr);
                    return;
                }

                var reg = /\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)\s+at\s+([^\( ]+)/g;
                var res;
                while(res = reg.exec(data)) {
                    for (var each in ifs) {
                        if(ifs[each].status == "inactive") {
                            continue;
                        }
                        var netmask = parseInt(ifs[each].netmask);
                        if((netmask & _ip2int(ifs[each].ip)) == (netmask & _ip2int(res[1]))
                            && (_ip2int(res[1]) & 0xFF) != 0xFF
                            && ifs[each].ip != res[1]
                            ) {
                            var new_machine = new Machine_info({ip: res[1], mac: res[2], name: res[1]});
                            ifs[each].machine_infos[res[1]] = new_machine;
                            break;
                        }
                    }
                }
                //console.log(ifs);
                for(var index_if = 0; index_if < ifs.length; index_if++) {
                    if(ifs[index_if].status == "active")
                        break;
                }

                for(var i = 0; i < ifs.length; i++) {
                    if(ifs[i].status == "inactive") {
                        continue;
                    }
                    for(var each in ifs[i].machine_infos) {
                        nbt.get_detail_info(each, cb_on_get_one);
                    }
                }
            });
    });
}




