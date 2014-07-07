
var remote = require("remote");
var scanner = require("scanner.js");
var NetBoard = _require("NetBoard");
var board = new NetBoard("network", null);
var initial_draw = true;

scanner.do_scan(cb_on_data);

function cb_on_data(data)
{
    board.data = jQuery.extend(true, [], data);
    if(initial_draw == true) {
        board.draw(0, 0);
        initial_draw = false;
    }
    else {
        board.refresh_status();
    }
}




