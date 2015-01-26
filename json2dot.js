function json2dot(json_file) {
    var colors = ["blue", "yellow", "black", "orange", "gray", "navy",
                  "red", "cyan", "brown", "green", "pink", "violet"];

    d3.json(json_file, function(err, data) {
        /* 
         * STEP 1. parse data from json
         */
        var jscenes = data['scenes'];
        var char_scenes = d3.map();
        var sceneStr = "";
        for (var i=0; i<jscenes.length; i++) {
            var scenename = 'scene' + jscenes[i]['id'];
            sceneStr += "\"" + scenename + "\";";
            for (var j=0; j<jscenes[i]['chars'].length; j++) {
                var charname = 'character'+jscenes[i]['chars'][j];
                if (char_scenes.has(charname)) {
                    char_scenes.get(charname).push(scenename);
                } else {
                    var scenes = [scenename];
                    char_scenes.set(charname, scenes);
                }
            }
        }

        /*
         * STEP 2. output data to dot
         */
        var linkStr = "";
        var characterStr = "";
        var cindex = 0;
        char_scenes.forEach(function(key, value) {
            characterStr += "\"" + key + "\";";
            linkStr += "\t{\n";
            linkStr += "\t\tedge[color=" + colors[cindex++%12] + ", arrowhead=none];\n"
            linkStr += "\t\t\"" + key + "\" -> \"";
            
            value.forEach(function(val, index, array){
                if (index == 0)
                    linkStr += val + "\";\n";
                else
                    linkStr += "\t\t\"" + array[index-1] + "\" -> \"" + val + "\";\n";
            });
            
            linkStr += "\t}\n\n";
        });

        var dotStr = "";
        dotStr += "digraph storyline {\n";
        dotStr += "\trankdir=\"LR\";\n";
        dotStr += "\tranksep=0.2;\n";
        dotStr += "\tnodesep=0.1;\n\n";
        
        dotStr += "\t{\n";
        dotStr += "\t\trank=same;\n";
        dotStr += "\t\tnode[shape=point,fontsize=11];\n";
        dotStr += "\t\t" + characterStr + "\n";
        dotStr += "\t}\n\n";

        dotStr += "\t{\n";
        dotStr += "\t\tnode[shape=plaintext,fontsize=11,height=0.2,width=0.5];\n";
        dotStr += "\t\t" + sceneStr + "\n";
        dotStr += "\t}\n\n";

        dotStr += linkStr;
        dotStr += "}";

        console.log(dotStr);
    });
}

json2dot("./narrative.json");