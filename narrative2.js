

/*****************************************************************************
 *      Narrative Chart Basic Elements Definition                            *
 *****************************************************************************/

// _Link 连接场景的线条
function _Link(from, to, char_id) {
    this.from    = from;        // [int] 起点所在场景
    this.to      = to;          // [int] 终点所在场景
    this.char_id = char_id;     // [int] 代表的角色   

    // position attributite
    this.x0      = 0;           // [float] 起点的X轴坐标值
    this.y0      = -1;          // [float] 起点的Y轴坐标值
    this.x1      = 0;           // [float] 终点的X轴坐标值
    this.y1      = -1;          // [float] 终点的Y轴坐标值
}

// _Character 线条所表示的角色
function _Character(id, name) {
    this.id           = id;     // [int]        角色的编号
    this.name         = name;   // [string]     角色的名称
    this.first_scence = null;   // [_SceneNode] 该角色出现的第一个场景
}

// global variable 
var node_width = 10;

// _SceneNode 角色相汇的结点
function _SceneNode(id, chars, start, duration) {
    this.id        = id;           // [int]
    this.chars     = chars;        // [array[int]]
    this.start     = start;        // [int]
    this.duration  = duration;     // [int]
    this.name      = "scene_"+id;

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
function get_path (link) {
    console.log(link);
    var x0 = link.x0;
    var y0 = link.y0;
    var x1 = link.x1;
    var y1 = link.y1;

    var xi = d3.interpolateNumber(x0, x1);
    var x2 = xi(curvature);
    var x3 = xi(1 - curvature);

    return "M" + x0 + "," + y0 + "C" + x2 + "," + y0 + 
           " " + x3 + "," + y1 + " " + x1 + "," + y1;
}


/*****************************************************************************
 *      Initialization Methods                                               * 
 *****************************************************************************/

/**
 * generate links from scenes, set in/out links of character
 * 
 * @param  {Array}    Array of _Character objects
 * @param  {Array}    Array of _SceneNode objects
 * @return {Array}    Array of _Link objects
 */
function generate_links (chars, scenes) {
    var links = [];
    for (var i = 0; i < chars.length; i++) {
        var char_scenes = [];
        for (var j = 0; j < scenes.length; j++) {
            if (scenes[j].has_char(chars[i].id)) {
                char_scenes[char_scenes.length] = scenes[j];
            }
        }

        char_scenes.sort(function(a, b) { return a.start - b.start; });
        chars[i].first_scence = char_scenes[0];

        for (var j = 1; j < char_scenes.length; j++) {
            links[links.length] = new _Link(
                char_scenes[j-1], char_scenes[j], chars[i].id
            );

            char_scenes[j-1].out_links[char_scenes[j-1].out_links.length] = links[links.length-1];
            char_scenes[j].in_links[char_scenes[j].in_links.length] = links[links.length-1];
        }
    }
    return links;
}

// height of text
var text_height = 8;
// width of link
var link_width = 1.8;

/**
 * the chars, scenes and links have to be set before this is called
 * 
 * add beginning scene for each character
 * this will result in adding new elements to scenes and links
 *
 * @param {Array} Array of _Character
 * @param {Array} Array of _SceneNode
 * @param {Array} Array of _Link
 *
 * @return {Array}  Array of newly added _SceneNode
 */
function add_char_scenes (chars, scenes, links) {
    var char_scenes = [];

    for(var i = 0; i < chars.length; i++) {
        var s = new _SceneNode(null, [chars[i].id], [0], [1]);
        s.char_node = true;
        s.x = 0;
        s.y = i*text_height;
        s.width = 5;
        s.height = link_width;
        s.chars[s.chars.length] = chars[i].id;
        s.id = scenes.length;
        s.name = "scene_" + s.id;
        s.char_id = chars[i].id;

        if (chars[i].first_scence != null) {
            var link = new _Link(s, chars[i].first_scence, chars[i].id);

            s.out_links[s.out_links.length] = link;
            chars[i].first_scence.in_links[chars[i].first_scence.in_links.length] = link;
            links[links.length] = link;
            chars[i].first_scence = s;

            scenes[scenes.length] = s;
            char_scenes[char_scenes.length] = s;
        }
    }
    return char_scenes;
}

// distance between two links
var link_gap = 2;

// The character's name appears before its first
// scene's x value by this many pixels
var name_shift = 10

function draw_links (links, char_map, svg) {
    var link = svg.append('g').selectAll('.link').data(links)
        .enter().append('path')
            .attr('class', 'link')
            .attr('d', function(d) { return get_path(d); })
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
}

function draw_nodes(scenes, svg, chart_width, chart_height) {
    var margin = 2;
    var node = svg.append("g").selectAll(".node").data(scenes);

    node.enter()
    .append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + (d.x-margin) + "," + (d.y) + ")"; })
        .attr("scene_id", function(d) { return d.id; })
    .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() { this.parentNode.appendChild(this); })
        .on("drag", dragmove));

    node
    .append("rect")
        .attr("width", function(d) { return d.width+margin*2; })
        .attr("height", function(d) { return d.height; })
        .attr("class", "scene")
        .attr("rx", 3)
        .attr("ry", 3)
    .append("title")
        .text(function(d) { return d.name; });

    function dragmove (d) {
        var newy = Math.max(0, Math.min(chart_height - d.height, d3.event.y));
        var ydisp = d.y - newy;

        d3.select(this).attr("transform", "translate(" 
                     + (d.x = Math.max(0, Math.min(chart_width - d.width, d3.event.x))) + "," 
                     + (d.y = Math.max(0, Math.min(chart_height - d.height, d3.event.y))) + ")");
        reposition_node_links(d.name, d.x+margin, d.width, ydisp, svg);
    }
}

// Longest name in pixels to make space at the beginning 
// of the chart. Can calculate but this works okay.
var longest_name = 115;

var color = d3.scale.category10();
var raw_chart_width = 1000;

function draw_chart (file_path) {
    d3.json(file_path + "narrative.json", function(data) {
        // STEP 1. load scenes from JSON file
        var scenes = [];
        var total_panels = 0;

        var jscenes = data['scenes'];
        for (var i = 0; i < jscenes.length; i++) {
            scenes[scenes.length] = new _SceneNode(
                parseInt(jscenes[i]['id']),
                jscenes[i]['chars'], 
                parseInt(jscenes[i]['start']),
                parseInt(jscenes[i]['duration'])
            );
            total_panels += parseInt(jscenes[i]['duration']);
        }
        scenes.sort(function(a, b) { return a.start - b.start; });
        total_panels -= scenes[scenes.length-1].duration;
        scenes[scenes.length-1].duration = 0;

        // STEP 2. 
        var margin = {top: 20, right: 25, bottom: 20, left: 1};
        var width = raw_chart_width - margin.left - margin.right;
        var scene_width = (width - longest_name)/(scenes.length+1);
        var panel_width = Math.min((width-longest_name)/total_panels, 15);
        var panel_shift = Math.round(longest_name/panel_width);

        // TRAP INTO XML
        d3.xml(file_path + "characters.xml", function(x) {
            // STEP 3. load characters from XML file
            var chars = [];
            var char_map = [];
            var xchars = read_chars(x);

            for (var i = 0; i < xchars.length; i++) {
                chars[chars.length] = new _Character(xchars[i].id, xchars[i].name);
                char_map[xchars[i].id] = chars[chars.length-1];
            }

            // STEP 4. 
            var raw_chart_height = 360;
            var height = raw_chart_height - margin.top - margin.bottom;

            var svg = d3.select("#chart").append("svg")
                .attr('width', raw_chart_width)
                .attr('height', raw_chart_height)
                .attr('class', 'chart')
                .attr('id', 'example')
                .append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // STEP 5.
            var links = generate_links(chars, scenes);
            var char_scenes = add_char_scenes(chars, scenes, links);

            // STEP 6.
            get_scene_position_from_dot(scenes, char_scenes, panel_width, panel_shift);
            calc_link_positions(chars, scenes, char_scenes);

            // STEP 7. 
            draw_links(links, char_map, svg);
            draw_nodes(scenes, svg, width, height);
        });
    });   
}


