/**
 * Created by Richard on 29/03/2017.
 */


var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 960 - margin.left - margin.right,
    height = 900 - margin.top - margin.bottom,
    padding = 3;

var projection = d3.geo.mercator();


var force = d3.layout.force()
    .charge(0)
    .gravity(0)
    .size([width, height]);

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.json("data/topojson/density.centroids.geojson", function(error, lsoas) {
    if (error) throw error;
    var radius = d3.scale.sqrt()
        .domain([d3.min(lsoas.features, function(d){ return d.properties["Density.KM2"]}), d3.max(lsoas.features, function(d){ return d.properties["Density.KM2"]})])
        .range([0, 30]);

    var nodes = lsoas.features
        //.filter(function(d) { return !isNaN(d.properties["Density.KM2"][+d.fid]); })
        .map(function(d) {
            var point = projection(d.geometry.coordinates),
                value = d.properties["Density.KM2"];
            if (isNaN(value)) fail();
            return {
                x: point[0], y: point[1],
                x0: point[0], y0: point[1],
                r: radius(value),
                value: value
            };
        });

    force
        .nodes(nodes)
        .on("tick", tick)
        .start();

    var node = svg.selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", function(d) { return d.r; });

    function tick(e) {
        node.each(gravity(e.alpha * .1))
            .each(collide(.5))
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }

    function gravity(k) {
        return function(d) {
            d.x += (d.x0 - d.x) * k;
            d.y += (d.y0 - d.y) * k;
        };
    }

    function collide(k) {
        var q = d3.geom.quadtree(nodes);
        return function(node) {
            var nr = node.r + padding,
                nx1 = node.x - nr,
                nx2 = node.x + nr,
                ny1 = node.y - nr,
                ny2 = node.y + nr;
            q.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== node)) {
                    var x = node.x - quad.point.x,
                        y = node.y - quad.point.y,
                        l = x * x + y * y,
                        r = nr + quad.point.r;
                    if (l < r * r) {
                        l = ((l = Math.sqrt(l)) - r) / l * k;
                        node.x -= x *= l;
                        node.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }
});