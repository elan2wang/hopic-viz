function calc_crossovers (storyline) {
    var links = storyline.links;
    var crossovers = 0;
    for (var i = 0; i < links.length; i++) {
        if (links[i].inner) continue;
        for (var j = 0; j < links.length; j++) {
            if (i == j || links[i].inner) continue;

            var a = {x: links[i].x0, y: links[i].y0};
            var b = {x: links[i].x1, y: links[i].y1};
            var c = {x: links[j].x0, y: links[j].y0};
            var d = {x: links[j].x1, y: links[j].y1};
            if (is_crossover(a, b, c, d)) crossovers++;
        }
    }

    storyline.linecrossovers = crossovers;
}

function is_crossover(a, b, c, d){

    /** 1 解线性方程组, 求线段交点. **/
    // 如果分母为0 则平行或共线, 不相交
    var denominator = (b.y - a.y)*(d.x - c.x) - (a.x - b.x)*(c.y - d.y);
    if (denominator==0) {
        return false;
    }
 
    // 线段所在直线的交点坐标 (x , y)    
    var x = ( (b.x - a.x) * (d.x - c.x) * (c.y - a.y) 
                + (b.y - a.y) * (d.x - c.x) * a.x 
                - (d.y - c.y) * (b.x - a.x) * c.x ) / denominator ;
    var y = -( (b.y - a.y) * (d.y - c.y) * (c.x - a.x) 
                + (b.x - a.x) * (d.y - c.y) * a.y 
                - (d.x - c.x) * (b.y - a.y) * c.y ) / denominator;

    /** 2 判断交点是否在两条线段上 **/
    if (
        // 交点在线段1上
        (x - a.x) * (x - b.x) <= 0 && (y - a.y) * (y - b.y) <= 0
        // 且交点也在线段2上
         && (x - c.x) * (x - d.x) <= 0 && (y - c.y) * (y - d.y) <= 0
        ){

        // 返回交点p
        return {
                x :  x,
                y :  y
            }
    }
    //否则不相交
    return false
}

function calc_wiggles (storyline) {
    var links = storyline.links;
    var wiggles = 0;

    for (var i = links.length - 1; i >= 0; i--) {
        if (links[i].y0 != links[i].y1) wiggles++;
    }

    storyline.linewiggles = wiggles;
}
