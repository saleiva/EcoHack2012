/**
 * String formatting for JavaScript.
 * 
 * Usage: 
 * 
 *   "{0} is {1}".format("CartoDB", "epic!");
 *   // CartoDB is epic!
 * 
 */
String.prototype.format = function(i, safe, arg) {
  function format() {
      var str = this, 
          len = arguments.length+1;
      
      for (i=0; i < len; arg = arguments[i++]) {
          safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
          str = str.replace(RegExp('\\{'+(i-1)+'\\}', 'g'), safe);
      }
      return str;
  }
  format.native = String.prototype.format;
  return format;
}();

var loading_timer = null;
var returning_back = false;
var w = innerWidth,
    h = innerHeight,
    w2 = w/2,
    h2 = h/2,
    z = d3.scale.category20c(),
    i = 0;


// -- settings
var settings = {
  MAIN_BALL_RADIO: 210,
  MAX_LINE_SIZE: 100,
};

// -- model
var countryData = [];
var countryDataByIso = [];
var allCountries = [];
var allCountriesByISO = {};

var c = 100;
function angleFromIdx(i) {
  return i*2*Math.PI/allCountries.length;
}

HOST = 'https://ecohack12.cartodb.com/api/v2/sql?q='

THE_ANDREW_SQL = "SELECT%20iso,%20sum(imports)%20as%20imports%20FROM%20circle_values where year='{0}' GROUP%20BY%20iso";

COUNTRY_LINKS_URL = "SELECT iso, from_iso, sum(quantity) FROM connections WHERE iso='{0}' and year = {1} GROUP BY iso, from_iso";

ALL_COUNTRIES = 'select%20iso,%20name,%20region,flights,gdp,population,sp FROM%20countries';

var svg, lines;
var tooltip;


svg = d3.select("body").append("svg:svg")
      .attr("width", w)
      .attr("height", h)
      .attr("id", 'svg')

document.getElementById('prevBtn').onclick = function() {
  year--;
  show_year(year);
  updateYear(year);
}
document.getElementById('nextBtn').onclick = function() {
  year++ ;
  show_year(year);
  updateYear(year);
}

document.getElementById('filterList').onclick = function(e) {
   order_i = parseInt(e.target.getAttribute('href').slice(1), 10);
   console.log(order_i);
   restart();
} 

function restart() {
  loading(false);

  d3.json(HOST + ALL_COUNTRIES , function(data) {
    loading(true);
    svg.selectAll("g").remove();
    lines = svg.append('svg:g')
      .attr("transform", "translate(" + w2 + "," +  h2 +" )")

    tooltip = document.getElementById('tooltip');

    var year = 2000;

    var order_by = ['region', 'gdp','sp','population','flights'];
    var order_i = 0;
    
    function updateYear(y){
      document.getElementById('prevBtn_a').style.display = (y>1975) ? 'inline' : 'none';
      document.getElementById('nextBtn_a').style.display = (y<2008) ? 'inline' : 'none';
      document.getElementById('prevBtn_a').innerHTML = (y-1).toString();
      document.getElementById('nextBtn_a').innerHTML = (y+1).toString();
      document.getElementById('big_year').innerHTML = y.toString();
    }

    
    // document.getElementById('orderBtn').onclick = function() {
    //   console.log(order_i);
    //   order_i =  order_i<order_by.length-1 ? order_i+1 : 0;
    // }

    document.getElementById('svg').style['position'] = 'absolute';
    document.getElementById('svg').style['z-index'] = 1000;

    var rows = data.rows.sort(function(a, b) {
      var f = order_by[order_i]
      return a[f] - b[f];
    });

    for(var i = 0; i < rows.length; ++i) {
          country = rows[i]
          country.idx = i;
          country.position = function(f) {
              if (f === undefined) f = 1
               return {
                    x: f*settings.MAIN_BALL_RADIO*Math.cos(angleFromIdx(this.idx)),
                    y: f*settings.MAIN_BALL_RADIO*Math.sin(angleFromIdx(this.idx))
               }
          }

          country.angle = function() {
                return angleFromIdx(this.idx);
          }

          allCountries[i] = country;
          allCountriesByISO[country.iso] = country;
    }

    window.onresize = function(event) {
      svg.attr("width", window.innerWidth);
      svg.attr("height", window.innerHeight);
      lines.attr("transform", "translate(" + window.innerWidth/2 + "," +  window.innerHeight/2 +" )");
      document.getElementById('innerCircle').style.left = window.innerWidth/2;
      document.getElementById('innerCircle').style.top = window.innerHeight/2;
    }

    show_year(year);

  });
}

restart();

function loading(o) {
  if(o) {
    clearInterval(loading_timer);
    loading_timer = null;
  }
  else {
    if (loading_timer != null) return;
    loading_timer = setInterval(function() {
      svg.append("svg:circle")
          .attr('r', 2)
          .attr('cx', w2)
          .attr('cy', h2)
          .style("fill", '#FFF')//z(++i))
          .style("fill-opacity", 0.3)
          //.attr('filter', "url(#blend)")
        .transition()
          .duration(2000)
          .ease(Math.sqrt)
          .attr('r', 100)
          .style("fill-opacity", 1e-6)
         .remove();
    }, 600);
  }
}


function show_year(year) {

  loading(false);
  removeAllLinks();
  d3.json(HOST + THE_ANDREW_SQL.format(year), function(data) {
      loading(true);
      for(var i = 0; i < data.rows.length; ++i) {
        country = data.rows[i]
        countryData[i] = {
          idx: i,
          iso: country.iso,
          value: Math.pow(parseFloat(country.imports)/126993.0, 0.17),
          links: [2, 33],
          name: "country " + i,

        }
        countryDataByIso[country.iso] = countryData[i];
      }

      start(year);
    
  });
};

function fade(opacity, ttt, t) {
   A = lines.selectAll("line.country")
       .filter(function(d) {
         return d.iso != t.iso;
       })
       .transition()
   if(returning_back) {
     A = A.delay(1000)
   }
   A.transition()
     .duration(ttt)
     .style("opacity", opacity);
}

function removeAllLinks() {
    lines.selectAll('path.link').remove()
}

function colorByRegion(r) {
    if(r == 'south') {
      return '#FFFF66';
    } 
    if (r == 'north') {
      return '#669933';
    }
    return '#0099CC';
}
function start(year) {

  lines.selectAll("line.country")
    .data(allCountries, function(d) {
      return d.iso;
    })
    .enter()
    .append("svg:line")
      .attr("class", "country")
      .attr('id', function(d) {
          return d.idx;
      })
      .attr('x1', function(d) {
          return settings.MAIN_BALL_RADIO*Math.cos(angleFromIdx(d.idx));
      })
      .attr('y1', function(d) {
          return settings.MAIN_BALL_RADIO*Math.sin(angleFromIdx(d.idx));
      })
      .attr('x2', function(d) {
          var c = countryDataByIso[d.iso];
          var v = 0;
          if (c) {
            v = c.value;
          }
          return (settings.MAIN_BALL_RADIO + v*settings.MAX_LINE_SIZE)*Math.cos(angleFromIdx(d.idx));
      })
      .attr('y2', function(d) {
          var c = countryDataByIso[d.iso];
          var v = 0;
          if (c) {
            v = c.value;
          }
          return (settings.MAIN_BALL_RADIO + v*settings.MAX_LINE_SIZE)*Math.sin(angleFromIdx(d.idx));
      })
      .attr('stroke', function(d) {
        return colorByRegion(d.region); 
      })
      .attr('stroke-width', 5)
      .on("mouseover", function(d, e) {
        tooltip.style.display = 'block';
        tooltip.style.position = 'absolute';
        tooltip.style['z-index'] = '20000';
        tooltip.innerHTML = d.name;
        tooltip.style.left = d3.event.clientX+10+'px';
        tooltip.style.top = d3.event.clientY+10+'px';
        fade(.2, 50, d);
        this.style['cursor'] = 'pointer';
      })
      .on("mouseout", function(d) {
        tooltip.style.display = 'none';
        fade(1, 500, d);
      })
      .on('click', function(sourceCountry) {
          console.log("click");
          loading(false);
          restoreCountries();
          d3.json(HOST + COUNTRY_LINKS_URL.format(sourceCountry.iso, year), function(links) { 
            links = links.rows;
            loading(true);
            var max_sum = d3.max(links, function(a) { return a.sum});
            var linksByIso = {};
            for(var i = 0; i < links.length; ++i) {
              linksByIso[links[i].from_iso] = links[i].sum;
            }

            lines.selectAll('line.country')
              .filter(function(d, i) {
                if(d.iso == sourceCountry.iso) return false;
                for(var l = 0; l < links.length; ++l) {
                  if(d.iso == links[l].from_iso) {
                    return true;
                  }
                }
                return false;
              })
              .transition()
                .attr('x2', function(d) {
                    var f = 1.0 - 0.2*(Math.sqrt(linksByIso[d.iso]/max_sum));
                    return f*(settings.MAIN_BALL_RADIO)*Math.cos(angleFromIdx(d.idx));
                })
                .attr('y2', function(d) {
                    var f = 1.0 - 0.2*(Math.sqrt(linksByIso[d.iso]/max_sum));
                    return f*(settings.MAIN_BALL_RADIO)*Math.sin(angleFromIdx(d.idx));
                })

            lines.selectAll('path.link').remove()
            lines.selectAll('path.link')
              .data(links.filter(function(d) {
                return allCountriesByISO[d.from_iso] !== undefined;
              }))
              .enter()
                .append('path')
                .attr('class', 'link')
                .attr("d", function(d) {
                  var op = sourceCountry.position()
                  var f = 1.0 - 0.2*Math.sqrt(d.sum/max_sum);
                  var tp = allCountriesByISO[d.from_iso].position(f*0.98);
                  var s = "M " + op.x + "," + op.y;
                  var e = "C 0,0 0,0 " + tp.x +"," + tp.y;
                  return s + " " + e; //'M 0,420 C 110,220 220,145 0,0'
                })
                .attr('fill', 'none')
                .attr('stroke', function(d) {
                  var t = allCountriesByISO[d.from_iso];
                  return colorByRegion(t.region); 
                })
                .attr('stroke-width', function(d) {
                  return 0.2 + 1.4*d.sum/max_sum;
                })
                .attr('opacity', function(d) {
                  return 0.3 + 0.5*d.sum/max_sum;
                });
          });


      });

      var restoreCountries = function() {
        returning_back = true;
        lines.selectAll("line.country")
          .data(allCountries)
          .transition()
            .attr('x2', function(d) {
                var c = countryDataByIso[d.iso];
                var v = 0;
                if (c) {
                  v = c.value;
                }
                return (settings.MAIN_BALL_RADIO + v*settings.MAX_LINE_SIZE)*Math.cos(angleFromIdx(d.idx));
            })
            .attr('y2', function(d) {
                var c = countryDataByIso[d.iso];
                var v = 0;
                if (c) {
                  v = c.value;
                }
                return (settings.MAIN_BALL_RADIO + v*settings.MAX_LINE_SIZE)*Math.sin(angleFromIdx(d.idx));
            })
            .each("end", function() {
              returning_back = false;
            })
      }
      restoreCountries();
    }

