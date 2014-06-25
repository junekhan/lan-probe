/**
 * Created by jun.han on 2014/6/11 0011.
 */

var nbt = require('./smb.js');
//var ips = new Array("192.168.9.234",  "192.168.9.8", "192.168.9.5");
var ifs = [];
var callback;
var time_out_id = 0;

const STATUS_INACTIVE = "inactive";

const ETH_HDR_LEN = 14;
const ARP_HDR_LEN = 28;

const ETH_ADDR_LEN = 6;
const ETH_TYPE_ARP = 0x0806;

const ARP_HARD_TYPE = 0x0001;
const ARP_PROTOCOL_IP = 0x0800;
const ARP_OPCODE_REQ = 0x0001;

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
    this.mac = "";
    this.gateway = "";
    this.status = STATUS_INACTIVE;
    this.machine_infos = {length: 0};
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

function _int2ip(number) {
    return (number >> 24 & 0x000000FF).toString() + "." + (number >> 16 & 0x000000FF).toString() + "." + (number >> 8 & 0x000000FF).toString() + "." + (number & 0x000000FF).toString();
}

function cb_on_get_one(machine_info)
{
    clearTimeout(time_out_id);

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
}

//function send_arp_over_net(eth) {
//    var dgram = require("dgram");
//    var udp4 = dgram.createSocket("udp4");
//    var buf = new Buffer(ETH_HDR_LEN + ARP_HDR_LEN);
//    var offset = 0;
//
//    //eth header
//    //dst eth addr
//    buf.fill(0xFF, offset, offset + ETH_ADDR_LEN);
//    offset += ETH_ADDR_LEN;
//    //src eth addr
//    var mac_array = eth.mac.split(':');
//    for (var each in mac_array) {
//        buf[offset++] = parseInt(mac_array[each], 16);
//    }
//    //eth type
//    buf.writeUInt16BE(ETH_TYPE_ARP, offset);
//    offset += 2;
//
//    //arp header
//    //hardware type
//    buf.writeUInt16BE(ARP_HARD_TYPE, offset);
//    offset += 2;
//    //protocol type
//    buf.writeUInt16BE(ARP_PROTOCOL_IP, offset);
//    offset += 2;
//    //hardware addr size
//    buf.writeUInt8(0x06, offset++);
//    //protocol addr size
//    buf.writeUInt8(0x04, offset++);
//    //opcode
//    buf.writeUInt16BE(ARP_OPCODE_REQ, offset);
//    offset +=2;
//    //sender mac
//    buf.copy(buf, offset, ETH_ADDR_LEN, 2*ETH_ADDR_LEN);
//    offset += ETH_ADDR_LEN;
//    //sender ip
//    var ip_array = ifs[0].ip.split('.');
//    for (var each in ip_array) {
//        buf[offset++] = parseInt(ip_array[each]);
//    }
//    //target mac
//    buf.fill(0x00, offset, offset + ETH_ADDR_LEN);
//    offset += ETH_ADDR_LEN;
//    //target ip and send
//    var netmask = parseInt(eth.netmask);
//    var net_seg = _ip2int(eth.ip) & netmask;
//    var testip = 0;
//    var cnt = 0;
//    for(testip = net_seg + 1; (testip & netmask) == net_seg; testip++) {
//        buf.writeInt32BE(testip, offset);
//          /** pcap mod require !!!!!**/
//    }
//}

function arp_trig(eth) {
    var dgram = require("dgram");
    var udp4 = dgram.createSocket("udp4");
    var buf = new Buffer('test');

    var netmask = parseInt(eth.netmask);
    var net_seg = _ip2int(eth.ip) & netmask;
    for(var testip = net_seg + 1; (testip & netmask) == net_seg; testip++) {
        udp4.send(buf, 0, buf.length, 55, _int2ip(testip));
    }
}

exports.do_scan = function(cb)
{
    ifs.length = 0;
    var spawn = require('child_process').spawn;
    callback = cb;
    var ifconfig = spawn('ifconfig', ['-u']);
    ifconfig.stdout.on('data', function(data) {
        var reg = /^(^en\d).+\n(^\s+.*\n)*^\s+ether\s+(\S+)/gm;
        var res;
        while(res = reg.exec(data))
        {
            var cur_info = new If_info();
            cur_info.name = res[1];
            cur_info.mac = res[3];
            ifs.push(cur_info);
            console.log(cur_info.mac);
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

        var exec = require("child_process").exec;

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

        for (var each in ifs) {
            if(ifs[each].status == STATUS_INACTIVE) {
                continue;
            }
            arp_trig(ifs[each]);
        }

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
                            ifs[each].machine_infos.length++;
                            break;
                        }
                    }
                }
                console.log(ifs);

                for(var i = 0; i < ifs.length; i++) {
                    if(ifs[i].status == STATUS_INACTIVE) {
                        continue;
                    }
                    for(var each in ifs[i].machine_infos) {
                        if(each != 'length') {
                            nbt.get_detail_info(each, cb_on_get_one);
                        }
                    }
                }
            });
    });
}

exports.do_scan();




