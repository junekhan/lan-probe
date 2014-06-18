/**
 * Created by Administrator on 2014/6/11 0011.
 */

var nbt = require('./udp_nbt.js');
var index = 0;
var ips = new Array("192.168.9.234",  "192.168.9.8", "192.168.9.5");

function cb(machine_info){
    console.log("==========Name:" + machine_info.name);
    console.log("Type:" + machine_info.type);
    console.log("OS Version:" + machine_info.os_version);
    console.log("========================");
    if(index < ips.length - 1)
    {
        index++;
        nbt.get_detail_info(ips[index], cb);
    }
}

nbt.get_detail_info(ips[index], cb);
