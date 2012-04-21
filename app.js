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

var c = 100;
function angleFromIdx(i) {
  return i*2*Math.PI/allCountries.length;
}

HOST = 'https://ecohack12.cartodb.com/api/v2/sql?q='

THE_ANDREW_SQL = "SELECT%20iso,%20sum(imports)%20as%20imports%20FROM%20circle_values where year='{0}' GROUP%20BY%20iso";

COUNTRY_LINKS_URL = "SELECT iso, from_iso, sum(quantity) FROM connections WHERE iso='{0}' GROUP BY iso, from_iso"

ALL_COUNTRIES = 'select%20iso,%20name,%20region%20FROM%20countries'

var svg, lines;

d3.json(HOST + ALL_COUNTRIES , function(data) {
  svg = d3.select("body").append("svg:svg")
      .attr("width", w)
      .attr("height", h)
  lines = svg.append('svg:g')
    .attr("transform", "translate(" + w2 + "," +  h2 +" )")

  var year = 2000;

  function updateYear(y){

    document.getElementById('prevBtn_a').style.display = (y>1975) ? 'inline' : 'none';
    document.getElementById('nextBtn_a').style.display = (y<2008) ? 'inline' : 'none';
    document.getElementById('prevBtn_a').innerHTML = (y-1).toString();
    document.getElementById('nextBtn_a').innerHTML = (y+1).toString();
    document.getElementById('big_year').innerHTML = y.toString();
  }

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

  data.rows.sort(function(a, b) {
    return a.region < b.region;
  });
  for(var i = 0; i < data.rows.length; ++i) {
        country = data.rows[i]
        country.idx = i;
        allCountries[i] = country;
  }

  window.onresize = function(event) {
    console.log(window.innerWidth);
    lines.attr("transform", "translate(" + window.innerWidth/2 + "," +  window.innerHeight/2 +" )");
    svg.attr("width", window.innerWidth);
    svg.attr("height", window.innerHeight);
    document.getElementById('innerCircle').style.left = window.innerWidth/2;
    document.getElementById('innerCircle').style.top = window.innerHeight/2;
  }

  show_year(year);

});

function show_year(year) {
  d3.json(HOST + THE_ANDREW_SQL.format(year), function(data) {
      for(var i = 0; i < data.rows.length; ++i) {
        country = data.rows[i]
        countryData[i] = {
          idx: i,
          iso: country.iso,
          value: Math.pow(parseFloat(country.imports)/126993.0, 0.20),
          links: [2, 33],
          name: "country " + i,
          position: function() {
             return {
                  x: settings.MAIN_BALL_RADIO*Math.cos(angleFromIdx(this.idx)),
                  y: settings.MAIN_BALL_RADIO*Math.sin(angleFromIdx(this.idx))
             }
          },
          angle: function() {
              return angleFromIdx(this.idx);
          }

        }
        countryDataByIso[country.iso] = countryData[i];
      }

      start();
    
  });
};


function start() {

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
          if(d.region == 'south') {
            return '#FFFF66';
          } 
          if (d.region == 'north') {
            return '#669933';
          }
          return '#0099CC';
      })
      .attr('stroke-width', 4.2)
      .on('click', function(sourceCountry) {
          d3.json(HOST + COUNTRY_LINKS_URL.format(sourceCountry.iso), function(links) { 
            links = links.rows;

            lines.selectAll('line.country')
              .filter(function(d, i) {
                for(var l = 0; l < links.length; ++l) {
                  if(d.iso == links[l].from_iso) {
                    return true;
                  }
                }
                return false;
              })
              .transition()
                .attr('x2', function(d) {
                    return 0.9*(settings.MAIN_BALL_RADIO)*Math.cos(angleFromIdx(d.idx));
                })
                .attr('y2', function(d) {
                    return 0.9*(settings.MAIN_BALL_RADIO)*Math.sin(angleFromIdx(d.idx));
                })

            lines.selectAll('path.link').remove()
            lines.selectAll('path.link')
              .data(links)
              .enter()
              .append('path')
              .attr('class', 'link')
              .attr("d", function(d) {
                var op = sourceCountry.position()
                var tp = countryDataByIso[d.from_iso].position();
                var s = "M " + op.x + "," + op.y;
                var e = "C 0,0 0,0 " + tp.x +"," + tp.y;
                return s + " " + e; //'M 0,420 C 110,220 220,145 0,0'
              })
              .attr('fill', 'none')
              .attr('stroke', '#FFF')
              .attr('stroke-width', 1)
          });


      });

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
    }

