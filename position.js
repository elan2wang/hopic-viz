/**
 * get scene position from dot graph
 * 
 * @param  {Array} scenes      
 * @param  {Array} char_scenes
 * @param  {Float} panel_width
 * @param  {Float} panel_shift
 * 
 */
function get_scene_position_from_dot (scenes, char_scenes, panel_width, panel_shift) {
    var inputgraph = d3.select('#inputGraph')[0][0].value;

    // read position from dot graph
    var graph = graphlibDot.read(inputgraph);
    var scenePos = d3.map();
    var charScenePos = d3.map();
    for (var i=0; i<graph._nodeCount; i++) {
        var nodename = graph.nodes()[i];
        if (nodename.substring(0, 4) == 'char') {
            var charId = nodename.replace('character', '');
            var xy = graph.node(nodename).pos.split(',');
            x = xy[0]; y = xy[1];
            charScenePos.set(charId, xy);
        } else if (nodename.substring(0, 4) == 'scen') {
            var sceneId = nodename.replace('scene', '');
            var xy = graph.node(nodename).pos.split(',');
            x = xy[0]; y = xy[1];
            scenePos.set(sceneId, xy);
        } else {
            console.log("invalid node");
        }
    }

    // set position for scene 
    scenes.forEach(function(scene) {
        if (!scene.char_node) {
            // set height & width
            scene.height = Math.max(
                0,scene.chars.length*link_width+(scene.chars.length-1)*link_gap
            );
            scene.width = panel_width*4;

            // set x & y
            var xy = scenePos.get(scene.id);
            scene.x = parseFloat(xy[0]);
            scene.y = parseFloat(xy[1]);
        }

        // control character node positions
        // usually they appear right side of the chart
        char_scenes.forEach(function(scene) {
            var xy = charScenePos.get(scene.char_id);
            scene.x = parseFloat(xy[0]);
            scene.y = parseFloat(xy[1]);
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
function calc_link_positions(chars, scenes, char_scenes) {
    var charSceneMap = d3.map(); 
    char_scenes.forEach(function(scene) {
        charSceneMap.set(scene.char_id, scene);
    });

    scenes.forEach(function(scene) {
        scene.in_links.sort(function(a, b) { return charSceneMap.get(a.char_id).y - charSceneMap.get(b.char_id).y; });
        scene.out_links.sort(function(a, b) { return charSceneMap.get(a.char_id).y - charSceneMap.get(b.char_id).y; });

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