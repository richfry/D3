/**
 * Created by Richard on 26/04/2017.
 */

//var q = d3.queue();


var dataset = {};
d3.csv("data/csv/final_data_density.csv", function (data) {
    dataset = data.map(function (d) {
        return {
            LSOA: d["LSOA"],
            CHALden: +d["CHALICE.Density"],
            CHALPWC :+d["CHALICE.Density.PWC"],
            KM2 : +d["Density.KM2"],
            Pop1000 : +d["Outlets.1000"],
            KDE : +d.KDE,
            WIMD : +d.WIMD_Quintile
        };
    });
});

var width = Math.round((window.innerWidth - 100) / 3, 0),
    height = Math.round((window.innerHeight - 100) /2,0) - 50;




var projection = d3.geo.albers()
    .center([0, 52.4])
    .rotate([4.4, 0])
    .parallels([50, 60])
    .scale(7500)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var force = d3.layout.force()
    .size([width, height]);

draw_map("#panel1");
draw_cartograms("CHALden", "#panel2");
draw_cartograms("CHALPWC", "#panel3");
draw_cartograms("KDE", "#panel4");
draw_cartograms("KM2", "#panel5");
draw_cartograms("Pop1000", "#panel6");



function draw_cartograms(variable, panel){

    var isDorling = false;



    var projection = d3.geo.albers()
        .center([0, 52.4])
        .rotate([4.4, 0])
        .parallels([50, 60])
        .scale(7500)
        .translate([width / 2, height / 2]);

    var path = d3.geo.path()
        .projection(projection);

    var force = d3.layout.force()
        .size([width, height]);

    //var svg = d3.select(panel).append("svg")
    var canvas = d3.select(panel).append("canvas")
        .attr("width", width)
        .attr("fill", "black")
        .attr("height", height)
        .node().getContext('2d');

    //var svg = canvas;

    /*svg.append("path")
        .datum({type: "Sphere"})
        .attr("class", "background")
        .attr("d", path);*/

    d3.json("data/topojson/LSOA.json", function(error, lsoas) {
        //var neighbors = topojson.neighbors(lsoas.objects.wales_low_soa_2001.geometries);

        var land = {
            type: "GeometryCollection",
            geometries: polygons(lsoas.objects.wales_low_soa_2001.geometries)
        };

        var neighbors = topojson.neighbors(land.geometries);

        var nodes = topojson.feature(lsoas, land).features.map(function(d,e) {
            //exterior(d.geometry);
            var centroid = path.centroid(d.geometry);
            return {
                x: centroid[0],
                y: centroid[1],
                ox: centroid[0],
                oy: centroid[1],
                geometry: d.geometry,
                dorling: dorling(d.geometry, Math.round(d.properties.radius, 2) * 3),
                wimd: d.properties.wimd
            };
        });

        var links = d3.merge(neighbors.map(function(neighbors, i) {
            var source = nodes[i];
            return neighbors.map(function(target) {
                target = nodes[target];
                return {source: source, target: target, distance: source.dorling.radius + target.dorling.radius};
            });
        }));

        map_canvas_draw(canvas, nodes);

        /*var node = svg.selectAll("g")
            .data(nodes)
            .enter().insert("g", ".graticule")
            .attr("transform", function(d) { return "translate(" + -d.x + "," + -d.y + ")"; })
            .append("path")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .attr("d", function(d) { return path(d.geometry); })
            .style("fill", function(d, i) {
                if(d.wimd == 1 || d.wimd == 2){
                    return '#336699'
                } else if( d.wimd == 4 || d.wimd == 5){
                    return '#003399'
                } else {
                    return '#ffffff'
                }
            })
            .attr("stroke-width", 0.5)
            .attr("stroke", function(d) {if(d.wimd ==3){ return "grey"} });*/

        force.on("tick", function(e) {
            var q = d3.geom.quadtree(nodes),
                i = 0,
                n = nodes.length;

            var k = .5 * e.alpha;
            nodes.forEach(function(o, i) {
                o.y -= k * (o.y - o.oy);
                o.x -= k * (o.x - o.ox);
            });
            while (++i < n) {
                q.visit(collide(nodes[i]));
            }

            /*node.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });*/
        });

        setTimeout(function() {
            force
                .gravity(0)
                .charge(0.05)
                .nodes(nodes)
                .links(links)
                .linkDistance(function(d) { return d.distance; })
                .start();


            step();

            function step() {
                map_canvas_draw(canvas, nodes);
                /*isDorling = !isDorling;
                node.transition()
                    .duration(50)
                    .attr("d", isDorling
                        ? function(d) { return "M" + d.dorling.coordinates.join("L") + "Z"; }
                        : function(d) { return path(d.geometry); })
                    .each("end", function(d) {
                        d = d.dorling;
                        d3.select(this).attr("d", pathCircle(d.centroid[0], d.centroid[1], d.radius));
                    });*/
            }
        }, 1);
    });

    function exterior(d) {
        switch (d.type) {
            case "Polygon": d.coordinates = [d.coordinates[0]]; break;
            case "MultiPolygon": d.coordinates = [[d.coordinates[0][0]]]; break;
        }
        return d;
    }

    function projectRing(coordinates) {
        var ring = [];
        d3.geo.stream({type: "Polygon", coordinates: [coordinates]}, projection.stream({
            point: function(x, y) { ring.push([x, y]); },
            lineStart: noop,
            lineEnd: noop,
            polygonStart: noop,
            polygonEnd: noop,
            sphere: noop
        }));
        ring.push(ring[0]);
        return ring;
    }

    function dorling(d, density, wimd) {
        switch (d.type) {
            case "Polygon": return circle(projectRing(d.coordinates[0]), density, wimd);
            case "MultiPolygon": return circle(projectRing(d.coordinates[0][0]), density, wimd);
        }

        return {rad: density, coordinates: [], wimd: wimd};
    }

// From Mike Bostock’s http://bl.ocks.org/3081153
    function circle(coordinates, rad) {
        var circle = [],
            length = 0,
            lengths = [length],
            polygon = d3.geom.polygon(coordinates),
            p0 = coordinates[0],
            p1,
            x,
            y,
            i = 0,
            n = coordinates.length - 1;

        // Compute the distances of each coordinate.
        while (++i < n) {
            p1 = coordinates[i];
            x = p1[0] - p0[0];
            y = p1[1] - p0[1];
            lengths.push(length += Math.sqrt(x * x + y * y));
            p0 = p1;
        }

        var area = polygon.area(),
            radius = Math.sqrt(Math.abs(rad) / Math.PI),
            centroid = polygon.centroid(-1 / (6 * area)),
            angleOffset = Math.atan2(coordinates[0][1] - centroid[1], coordinates[0][0] - centroid[0]),
            angle,
            i = -1,
            k = 2 * Math.PI / length;

        // Compute points along the circle’s circumference at equivalent distances.
        while (++i < n) {
            angle = angleOffset + lengths[i] * k;
            circle.push([
                centroid[0] + radius * Math.cos(angle),
                centroid[1] + radius * Math.sin(angle)
            ]);
        }

        return {coordinates: circle, radius: radius, centroid: centroid};
    }

    function polygons(geometries) {
        var id = 0;
        return d3.merge(geometries.map(function(geometry) {
            return (geometry.type === "MultiPolygon" ? geometry.arcs : [geometry.arcs]).map(function(d) {
                var props = search(geometry.properties.LSOA01CD, variable);

                return {id: ++id, type: "Polygon", arcs: d, parent: geometry, properties: {radius: props[0], wimd: props[1]}};
            });
        }));
    }

    function search(nameKey, density){
        for (var i=0; i < dataset.length; i++) {
            if (dataset[i].LSOA === nameKey) {
                return [dataset[i][density], dataset[i].WIMD];
            }
        }
    }

// From http://mbostock.github.com/d3/talk/20111018/collision.html
    function collide(node) {
        var r = node.dorling.radius,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== node)) {
                var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = node.dorling.radius + quad.point.dorling.radius;
                if (l < r) {
                    l = (l - r) / l * .5;
                    node.x -= x *= l;
                    node.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2
                || x2 < nx1
                || y1 > ny2
                || y2 < ny1;
        };
    }

    function noop() {}

    function pathCircle(x, y, radius) {
        return "M" + x + "," + (y + radius)
            + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius
            + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius
            + "z";
    };

};

var x =  d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

var y = d3.scale.linear()
        .domain([0, height])
        .range([height, 0]);


map_canvas_draw = function(canvas, nodes) {
        canvas.clearRect(0, 0, width, height);
        canvas.beginPath();
        var i = 0, cx, cy;
        while (++i < nodes.length) {
            d = nodes[i];
            cx = x(d.x);
            cy = y(d.y);
            canvas.moveTo(cx, cy);
            canvas.arc(cx, cy, d.r, 0, 2 * Math.PI);
        }
        canvas.fill();
    };



function draw_map(panel) {

    var width = Math.round((window.innerWidth - 100) / 3, 0),
        height = Math.round((window.innerHeight - 100) / 2, 0);

    var projection = d3.geo.albers()
        .center([0, 52.4])
        .rotate([4.4, 0])
        .parallels([50, 60])
        .scale(10000)
        .translate([width / 2, height / 2]);

    var path = d3.geo.path()
        .projection(projection);

    var force = d3.layout.force()
        .size([width, height]);


    var svg = d3.select(panel).append("svg")
        .attr("width", width)
        .attr("fill", "white")
        .attr("height", height + 50);

    svg.append("path")
        .datum({type: "Sphere"})
        .attr("class", "background")
        .attr("d", path);

    d3.json("data/topojson/LSOA.json", function (error, lsoas) {
        //var neighbors = topojson.neighbors(lsoas.objects.wales_low_soa_2001.geometries);

        var land = {
            type: "GeometryCollection",
            geometries: polygons(lsoas.objects.wales_low_soa_2001.geometries)
        };

        var neighbors = topojson.neighbors(land.geometries);

        var nodes = topojson.feature(lsoas, land).features.map(function (d, e) {
            //exterior(d.geometry);
            var centroid = path.centroid(d.geometry);
            return {
                x: centroid[0],
                y: centroid[1],
                ox: centroid[0],
                oy: centroid[1],
                geometry: d.geometry,
                //dorling: dorling(d.geometry, d.properties.radius * 2),
                wimd: d.properties.wimd
            };
        });

        /*var links = d3.merge(neighbors.map(function (neighbors, i) {
         var source = nodes[i];
         return neighbors.map(function (target) {
         target = nodes[target];
         return {source: source, target: target, distance: source.dorling.radius + target.dorling.radius};
         });
         }));*/

        var node = svg.selectAll("g")
            .data(nodes)
            .enter().insert("g", ".graticule")
            .attr("transform", function (d) {
                return "translate(" + -d.x + "," + -d.y + ")";
            })
            .append("path")
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .attr("d", function (d) {
                return path(d.geometry);
            })
            .style("fill", function (d, i) {
                if (d.wimd == 1 || d.wimd == 2) {
                    return '#336699'
                } else if (d.wimd == 4 || d.wimd == 5) {
                    return '#003399'
                } else {
                    return '#ffffff'
                }
            })
            .attr("stroke-width", 0.5)
            .attr("stroke", "gray");


    });
    function polygons(geometries) {
        var id = 0;
        return d3.merge(geometries.map(function(geometry) {
            return (geometry.type === "MultiPolygon" ? geometry.arcs : [geometry.arcs]).map(function(d) {
                var props = search(geometry.properties.LSOA01CD);

                return {id: ++id, type: "Polygon", arcs: d, parent: geometry, properties: {wimd: props[0]}};
            });
        }));
    }

    function search(nameKey){
        for (var i=0; i < dataset.length; i++) {
            if (dataset[i].LSOA === nameKey) {
                return [ dataset[i].WIMD];
            }
        }
    }
};