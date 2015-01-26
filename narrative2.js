

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

    // position attributite
    this.x         = 0;            // [float]  determined later
    this.y         = 0;            // [float]  determined later
    this.height    = 0;            // [float]  determined later
    this.width     = node_width;   // [float]

    this.in_links  = [];           // [array[int]]
    this.out_links = [];           // [array[int]]

    this.char_node    = false;     // [Boolean]

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

function calc_node_positions(chars, scenes, char_scenes, panel_width, panel_shift) {
    scenes.forEach(function(scene) {
        if (!scene.char_node) {
            // set height & width
            scene.height = Math.max(
                0,scene.chars.length*link_width+(scene.chars.length-1)*link_gap
            );
            scene.width = panel_width*4;

            // set x & y
            scene.x = scene.start*panel_width;

            // here is the core part
            // how to decide the vertical shift distance of the scene
            var sum = 0;
            var den = 0;
            for (var i = 0; i < scene.chars.length; i++) {
                sum += parseInt(scene.chars[i])*30;
                den += 1;
            }

            scene.y = sum/den - scene.height/2.0;
        }

        // control character node positions
        // usually they appear right side of the chart
        char_scenes.forEach(function(scene) {
            if (scene.first_scence != null) {
                scene.x = panel_shift*panel_width - name_shift;
            }
        });
    });
}

/**
 * calculate link position
 * node positions have to be set before this is called
 * 
 * @param  {Array}
 * @param  {Array}
 * 
 */
function calc_link_positions(chars, scenes) {
    scenes.forEach(function(scene) {
        scene.in_links.sort(function(a, b) { return a.char_id - b.char_id; });
        scene.out_links.sort(function(a, b) { return a.char_id - b.char_id; });

        for (var i = 0; i < scene.out_links.length; i++) {
            scene.out_links[i].y0 = -1;
        }

        var j = 0;
        for (var i = 0; i < scene.in_links.length; i++) {
            scene.in_links[i].y1 = scene.y + i*(link_width+link_gap) + link_width/2.0;
            scene.in_links[i].x1 = scene.x + 0.5*scene.width;

            if (j < scene.out_links.length && scene.out_links[j].char_id == scene.in_links[i].char_id) {
                scene.out_links[j].y0 = scene.in_links[i].y1;
                j += 1;
            }
        }

        for (var i = 0; i < scene.out_links.length; i++) {
            if (scene.out_links[i].y0 == -1) {
                scene.out_links[i].y0 = scene.y + i*(link_width+link_gap) + link_width/2.0;
            }
            scene.out_links[i].x0 = scene.x + 0.5*scene.width;
        }
    });
}

function draw_links (links, char_map, svg) {
    var link = svg.append('g').selectAll('.link').data(links)
        .enter().append('path')
            .attr('class', 'link')
            .attr('d', function(d) { return get_path(d); })
            .attr('from', function(d) { return char_map[d.char_id].name + "_" + d.from.id; })
            .attr('to', function(d) { return char_map[d.char_id].name + "_" + d.to.id; })
            .attr('charid', function(d) { return char_map[d.char_id].name + "_" + d.char_id; })
        .style('stroke', function(d) { return d3.rgb(color(d.char_id)).darker(0.5).toString(); })
        .style('stroke-width', link_width)
        .style('stroke-linecap', 'round')
        .on('mouseover', mouseover_cb)
        .on('mouseout', mouseout_cb);

    function mouseover_cb(d) {
        d3.selectAll("[charid=\"" + char_map[d.char_id].name + "_" + d.char_id + "\"]")
            .style("stroke-opacity", "1");
    }
    
    function mouseout_cb(d) {
        d3.selectAll("[charid=\"" + char_map[d.char_id].name + "_" + d.char_id + "\"]")
            .style("stroke-opacity", "0.6");
    }
}

function draw_nodes (scenes, svg) {
    
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
            calc_node_positions(chars, scenes, char_scenes, panel_width, panel_shift);
            calc_link_positions(chars, scenes);

            // STEP 7. 
            draw_links(links, char_map, svg);
        });
    });

    
}

draw_chart('./');



