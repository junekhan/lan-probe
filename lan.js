/**
使用说明
1. 引用画图类

var NetBoard = _export("NetBoard")

2 初始化 画图面板
var board = new NetBoard（_id, data,options， setting）

其中
_id是 string。 表示图形所在Dom节点的id。 必须参数
data是一个json数组。 同来画图。必须参数。

options是个JSON对象。 用于接口预留。 可选参数
   axis   坐标系的 上下左右最大最小值 ，如 ｛axis：10｝表示将建立一个 x轴从-10到10，y轴从-10到10的坐标系。
   如果不设置，则默认值为10

setting是JSON对象。可选参数  。当此参数存在时，请确保options参数存在，如果不存在 请填充false。如 new NetBoard（_id, data,false, setting）.
   width  图片所占坐标系的单位宽度
   height 图片所占坐标系的单位高度。
   如果不进行设置，则默认为 3，3
具体demo见：
DrawLAN.js
由于数据结构是进行模拟的。此函数是根据模拟数据来设计的。 因此该函数仅做参考。

3. 画图
board.draw();
*/

var smb = require('smb.js');
var scanner = require('scanner.js');
const STATUS_INACTIVE = scanner.STATUS_INACTIVE;

const IMAGE_BASE_URL = "assets/testImag/@type@.png";
const IMAGE_TAB_ON = "assets/testImag/WiredNetCardSelected.png";
const IMAGE_TAB_OFF = "assets/testImag/WiredNetCardNormal.png";
const IMAGE_TAB_INACTIVE = "assets/testImag/WiredNetCardOff.png";

const MACHINE_STATUS_NOMRAL = 'Normal';

const NODE_NUM_PER_PAGE = 8;

//存储类定义变量
var _export = {};
//导出类定义的变量
function _require(module) {
   return _export[module];
}
//避免变量污染
(function() {
   function NetBoard(_id, data, options, setting) {
       var self = this;
       self._id = _id; //需要画图的dom的id
       self.options = options ? options : {}; //预留设置属性
       self.axis = self.options.axis ? Math.abs(self.options.axis) : 40; //定义坐标系上下左右的边界（正方形）
       self.slider = null;
       self.slider_text = null;
       self.total_text = null;
       self.current_page = {tab:0, page:0, total_page:0};
       self.detail_board = null;
       self.tabs = [];
       self.first_draw = true;
       //创建一个画板
			 //JXG.Options.layer['image'] = 9;
			//JXG.Options.layer['point'] = 1;
			 //JXG.Options.layer['line'] = 0;
			//JXG.Options.layer['grid'] = 7;
       if(self.board == null) {
           self.board = JXG.JSXGraph.initBoard(_id, {
               boundingbox: [-self.axis, self.axis, self.axis, -self.axis], //坐标系的上下左右最大最小值
               showCopyright: false //是否显示版权信息
           });
       }

       //genie数据
       self.data = data;
       //一般设置，这里width和height是图片的坐标尺内的宽和高
       self.setting = setting || {
           width: 8,
           height: 8,
           tab_width: 4,
           tab_height: 5
       };
   }

   //创建一个节点
   NetBoard.prototype.createNode = function(data) {
       var self = this;
       var birdImgUrl = IMAGE_BASE_URL.replace('@type@', smb.MACHINE_TYPE[data.type].imag_prefix + MACHINE_STATUS_NOMRAL);
       var width = self.setting.width;
       var height = self.setting.height;
       // body...
       var imag = self.board.create('image', [
           birdImgUrl, [data.x - width / 2, data.y - height / 2],
           [width, height]
       ], {highlight: false, fixed: true});

       //在图像中保存当前IP
       imag.ip = data.ip;


       var node = self.board.create('point', [

           function() {
							return imag.X() + width / 2
					},
					function() {
							return imag.Y() + height / 2
					}
       ], {
           size: 2,
           opacity: 1,
           name: ""
       });


       var title = self.board.create('text', [
           function() {
               return imag.X() + width / 2
           },
           function() {
               return imag.Y() + 2;
           },
           data.name
       ], {
           anchorX: 'middle',
           anchorY: 'top',
           strokecolor: 0x000000,
           highlightstrokecolor: 0x000000
       });

       imag.on('mouseup', function() {
           var minfo = self.data[self.current_page.tab].machine_infos[this.ip];
           document.getElementById('myModalLabel').innerHTML = minfo.name;

           var left_div = '<div style="display: inline-block;width:50%;text-align: right;">';
           var end_div = '</div>';
           var right_div = '<div style="display: inline-block;width:50%;">';
           $('#myModal_content').html(left_div + '定制用户名:&nbsp;&nbsp;' + end_div + right_div + minfo.name + end_div
               + '\n' + left_div + '类型:&nbsp;&nbsp;' + end_div + right_div + smb.MACHINE_TYPE[minfo.type].imag_prefix + end_div
               + '\n' +left_div + 'IP地址:&nbsp;&nbsp;' + end_div + right_div + minfo.ip + end_div
               + '\n' +left_div + 'MAC地址:&nbsp;&nbsp;' + end_div + right_div + minfo.mac + end_div
               + (minfo.type != smb.TYPE_NULL ? ('\n' +left_div + '操作系统:&nbsp;&nbsp;' + end_div + right_div + minfo.os_version + end_div) : ''));
           $('#myModal').modal();

       });

       return {
           data: data,
           node: node
       }
   };

   //连接两个节点
   NetBoard.prototype.line = function(n1, n2) {
       var _self = this;
       var lineSetting = {
           straightFirst: false,
           straightLast: false,
           strokeWidth: 2
       };
       if (n2.data.connectType == "wifi") {
           lineSetting.dash = 2
       }
       var line = _self.board.create('line', [n1.node, n2.node], lineSetting);
			line.Z(1);
       _self.board.create('text', [

           function() {
               return (n1.node.X() + n2.node.X()) / 2
           },
           function() {
               return (n1.node.Y() + n2.node.Y()) / 2
           },
           n2.data.connectType
       ]);
       return line;
   };
   //画图。
   NetBoard.prototype.draw = function(tab, page) {
       var self = this;
       self.clear_elements();

       var centerData = self.data[tab].machine_infos[self.data[tab].gateway];
       var width = self.setting.width;
       var height = self.setting.height;
       var aroundDatas = self.data[tab].machine_infos;
       var aroundDataLength = aroundDatas.length;

       self.showtotal(aroundDataLength);
       self.showpagination(aroundDataLength - 1, tab, page);
       self.showtab();

       centerData.x = 0;
       centerData.y = 0;
       self.centerNode = self.createNode(centerData);

       var num_to_show = (aroundDataLength - page * NODE_NUM_PER_PAGE - 1) > NODE_NUM_PER_PAGE ? NODE_NUM_PER_PAGE : aroundDataLength - page * NODE_NUM_PER_PAGE - 1;
       var everyAngle = 2 * Math.PI / num_to_show; //每个节点之间的角度间隔
       var i = 0;
       for (var each in aroundDatas) {
           if(i < page * NODE_NUM_PER_PAGE) {
               if(each != centerData.ip
                   && each != 'length') {
                   i++;
               }
               continue;
           }
           if(i >= (page + 1) * NODE_NUM_PER_PAGE) {
               break;
           }
           //主机数据集非纯粹数组,需要略过一些属性及网关本身.
           if(each == centerData.ip
               || each == 'length') {
               continue;
           }
           var aroundData = aroundDatas[each];
           aroundData.x = Math.cos(i * everyAngle) * (self.axis * 3 / 4 - width * 3 / 4); //求出点的x坐标
           aroundData.y = Math.sin(i * everyAngle) * (self.axis * 3 / 4 - height * 3 / 4); //求出点的y坐标
           var aroundNode = self.createNode(aroundData);
           self.line(self.centerNode, aroundNode);
           i++;
       }
   };

    NetBoard.prototype.showtotal = function(totalnum) {
        if(this.total_text != null && this.total_text.totalnum == totalnum) {
            return;
        }
        else if(this.total_text != null) {
            console.log("before: " + this.total_text.totalnum + " after: " + totalnum);
            this.board.removeObject(this.total_text);
        }
        var total_text = "总数: " + totalnum;
        this.total_text = this.board.create('text',
            [-this.axis + 1, this.axis - 1, total_text],
        {
            anchorX: 'left',
            anchorY: 'top',
            fixed: true,
            fontsize: 18
        });
        this.total_text.totalnum = totalnum;
    }

    NetBoard.prototype.showpagination = function(totalnum, tab, page) {
        var self = this;
        var total_page = 1;

        if(totalnum > NODE_NUM_PER_PAGE) {
            if((totalnum % NODE_NUM_PER_PAGE) == 0) {
                total_page = totalnum / NODE_NUM_PER_PAGE;
            }
            else {
                total_page = Math.ceil(totalnum / NODE_NUM_PER_PAGE);
            }
        }

        var cur_page = (page + 1) > total_page ? total_page : page + 1;

        if($("#pagination").css("display") == "none") {
            $("#pagination").css("display","inline");
        }

        if(self.first_draw == true) {
            $('.pagination').jqPagination({
                max_page: total_page,
                current_page: cur_page,
                page_string: '{current_page} of {max_page}',
                paged: function(p) {
                    console.log("draw page:" + p);
                    self.draw(self.current_page.tab, p - 1);
                }
            });
            self.first_draw = false;
            self.current_page.total_page = total_page;
            self.current_page.tab = tab;
            self.current_page.page = page;
        }
        else if(total_page != self.current_page.total_page
            || tab != self.current_page.tab) {
            console.log("rebuild!" + cur_page + "/" + total_page);
            self.current_page.total_page = total_page;
            self.current_page.tab = tab;
            self.current_page.page = page;
            $('.pagination').jqPagination('option', 'current_page', cur_page); //这个操作会触发翻页事件
            $('.pagination').jqPagination('option', 'max_page', total_page);

        }
    }

    NetBoard.prototype.refresh_status = function() {

        this.showtotal(this.data[this.current_page.tab].machine_infos.length);
        this.showpagination(this.data[this.current_page.tab].machine_infos.length - 1,
            this.current_page.tab, this.current_page.page + 1);
    }

    NetBoard.prototype.showtab = function() {
        var self = this;
        var len = self.data.length;
        var v_offset = self.axis - self.setting.tab_height;
        var h_offset = self.axis - 2 - len * self.setting.tab_width;

        var image;
        for(var each in self.data) {
            image = self.board.create("image", [
                (self.data[each].status == STATUS_INACTIVE ? IMAGE_TAB_INACTIVE
                    : (self.current_page.tab == each ? IMAGE_TAB_ON : IMAGE_TAB_OFF)),
                [h_offset, v_offset],
                [self.setting.tab_width, self.setting.tab_height]
            ], {fixed: true});
            image.tabno = each;
            //self.tabs.push(image);
            h_offset += self.setting.tab_width;

            image.on('mouseup', function() {
                if(this.url == IMAGE_TAB_ON
                    || this.url == IMAGE_TAB_INACTIVE) {
                    return;
                }
                self.draw(this.tabno, 0);
            });
        }
    }

    NetBoard.prototype.clear_elements = function() {
        if(this.centerNode == null) {
            return;
        }

        for(var each in this.board.objects) {
            //保留slider相关对象
            if(this.board.objects[each] == this.total_text) {
                continue;
            }
            this.board.removeObject(this.board.objects[each]);
        }
    }
   //导出函数
   _export.NetBoard = NetBoard;
})()
