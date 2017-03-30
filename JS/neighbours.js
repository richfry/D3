d3.selectAll('#d3version').text(d3.version);
//dc.renderAll();


//Draw Map

//set up canvas
var height = document.getElementById('map').clientHeight,
    width = document.getElementById('map').clientWidth;

var projection = d3.geo.albers()
    .center([0, 52.4])
    .rotate([4.4, 0])
    .parallels([50, 60])
    .scale(22000)
    .translate([width / 2, height / 2]);


var map_canvas = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("align","center")
    .attr("top", 125)
    .attr("height", height);

lsoaNeighbours();

function lsoaNeighbours() {
    d3.json("./data/topojson/LSOA.json", function (error, lsoa) {
        if (error) throw error;
        var lsoas =  topojson.feature(lsoa, lsoa.objects.wales_low_soa_2001);
        var neighbors = topojson.neighbors(lsoa.objects.wales_low_soa_2001.geometries);
        var path = d3.geo.path().projection(projection);

//interactive neighbours

        map_canvas.append("defs").append("path")
            .attr("id", "land")
            .datum(lsoas)
            .attr("d", path);


        map_canvas.append("clipPath")
            .attr("id", "clip-land")
            .append("use")
            .attr("xlink:href", "#land");

        var district = map_canvas.append("g")
            .attr("class", "land")
            .attr("clip-path", "url(#clip-land)")
            .selectAll("path")
            .data(lsoas.features)
            .enter().append("path")
            .attr("d", path);

        district.append("title")
            .text(function(d) { return d.id; });

        district
            .each(function(d, i) { d.neighbors = d3.selectAll(neighbors[i].map(function(j) { return district[0][j]; })); })
            .on("mouseover", function(d) {
                d.neighbors.classed("neighbor", true);
                d3.selectAll("#lsoaid").text(d.properties.LSOA01CD + ' - ' + d.properties.LSOA01NM);
                var codes = [];
                d.neighbors.map(function(n){

                    n.filter(function(obj){
                        return  codes.push(obj.__data__.properties.LSOA01CD);
                    })
                });


                d3.selectAll("#lsoaneighbours").text(codes.join());
            })
            .on("mouseout", function(d) {

                d.neighbors.classed("neighbor", false);
                d3.selectAll("#lsoaneighbours").text('');
                d3.selectAll("#lsoaid").text('');
            });

        map_canvas.append("path")
            .attr("class", "border border--district")
            .datum(topojson.mesh(lsoa, lsoa.objects.wales_low_soa_2001, function(a, b) { return a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0); }))
            .attr("d", d3.geo.path().projection(projection));



// //quantile example
//     var quantile = d3.scale.quantile()
//         .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));



    });



}

