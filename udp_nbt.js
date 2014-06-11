/**
 * Created by Administrator on 2014/6/9 0009.
 */

const NBNS_REQ = new Buffer([0x20,0xBB,0x0,0x10,0x0,0x1,0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x43,0x4b,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x0,0x0,0x21,0x0,0x1]);
const NEGOTIATE_REQ = new Buffer([0xff ,0x53 ,0x4d ,0x42 ,0x72 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x5c ,0x02 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x0c ,0x00 ,0x02 ,0x4e ,0x54 ,0x20 ,0x4c ,0x4d ,0x20 ,0x30 ,0x2e ,0x31 ,0x32, 0x00]);
const SETUP_ANDX_REQ = new Buffer([0xff ,0x53 ,0x4d ,0x42 ,0x73 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x5c ,0x02 ,0x00 ,0x00 ,0x00 ,0x00 ,0x0d ,0xff ,0x00 ,0x00 ,0x00 ,0xff ,0xff ,0x02 ,0x00 ,0x5c ,0x02 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ,0x01 ,0x00 ,0x00 ,0x00 ,0x0b ,0x00 ,0x00 ,0x00 ,0x6e ,0x74 ,0x00 ,0x70 ,0x79 ,0x73 ,0x6d ,0x62, 0x00]);
/** nbns constants **/
const LEN_NBNS_HEADER = 12;
const LEN_NBNS_ANS = 45;
const LEN_NBNS_NAME_FLAG = 18;
/** smb setup andX constants **/
const LEN_SETUP_ANDX_HEADER = 32;


var dgram = require("dgram");
var server = dgram.createSocket("udp4");

var NBName = require('netbios-name');
var NBSession = require('netbios-session');

var domain = require('domain');

function afp_over_tcp(hostip)
{

}

function nbt_over_tcp(hostname, hostip)
{
    var queryName = new NBName({name: hostname,
                                suffix: 0x20});
    var myName = new NBName({name: 'test',
                                suffix: 0x20});
    var ssn = new NBSession();
    var d = domain.create();

    d.on('error', function(err) {
        //console.log('Error caught by domain:', err);
        if(err.code == 'ECONNREFUSED')
        {
            console.log('host:', err.domainEmitter._host);
        }
        else
        {
            throw err;
        }
    });

    d.run(function () {
            console.log(hostip);
            ssn.connect(139, hostip, myName,queryName,function () {
                console.log('ddddd');
                ssn.write(NEGOTIATE_REQ, function()
                {
                    console.log('negotiated!');
                })
            });
            ssn.on('message', function (msg) {
                console.log('received:' + msg);
                console.log(msg);
                if(msg[4] != 0x73) {
                    ssn.write(SETUP_ANDX_REQ, function () {
                        console.log('zzzzz');
                    });
                }
                else{
                    var word_to_skip = msg.readUInt8(LEN_SETUP_ANDX_HEADER);
                    var secure_blob_len = 0;
                    if(word_to_skip == 4){
                        secure_blob_len = msg.readInt16LE(LEN_SETUP_ANDX_HEADER + 1 + 3*2) + 1;
                    }
                    var native_os_offset = LEN_SETUP_ANDX_HEADER + 1 + word_to_skip*2 + 2 + secure_blob_len;
                    var null_term_offset = msg.toString('UTF8').indexOf('\0', native_os_offset);
                    var os_version = msg.toString('UTF8', native_os_offset, null_term_offset);
                    console.log(os_version)
                }
            });
            ssn.on('error', function(err){
                console.log(err);
            });
            ssn.on('end', function(end){
                console.log('the end');
            });
    });
}

server.on("error", function (err)
{
    console.log("server error:\n" + err.stack);
    server.close();
});

server.on("message", function (msg, rinfo)
{
    console.log("server got: " + msg + " from " +
        rinfo.address + ":" + rinfo.port);
    rcv_buf = new Buffer(msg);
    var name_cnt = rcv_buf.readUInt8(56);
    var offset = 0;
    for(var i = 0; i < name_cnt; i++)
    {
        offset = i * LEN_NBNS_NAME_FLAG + LEN_NBNS_HEADER + LEN_NBNS_ANS;
        suffix = rcv_buf.readUInt8(offset + 15);
        flag = rcv_buf.readUInt8(offset + 16);
        if((flag & 0x80) == 0 && suffix == 0) {
            var machine_name = rcv_buf.toString('UTF8', offset, offset+15);
        }
    }
    console.log(machine_name);
    nbt_over_tcp(machine_name, rinfo.address);
});

server.on("listening", function ()
{
    var address = server.address();
    console.log("server listening " +
        address.address + ":" + address.port);
});

server.send(NBNS_REQ, 0, NBNS_REQ.length, 137, '192.168.9.5');
