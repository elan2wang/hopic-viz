

/*****************************************************************************
 *      Narrative Chart Basic Elements Definition                            *
 *****************************************************************************/

// _Link 连接会话的线条
function _Link(from, to, char_id) {
    this.from    = from;        // [int] 起点所在会话
    this.to      = to;          // [int] 终点所在会话
    this.char_id = char_id;     // [int] 代表的角色   
    this.dash    = "";          // [string] 虚线设置

    // position attributite
    this.x0      = 0;           // [float] 起点的X轴坐标值
    this.y0      = -1;          // [float] 起点的Y轴坐标值
    this.x1      = 0;           // [float] 终点的X轴坐标值
    this.y1      = -1;          // [float] 终点的Y轴坐标值
}

// _Character 线条所表示的角色
function _Character(id, name) {
    this.id            = id;     // [int]        角色的编号
    this.name          = name;   // [string]     角色的名称
    this.first_session = null;   // [_Session]   该角色参与的第一个会话
    this.last_session  = null;   // [_Session]   该角色出现的最后一个会话
}

// global variable 
var node_width = 10;

// _Session 会话
function _Session(id, chars, start, duration) {
    this.id        = id;           // [int]         会话编号
    this.chars     = chars;        // [array[int]]  参与会话的角色编号列表
    this.start     = start;        // [int]         会话起始时间点
    this.duration  = duration;     // [int]         会话持续时间
    this.name      = "session_"+id;//               会话名称

    // position attributite
    this.x         = 0;            // [float]  determined later
    this.y         = 0;            // [float]  determined later
    this.height    = 0;            // [float]  determined later
    this.width     = node_width;   // [float]

    this.in_links  = [];           // [array[int]]
    this.out_links = [];           // [array[int]]

    this.char_node = false;        // [Boolean]
    this.char_id   = -1; 

    // methods
    this.has_char  = function(id) {
        for (var i = 0; i < this.chars.length; i++) {
            if (id == this.chars[i]) return true;
        }
        return false;
    }
}

/*****************************************************************************
 *      Utility methods                                                      * 
 *****************************************************************************/

// Between 0 and 1.
var curvature = 0.5;

/**
 * get get path of a link
 * Bezier Curve (http://en.wikipedia.org/wiki/B%C3%A9zier_curve)
 * 
 * @param  {_Link}  _Link object
 * @return {Path}   SVG path
 */
function get_path (link, panel_width) {
    var x0 = link.x0;
    var y0 = link.y0;
    var x1 = link.x1;
    var y1 = link.y1;
    var x_mid = x1 - Math.min(panel_width*4, (x1 - x0)*3.0/10.0);

    var xi = d3.interpolateNumber(x_mid, x1);
    var x2 = xi(curvature);
    var x3 = xi(1 - curvature);

    return "M" + x0 + "," + y0 + "H" + x_mid + "C" + x2 + "," + y0 + 
           " " + x3 + "," + y1 + " " + x1 + "," + y1;
}


/*****************************************************************************
 *      Initialization Methods                                               * 
 *****************************************************************************/

/**
 * generate links from sessions, set in/out links of character
 * this method would not generate links which connect character node to its first session
 * 
 * 
 * @param  {Array}    Array of _Character objects
 * @param  {Array}    Array of _Session objects
 * @return {Array}    Array of _Link objects
 */
function generate_links (chars, sessions) {
    var links = [];
    for (var i = 0; i < chars.length; i++) {
        var char_sessions = [];
        for (var j = 0; j < sessions.length; j++) {
            if (sessions[j].has_char(chars[i].id)) {
                char_sessions[char_sessions.length] = sessions[j];
            }
        }

        char_sessions.sort(function(a, b) { return a.start - b.start; });
        chars[i].first_scence = char_sessions[0];
        chars[i].last_session   = char_sessions[char_sessions.length-1];

        for (var j = 1; j < char_sessions.length; j++) {
            links[links.length] = new _Link(
                char_sessions[j-1], char_sessions[j], chars[i].id
            );

            char_sessions[j-1].out_links[char_sessions[j-1].out_links.length] = links[links.length-1];
            char_sessions[j].in_links[char_sessions[j].in_links.length] = links[links.length-1];
        }
    }
    return links;
}

// height of text
var text_height = 8;
var link_width = 1.8;
/**
 * the chars, sessions and links have to be set before this is called
 * 
 * add beginning session for each character
 * this will result in adding new elements to sessions and links
 *
 * @param {Array} Array of _Character
 * @param {Array} Array of _Session
 * @param {Array} Array of _Link
 *
 * @return {Array}  Array of newly added _Session
 */
function add_char_sessions (chars, sessions, links) {
    var char_sessions = [];

    for(var i = 0; i < chars.length; i++) {
        var s = new _Session(null, [chars[i].id], [0], [1]);
        s.char_node = true;
        s.x = 0;
        s.y = i*text_height;
        s.width = 5;
        s.height = link_width;
        s.chars[s.chars.length] = chars[i].id;
        s.id = sessions.length;
        s.name = "session_" + s.id;
        s.char_id = chars[i].id;

        if (chars[i].first_scence != null) {
            var link = new _Link(s, chars[i].first_scence, chars[i].id);

            s.out_links[s.out_links.length] = link;
            chars[i].first_scence.in_links[chars[i].first_scence.in_links.length] = link;
            links[links.length] = link;
            chars[i].first_scence = s;

            sessions[sessions.length] = s;
            char_sessions[char_sessions.length] = s;
        }
    }
    return char_sessions;
}

// Longest name in pixels to make space at the beginning 
// of the chart. Can calculate but this works okay.
var color = d3.scale.category10();
var raw_chart_width = 5000;
var raw_chart_height = 360;

function draw_chart (path) {
    var filename = d3.select('#inputfile')[0][0].value;

    d3.json(path + filename, function(data) {
        // STEP 1. load sessions
        var total_panels = 0;
        var sessions = [];

        var jsessions = data['sessions'];
        for (var i = 0; i < jsessions.length; i++) {
            sessions[sessions.length] = new _Session(
                parseInt(jsessions[i]['id']),
                jsessions[i]['chars'], 
                parseInt(jsessions[i]['start']),
                parseInt(jsessions[i]['duration'])
            );
            total_panels += parseInt(jsessions[i]['duration']);
        }
        sessions.sort(function(a, b) { return a.start - b.start; });
        sessions[sessions.length-1].duration = 0;

        // STEP 2. load characters
        var chars = [];
        var char_map = [];
        var jchars = data["characters"];

        for (var i = 0; i < jchars.length; i++) {
            chars[chars.length] = new _Character(jchars[i].id, jchars[i].name);
            char_map[jchars[i].id] = chars[chars.length-1];
        }

        // STEP 4.
        var links = generate_links(chars, sessions);
        var char_sessions = add_char_sessions(chars, sessions, links);

        storyline = new _Storyline(jsessions, chars, links, sessions, char_sessions, char_map, total_panels, raw_chart_width, raw_chart_height);
        storyline.doDraw();
    });
}

function _Storyline(jsessions, chars, links, sessions, char_sessions, char_map, total_panels, raw_chart_width, raw_chart_height) {
    // data attributes 
    this.chars            = chars;
    this.links            = links;
    this.sessions         = sessions;
    this.char_map         = char_map;
    this.char_sessions    = char_sessions;
    this.total_panels     = total_panels;
    this.jsessions        = jsessions;

    // position attributes
    this.raw_chart_width  = raw_chart_width;
    this.raw_chart_height = raw_chart_height;
    this.link_gap         = 2;
    this.link_width       = 1.8;
    this.longest_name     = 120;
    this.margin           = {top: 20, right: 25, bottom: 20, left: 1};
    this.width            = this.raw_chart_width - this.margin.left - this.margin.right;
    this.height           = this.raw_chart_height - this.margin.top - this.margin.bottom;
    this.panel_width      = Math.min((this.width-this.longest_name)/this.total_panels, 15);
    this.panel_shift      = Math.round(this.longest_name/this.panel_width);

    // statistics attributes
    this.linecrossings    = 0; 
    this.linewiggles      = 0;
    
    // methods
    this.get_session_position_from_dot = function () {

        var digraph = json2dot(jsessions);
        var inputgraph = Viz(digraph, format="dot", engine="dot", options=null);

        // read position from dot graph
        var graph = graphlibDot.read(inputgraph);
        var sessionPos = d3.map();
        var charsessionPos = d3.map();
        for (var i=0; i<graph._nodeCount; i++) {
            var nodename = graph.nodes()[i];
            if (nodename.substring(0, 4) == 'char') {
                var charId = nodename.replace('character', '');
                var xy = graph.node(nodename).pos.split(',');
                x = xy[0]; y = xy[1];
                charsessionPos.set(charId, xy);
            } else if (nodename.substring(0, 4) == 'sess') {
                var sessionId = nodename.replace('session', '');
                var xy = graph.node(nodename).pos.split(',');
                x = xy[0]; y = xy[1];
                sessionPos.set(sessionId, xy);
            } else {
                console.log("invalid node");
            }
        }

        var link_gap = this.link_gap;
        var panel_width = this.panel_width;
        var panel_shift = this.panel_shift;
        // set position for session
        var session_sep = 15;
        var index = 0;
        sessions.sort(function(a, b) { return a.start - b.start; });
        sessions.forEach(function(session) {
            if (!session.char_node) {
                // set height & width
                session.height = Math.max(
                    0,session.chars.length*link_width+(session.chars.length-1)*link_gap
                );
                session.width = panel_width*session.duration/5;

                // set x & y
                var xy = sessionPos.get(session.id);
                //session.x = parseFloat(xy[0]);
                //session.x = panel_width*session.start+panel_shift;
                session.x = index*session_sep+panel_shift;
                session.y = parseFloat(xy[1]);
                index++;
            }
            // control character node positions
            // usually they appear right side of the chart
            char_sessions.forEach(function(session) {
                var xy = charsessionPos.get(session.char_id);
                session.x = parseFloat(xy[0]);
                session.y = parseFloat(xy[1]);
            });
        });
     }

    this.calc_link_positions = function () {
        var charsessionMap = d3.map(); 
        char_sessions.forEach(function(session) {
            charsessionMap.set(session.char_id, session);
        });

        var link_gap = this.link_gap;
        var link_width = this.link_width;
        // 计算所有直接与角色节点相连的link的起点坐标
        char_sessions.forEach(function(session) {
            for (var i = 0; i < session.out_links.length; i++) {
                if (session.out_links[i].y0 == -1) {
                    session.out_links[i].y0 = session.y + i*(link_width+link_gap) + link_width/2.0;
                }
                session.out_links[i].x0 = session.x + 0.5*session.width;
            }
        });

        sessions.forEach(function(session) {
            if (session.char_node == false) {
                // 入度的线条根据他们前一个位置的Y坐标进行排序
                // session.in_links.sort(function(a, b) { return charsessionMap.get(a.char_id).y - charsessionMap.get(b.char_id).y; });
                // session.out_links.sort(function(a, b) { return charsessionMap.get(a.char_id).y - charsessionMap.get(b.char_id).y; });
                session.in_links.sort(function(a, b) { return a.y0 - b.y0; });

                for (var i = 0; i < session.out_links.length; i++) {
                    session.out_links[i].y0 = -1;
                }

                for (var i = 0; i < session.in_links.length; i++) {
                    session.in_links[i].y1 = session.y + i*(link_width+link_gap) + link_width/2.0;
                    session.in_links[i].x1 = session.x;

                    for (var j = 0; j < session.out_links.length; j++) {
                        if (session.out_links[j].char_id == session.in_links[i].char_id) {
                            session.out_links[j].y0 = session.in_links[i].y1;
                            session.out_links[j].x0 = session.x + session.width;
                        }
                    }
                }
            }
        });
    }

    this.draw_nodes = function(svg) {
        var margin = 2;
        var node = svg.append("g").selectAll(".node").data(sessions);

        node.enter()
        .append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + (d.x-margin) + "," + (d.y) + ")"; })
            .attr("session_id", function(d) { return d.id; })
        .call(d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", function() { this.parentNode.appendChild(this); })
            .on("drag", dragmove));

        node
        .append("rect")
            .attr("width", function(d) { return d.width+margin*2; })
            .attr("height", function(d) { return d.height; })
            .attr("class", "session")
            .attr("rx", 3)
            .attr("ry", 3)
        .append("title")
            .text(function(d) { return d.name; });

        var chart_width  = this.width;
        var chart_height = this.height;
        function dragmove (d) {
            var newy = Math.max(0, Math.min(chart_height - d.height, d3.event.y));
            var ydisp = d.y - newy;

            d3.select(this).attr("transform", "translate(" 
                         + (d.x = Math.max(0, Math.min(chart_width - d.width, d3.event.x))) + "," 
                         + (d.y = Math.max(0, Math.min(chart_height - d.height, d3.event.y))) + ")");
            reposition_node_links(d.name, d.x+margin, d.width, ydisp, svg);
        };


        var panel_width = this.panel_width;
        function reposition_node_links (name, x, width, ydisp, svg) {
            d3.selectAll("[to=\"" +  name + "\"]").each(function(d) {
                d.x1 =  x;
                d.y1 -= ydisp;
            }).attr("d", function(d) { return get_path(d, panel_width); });

            d3.selectAll("[from=\"" +  name + "\"]").each(function(d) {
                d.x0 =  x+width;
                d.y0 -= ydisp;
            }).attr("d", function(d) { return get_path(d, panel_width); });
        }
    };

    this.draw_links = function(svg) {
        var panel_width = this.panel_width;
        svg.append('g').selectAll('.link').data(links)
            .enter().append('path')
                .attr('class', 'link')
                .attr('stroke-dasharray', function(d) { return d.dash; })
                .attr('d', function(d) { return get_path(d, panel_width); })
                .attr('from', function(d) { return d.from.name; })
                .attr('to', function(d) { return d.to.name; })
                .attr('charid', function(d) { return d.char_id; })
            .style('stroke', function(d) { return d3.rgb(color(d.char_id)).darker(0.5).toString(); })
            .style('stroke-width', link_width)
            .style('stroke-linecap', 'round')
            .on('mouseover', mouseover_cb)
            .on('mouseout', mouseout_cb);

        function mouseover_cb(d) {
            d3.selectAll("[charid=\"" + char_map[d.char_id].name + "_" + d.char_id + "\"]")
                .style("stroke-opacity", "0.6");
        }
        
        function mouseout_cb(d) {
            d3.selectAll("[charid=\"" + char_map[d.char_id].name + "_" + d.char_id + "\"]")
                .style("stroke-opacity", "1");
        }
    };

    this.doDraw = function() {
        this.get_session_position_from_dot();
        this.calc_link_positions();

        var margin = this.margin;
        d3.select("#chart").html("");
        var svg = d3.select("#chart").append("svg")
            .attr('width', raw_chart_width)
            .attr('height', raw_chart_height)
            .attr('class', 'chart')
            .attr('id', 'example')
            .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        this.draw_links(svg);
        this.draw_nodes(svg);
    }
}

var storyline = null;