function json2dot(jsessions) {
    var colors = ["blue", "yellow", "black", "orange", "gray", "navy",
                  "red", "cyan", "brown", "green", "pink", "violet"];


    /* 
     * STEP 1. parse data from json
     */
    var char_sessions = d3.map();
    var sessionStr = "";
    for (var i=0; i<jsessions.length; i++) {
        var sessionname = 'session' + jsessions[i]['id'];
        sessionStr += "\"" + sessionname + "\";";
        for (var j=0; j<jsessions[i]['chars'].length; j++) {
            var charname = 'character'+jsessions[i]['chars'][j];
            if (char_sessions.has(charname)) {
                char_sessions.get(charname).push(sessionname);
            } else {
                var sessions = [sessionname];
                char_sessions.set(charname, sessions);
            }
        }
    }

    /*
     * STEP 2. output data to dot
     */
    var linkStr = "";
    var characterStr = "";
    var cindex = 0;
    char_sessions.forEach(function(key, value) {
        characterStr += "\"" + key + "\";";
        linkStr += "\t{\n";
        linkStr += "\t\tedge[color=" + colors[cindex++%12] + "];\n"
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
    dotStr += "\t\tnode[shape=box,fontsize=11,height=0.2,width=0.5];\n";
    dotStr += "\t\t" + sessionStr + "\n";
    dotStr += "\t}\n\n";

    dotStr += linkStr;
    dotStr += "}";

    return dotStr;
}