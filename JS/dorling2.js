/**
 * Created by Richard on 25/04/2017.
 */




var force = d3.layout.force()
    .charge(0)
    .gravity(0)
    .size([960, 900]);

var svg = d3.select("body").append("svg:svg")
    .attr("width", 960 + 100)
    .attr("height", 900 + 100)
    .append("svg:g")
    .attr("transform", "translate(50,50)");

d3.json("data/topojson/density.centroids.geojson", function(lsoas) {
    var color = d3.scale.linear()
        .domain([d3.min(lsoas.features, function(d){ return d.properties["Density.DEP"]}), d3.max(lsoas.features, function(d){ return d.properties["Density.DEP"]})])
        .range(["#aad", "#556"]);

    var project = d3.geo.mercator(),
        idToNode = {},
        links = [],
        nodes = lsoas.features.map(function(d) {
            var xy = project(d.geometry.coordinates);
            return idToNode[d.properties.fid] = {
                x: xy[0],
                y: xy[1],
                gravity: {x: xy[0], y: xy[1]},
                r: Math.sqrt(d.properties["Density.KM2"]),
                value: d.properties["Density.KM2"]
            };
        });

    force
        .nodes(nodes)
        .links(links)
        .start()
        .on("tick", function(e) {
            var k = e.alpha,
                kg = k * .02;
            nodes.forEach(function(a, i) {
                // Apply gravity forces.
                a.x += (a.gravity.x - a.x) * kg;
                a.y += (a.gravity.y - a.y) * kg;
                nodes.slice(i + 1).forEach(function(b) {
                    // Check for collisions.
                    var dx = a.x - b.x,
                        dy = a.y - b.y,
                        l = Math.sqrt(dx * dx + dy * dy),
                        d = a.r + b.r;
                    if (l < d) {
                        l = (l - d) / l * k;
                        dx *= l;
                        dy *= l;
                        a.x -= dx;
                        a.y -= dy;
                        b.x += dx;
                        b.y += dy;
                    }
                });
            });

            svg.selectAll("circle")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        });

    svg.selectAll("circle")
        .data(nodes)
        .enter().append("svg:circle")
        .style("fill", function(d) { return color(d.value); })
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", function(d, i) { return d.r; });
});