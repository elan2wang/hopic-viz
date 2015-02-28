

/*****************************************************************************
 *      Narrative Chart Basic Elements Definition                            *
 *****************************************************************************/

// _Link 连接会话的线条
function _Link(from, to, char_id, is_inner) {
    this.from    = from;        // [int] 起点所在会话
    this.to      = to;          // [int] 终点所在会话
    this.char_id = char_id;     // [int] 代表的角色   
    this.inner   = is_inner;    // [boolean] 是否为session内部的线条
    this.order   = -1;          // [int] 只有 inner link 才有的属性

    // position attributite
    this.x0      = 0;           // [float] 起点的X轴坐标值
    this.y0      = -1;          // [float] 起点的Y轴坐标值
    this.x1      = 0;           // [float] 终点的X轴坐标值
    this.y1      = -1;          // [float] 终点的Y轴坐标值

    // line attribute
    this.dash    = "";          // [string] 虚线设置
}

// _Character 线条所表示的角色
function _Character(id, name) {
    this.id            = id;     // [int]        角色的编号
    this.name          = name;   // [string]     角色的名称
    this.order         = 0;      // [int]        角色起点的顺序
    this.start         = null;   // [_Session]
    this.end           = null;   // [_Session]
    this.links         = [];     // [Array[_Session]]
    this.sessions      = [];     // [Array[_Session]]
}

// _Session 会话
function _Session(id, chars, start, duration) {
    this.id          = id;           // [int]         会话编号
    this.chars       = chars;        // [array[int]]  参与会话的角色编号列表
    this.start       = start;        // [int]         会话起始时间点
    this.duration    = duration;     // [int]         会话持续时间
    this.name        = "session_"+id;//               会话名称

    // position attributite
    this.x           = 0;            // [float]  determined later
    this.y           = 0;            // [float]  determined later
    this.height      = 0;            // [float]  determined later
    this.width       = 0;            // [float]

    this.in_links    = [];           // [array[_Link]]
    this.out_links   = [];           // [array[_Link]]
    this.inner_links = [];           // [array[_Link]]

    this.type        = "session";    // [string]

    // methods
    this.has_char = function(id) {
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
    var x_mid = x1 - Math.min(panel_width*10, (x1 - x0)*3.0/10.0);

    var xi = d3.interpolateNumber(x_mid, x1);
    var x2 = xi(curvature);
    var x3 = xi(1 - curvature);

    return "M" + x0 + "," + y0 + "H" + x_mid + "C" + x2 + "," + y0 + 
           " " + x3 + "," + y1 + " " + x1 + "," + y1;
}


/*****************************************************************************
 *      Storyline Defination                                                 * 
 *****************************************************************************/
function _Storyline(jsessions, jchars, raw_chart_width, raw_chart_height) {
    // data attributes 
    this.chars            = [];
    this.sessions         = [];
    this.endpoints        = [];
    this.char_map         = [];
    this.links            = [];
    this.total_panels     = 0;

    // position attributes
    this.link_gap         = 5;
    this.link_width       = 1;
    this.session_sep      = 5;
    this.text_height      = 8;
    this.longest_name     = 120;
    this.margin           = {top: 20, right: 25, bottom: 20, left: 1};
    this.chart_width      = raw_chart_width - this.margin.left - this.margin.right;
    this.chart_height     = raw_chart_height - this.margin.top - this.margin.bottom;
    this.panel_width      = Math.min((this.chart_width-this.longest_name)/this.total_panels, 2);
    this.panel_shift      = Math.round(this.longest_name/this.panel_width);

    // statistics attributes
    this.linecrossovers   = 0; 
    this.linewiggles      = 0;

    /**
     * 根据 Session 信息创建 Link (包括会话内部和会话间的所有线段)
     * 为每个 Character 创建 起点和终点会话
     */
    this.generate_links = function (chars, sessions, endpoints, links) {
        sessionCount = sessions.length;

        for (var i = 0; i < chars.length; i++) {
            for (var j = 0; j < sessions.length; j++) {
                if (sessions[j].has_char(chars[i].id)) {
                    chars[i].sessions[chars[i].sessions.length] = sessions[j];
                }
            }

            // 将会话根据起始时间进行排序
            chars[i].sessions.sort(function(a, b) { return a.start - b.start; });

            // 创建会话内部的线段
            for (var j = 0; j < chars[i].sessions.length; j++) {
                links[links.length] = new _Link(
                    chars[i].sessions[j], chars[i].sessions[j], chars[i].id, true
                );
                chars[i].sessions[j].inner_links[chars[i].sessions[j].inner_links.length] = links[links.length-1];
                chars[i].links[chars[i].links.length] = links[links.length-1];
            }

            // 创建会话之间的线段
            for (var j = 1; j < chars[i].sessions.length; j++) {
                links[links.length] = new _Link(
                    chars[i].sessions[j-1], chars[i].sessions[j], chars[i].id, false
                );
                chars[i].sessions[j-1].out_links[chars[i].sessions[j-1].out_links.length] = links[links.length-1];
                chars[i].sessions[j].in_links[chars[i].sessions[j].in_links.length] = links[links.length-1];
                chars[i].links[chars[i].links.length] = links[links.length-1];
            }

            // 为角色创建起点和终点，以及连接它们的线段
            chars[i].start = new _Session(sessionCount++, [chars[i].id], -1, 1);
            chars[i].end   = new _Session(sessionCount++, [chars[i].id], -1, 1);
            chars[i].start.type = "startpoint";
            chars[i].end.type   = "endpoint";
            endpoints[endpoints.length] = chars[i].start;
            endpoints[endpoints.length] = chars[i].end;

            links[links.length] = new _Link(chars[i].start, chars[i].sessions[0], chars[i].id, false);
            chars[i].links[chars[i].links.length] = links[links.length-1];
            chars[i].start.out_links[0] = links[links.length-1];
            chars[i].sessions[0].in_links[chars[i].sessions[0].in_links.length] = links[links.length-1];

            links[links.length] = new _Link(chars[i].sessions[chars[i].sessions.length-1], chars[i].end, chars[i].id, false);
            chars[i].links[chars[i].links.length] = links[links.length-1];
            chars[i].end.in_links[0] = links[links.length-1];
            chars[i].sessions[chars[i].sessions.length-1].out_links[chars[i].sessions[chars[i].sessions.length-1].out_links.length] = links[links.length-1];
        }
    };

    this.initialize = function() {
        /******** parse json data ******************************************************/
        for (var i = 0; i < jsessions.length; i++) {
            this.sessions[this.sessions.length] = new _Session(
                parseInt(jsessions[i]['id']),
                jsessions[i]['chars'], 
                parseInt(jsessions[i]['start']),
                parseInt(jsessions[i]['duration'])
            );
            this.total_panels += parseInt(jsessions[i]['duration']);
        }
        this.sessions.sort(function(a, b) { return a.start - b.start; });
        this.sessions[this.sessions.length-1].duration = 0;

        for (var i = 0; i < jchars.length; i++) {
            this.chars[this.chars.length] = new _Character(jchars[i].id, jchars[i].name);
            this.char_map[jchars[i].id] = this.chars[this.chars.length-1];
        }

        this.generate_links(this.chars, this.sessions, this.endpoints, this.links);
    }
}


// Longest name in pixels to make space at the beginning 
// of the chart. Can calculate but this works okay.
var color = d3.scale.category10();
var raw_chart_width  = 2000;
var raw_chart_height = 500;
var storyline = null;
var svg = null;

/**
 * Calculate positions for all sessions
 */
function calc_session_positions (storyline, jsessions) {
    // STEP 1. read position from dot graph
    var digraph = json2dot(jsessions);
    var inputgraph = Viz(digraph, format="dot", engine="dot", options=null);
    var graph = graphlibDot.read(inputgraph);
    var sessionPos = d3.map();
    var charnodePos = d3.map();
    for (var i=0; i<graph._nodeCount; i++) {
        var nodename = graph.nodes()[i];
        if (nodename.substring(0, 4) == 'char') {
            var charId = nodename.replace('character', '');
            var xy = graph.node(nodename).pos.split(',');
            x = xy[0]; y = xy[1];
            charnodePos.set(charId, xy);
        }
        else if (nodename.substring(0, 4) == 'sess') {
            var sessionId = nodename.replace('session', '');
            var xy = graph.node(nodename).pos.split(',');
            x = xy[0]; y = xy[1];
            sessionPos.set(sessionId, xy);
        } else {
            console.log("invalid node");
        }
    }

    // 步骤二. 计算会话的位置
    var index       = 0;

    storyline.sessions.sort(function(a, b) { return a.start - b.start; });
    storyline.sessions.forEach(function(session) {
        if (session.type == "session") {
            // set height & width
            session.height = Math.max(
                0,session.chars.length*storyline.link_width+(session.chars.length-1)*storyline.link_gap
            );
            // session.width = storyline.panel_width*session.duration
            session.width = storyline.panel_width;

            // set x & y
            var xy = sessionPos.get(session.id);
            session.x = storyline.panel_width*6 + storyline.panel_width*session.start + storyline.session_sep*index;
            session.y = parseFloat(xy[1]);
            index++;
        }
    });
    
    var entries = charnodePos.entries();
    entries.sort(function (a, b) {
        return a.value[1] - b.value[1];
    });

    var index = 0;
    entries.forEach(function(entry) {
        storyline.char_map[entry.key].order = (index++);
    });
}

/**
 * Calculate positions for links created by generate_links()
 * And create new links within sessions
 */
function calc_link_positions (storyline) {
    var charsessionMap = d3.map(); 
    
    // calculate positions of links which connect two sessions
    storyline.sessions.forEach(function(session) {
        calc_link_positions_of_session(storyline, session);
    });
}

function calc_link_positions_of_session (storyline, session) {
    // 1. sort in links according to their starting points' y-coordinate
    session.in_links.sort(function(a, b) { return a.y0 - b.y0; });

    // 2. calculate positions of in links and their corresponding inner & out links
    for (var i = 0; i < session.in_links.length; i++) {
        session.in_links[i].y1 = session.y + i*(storyline.link_width+storyline.link_gap) + storyline.link_width/2.0;
        session.in_links[i].x1 = session.x;

        for (var j = 0; j < session.out_links.length; j++) {
            if (session.out_links[j].char_id == session.in_links[i].char_id) {
                session.out_links[j].y0 = session.in_links[i].y1;
                session.out_links[j].x0 = session.x + session.width;
            }
        }

        for (var z = 0; z < session.inner_links.length; z++) {
            if (session.inner_links[z].char_id == session.in_links[i].char_id) {
                session.inner_links[z].y0 = session.in_links[i].y1;
                session.inner_links[z].y1 = session.in_links[i].y1;
                session.inner_links[z].x0 = session.x;
                session.inner_links[z].x1 = session.x + session.width;
            }
        }
    }

    // 3. calculate positions of inner links which have no corresponding in links
    var index = session.in_links.length;
    for (var i = 0; i < session.inner_links.length; i++) {
        if (session.inner_links[i].y0 == -1) {
            session.inner_links[i].y0 = session.y + index*(storyline.link_width+storyline.link_gap) + storyline.link_width/2.0;
            session.inner_links[i].y1 = session.inner_links[i].y0
            session.inner_links[i].x0 = session.x;
            session.inner_links[i].x1 = session.x + session.width;
            index++;
        }
    }

    // 4. calculate positions of out links which have no corresponding in links
    for (var i = 0; i < session.out_links.length; i++) {
        for (var j = 0; j < session.inner_links.length; j++) {
            if (session.out_links[i].y0 == -1 &&
                session.out_links[i].char_id == session.inner_links[j].char_id) {
                session.out_links[i].y0 = session.inner_links[j].y1;
                session.out_links[i].x0 = session.x + session.width;
            }
        }
    }

    // 5. calculate the order or inner links
    session.inner_links.sort(function (l1, l2) {
        return l1.y0 - l2.y0;
    });
    for (var i = 0; i < session.inner_links.length; i++) {
        session.inner_links[i].order = i;
    };

}

function calc_positions_of_endpoints (storyline) {
    storyline.chars.forEach(function (character) {
        character.start.x = character.start.out_links[0].x1 - storyline.panel_width*5;
        character.start.y = character.start.out_links[0].y1;
        character.width   = storyline.link_width;
        character.height  = storyline.link_width;

        character.start.out_links[0].x0 = character.start.x;
        character.start.out_links[0].y0 = character.start.out_links[0].y1;
        
        character.end.x = character.end.in_links[0].x0 + storyline.panel_width*5;
        character.end.y = character.end.in_links[0].y0;
        character.end.in_links[0].x1 = character.end.x;
        character.end.in_links[0].y1 = character.end.in_links[0].y0;
    });
}

function draw_links (svg, storyline) {
    svg.append('g').selectAll('.link').data(storyline.links)
        .enter().append('path')
            .attr('class', 'link')
            .attr('stroke-dasharray', function(d) { return d.dash; })
            .attr('d', function(d) { return get_path(d, storyline.panel_width); })
            .attr('from', function(d) { return d.from.name; })
            .attr('to', function(d) { return d.to.name; })
            .attr('charid', function(d) { return d.char_id; })
        .style('stroke', function(d) { return d3.rgb(color(d.char_id)).darker(0.5).toString(); })
        .style('stroke-width', storyline.link_width)
        .style('stroke-linecap', 'round')
        .on('mouseover', mouseover_cb)
        .on('mouseout', mouseout_cb);

    function mouseover_cb(d) {
        d3.selectAll("[charid=\"" + storyline.char_map[d.char_id].name + "_" + d.char_id + "\"]")
            .style("stroke-opacity", "0.6");
    }
    
    function mouseout_cb(d) {
        d3.selectAll("[charid=\"" + storyline.char_map[d.char_id].name + "_" + d.char_id + "\"]")
            .style("stroke-opacity", "1");
    }
}

function draw_sessions (svg, storyline) {
    svg.selectAll(".session").data(storyline.sessions).remove();
    svg.selectAll(".session").data(storyline.sessions).remove();

    var sessions = svg.append("g").selectAll(".session").data(storyline.sessions);

    sessions.enter()
    .append("g")
        .attr("class", "session")
        .attr("transform", function(d) { return "translate(" + (d.x) + "," + (d.y) + ")"; })
        .attr("session_id", function(d) { return d.id; })
    .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() { this.parentNode.appendChild(this); })
        .on("drag", dragmove)
        .on("dragend", redraw));

    sessions
    .append("rect")
        .attr("width", function(d) { return d.width+0.5; })
        .attr("height", function(d) { return d.height; })
        .attr("class", "session")
    .append("title")
        .text(function(d) { return d.name; });


    function dragmove (d) {
        var newy = Math.max(0, Math.min(storyline.chart_height - d.height, d3.event.y));
        var ydisp = d.y - newy;

        d3.select(this).attr("transform", "translate(" 
            + (d.x = Math.max(0, Math.min(storyline.chart_width - d.width, d3.event.x))) + "," 
            + (d.y = Math.max(0, Math.min(storyline.chart_height - d.height, d3.event.y))) + ")");
        reposition(d.name, d.x, d.width, ydisp, svg, storyline.panel_width);
    };

    function reposition (name, x, width, ydisp, svg, panel_width) {
        d3.selectAll("[to=\"" +  name + "\"]").each(function(d) {
            d.x1 =  x;
            d.y1 -= ydisp;
        }).attr("d", function(d) { return get_path(d, panel_width); });

        d3.selectAll("[from=\"" +  name + "\"]").each(function(d) {
            d.x0 =  x+width+0.5;
            d.y0 -= ydisp;
        }).attr("d", function(d) { return get_path(d, panel_width); });
    };
}

function clear_sessions (svg, storyline) {
    svg.selectAll(".session").data(storyline.sessions).remove();
    svg.selectAll(".session").data(storyline.sessions).remove();
}

function draw_endpoints (svg, storyline) {
    // draw starting points
    var endpoints = svg.append("g").selectAll(".node").data(storyline.endpoints);

    endpoints.enter()
    .append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + (d.x) + "," + (d.y) + ")"; })
        .attr("session_id", function(d) { return d.id; })
    .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() { this.parentNode.appendChild(this); })
        .on("drag", dragmove)
        .on("dragend", redraw));

    endpoints
    .append('circle')
        .attr('r', storyline.link_width)
        .style('fill', '#000')
    .append("title")
        .text(function(d) { return d.name; });


    function dragmove (d) {
        var newy = Math.max(0, Math.min(storyline.chart_height - d.height, d3.event.y));
        var ydisp = d.y - newy;

        d3.select(this).attr("transform", "translate(" 
            + (d.x = Math.max(0, Math.min(storyline.chart_width - d.width, d3.event.x))) + "," 
            + (d.y = Math.max(0, Math.min(storyline.chart_height - d.height, d3.event.y))) + ")");
        reposition(d.name, d.x, d.width, ydisp, svg, storyline.panel_width);
    };

    function reposition (name, x, width, ydisp, svg, panel_width) {
        d3.selectAll("[to=\"" +  name + "\"]").each(function(d) {
            d.x1 =  x;
            d.y1 -= ydisp;
        }).attr("d", function(d) { return get_path(d, panel_width); });

        d3.selectAll("[from=\"" +  name + "\"]").each(function(d) {
            d.x0 =  x+width+0.5;
            d.y0 -= ydisp;
        }).attr("d", function(d) { return get_path(d, panel_width); });
    };
}

function redraw () {
    d3.select("#chart").html("");
    svg = d3.select("#chart").append("svg")
        .attr('width', raw_chart_width)
        .attr('height', raw_chart_height)
        .attr('class', 'chart')
        .attr('id', 'example')
        .append('g')
            .attr('transform', 'translate(' + storyline.margin.left + ',' + storyline.margin.top + ')');


    /*******************************************************************************/
    calc_link_positions(storyline);
    calc_positions_of_endpoints(storyline);
    draw_links(svg, storyline);
    draw_sessions(svg, storyline);
    draw_endpoints(svg, storyline);

    // statistic
    calc_crossovers(storyline);
    calc_wiggles(storyline);
}

function draw_chart (filepath) {
    var filename   = d3.select('#inputfile')[0][0].value;
    var panelwidth = d3.select('#panelwidth')[0][0].value;
    var linkgap    = d3.select('#linkgap')[0][0].value;
    var linkwidth  = d3.select('#linkwidth')[0][0].value;
    var sessionsep = d3.select('#sessionsep')[0][0].value;

    if (filename == "") alert("please input filename");

    d3.json(filepath + filename + ".json", function(data) {
        var jsessions = data['sessions'];
        var jchars = data["characters"];

        storyline = new _Storyline(jsessions, jchars, raw_chart_width, raw_chart_height);
        if (panelwidth != "") storyline.link_width  = parseFloat(linkwidth);
        if (linkgap    != "") storyline.link_gap    = parseFloat(linkgap);
        if (panelwidth != "") storyline.panel_width = parseFloat(panelwidth);
        if (sessionsep != "") storyline.session_sep = parseFloat(sessionsep);

        storyline.initialize();

        d3.select("#chart").html("");
        svg = d3.select("#chart").append("svg")
            .attr('width', raw_chart_width)
            .attr('height', raw_chart_height)
            .attr('class', 'chart')
            .attr('id', 'example')
            .append('g')
                .attr('transform', 'translate(' + storyline.margin.left + ',' + storyline.margin.top + ')');

        calc_session_positions(storyline, jsessions);
        calc_link_positions(storyline);
        calc_positions_of_endpoints(storyline);
        draw_links(svg, storyline);
        draw_endpoints(svg, storyline);

        // statistic
        calc_crossovers(storyline);
        calc_wiggles(storyline);
    });
}