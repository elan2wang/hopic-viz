function alignment (storyline) {
    storyline.sessions.sort(function (s1, s2) {
        return s2.start - s1.start;
    });

    for (var i = 0; i < storyline.sessions.length; i++) {
        align_session(storyline, storyline.sessions[i]);
    };

    redraw();
}

function align_session (storyline, session) {
    var min_wiggles = calc_wiggles_of_session(session);  
    var origin_y    = session.y;  
    var final_y     = session.y;

    for (var i = session.in_links.length - 1; i >= 0; i--) {
        for (var j = 0; j < session.inner_links.length; j++) {
            if (session.inner_links[j].char_id == session.in_links[i].char_id) {
                session.y = session.in_links[i].y0 - session.inner_links[j].order * (storyline.link_width+storyline.link_gap) - storyline.link_width/2.0;
                calc_link_positions_of_session(storyline, session);

                var cur_wiggles = calc_wiggles_of_session(session);
                if (cur_wiggles < min_wiggles) {
                    min_wiggles = cur_wiggles;
                    final_y = session.y;
                }

                // set back
                session.y = origin_y;
                calc_link_positions_of_session(storyline, session);
            }
        };
    };
    if (final_y != origin_y) console.log("alignment");
    session.y = final_y;
}

function calc_wiggles_of_session (session) {
    var wiggles = 0;
    for (var i = session.in_links.length - 1; i >= 0; i--) {
        if (session.in_links[i].y0 != session.in_links[i].y1) wiggles++;
    };

    for (var i = session.out_links.length - 1; i >= 0; i--) {
        if (session.out_links[i].y0 != session.out_links[i].y1) wiggles++;
    };

    return wiggles;
}