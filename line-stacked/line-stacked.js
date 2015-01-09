'use strict';
var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var _ = require('lodash');
var utils = require('lightning-client-utils');
var simplify = require('simplify-js');
 
var margin = {
    top: 40,
    right: 10,
    bottom: 20,
    left: 10
};
 
var maxHeight = 600;
 
var LineStackedGraph = function(selector, data, images, opts) {
 
    opts = opts || {};
    var colors = utils.getColors(data.length);
 
 
    if(_.isArray(data[0])) {
        data = _.map(data, function(d) {
            if(_.isNumber(d[0])) {
                return _.map(d, function(datum, i) {
                    return {
                        x: i,
                        y: datum
                    };
                });
            }
            return d;
        });
    } else {
        data = [_.map(data, function(d, i) {
            if(_.isNumber(d)) {
                return {
                    x: i,
                    y: d
                };
            }
            return d;
        })];
    }
 
    var nestedExtent = function(arrays, map) {
        var max = d3.max(arrays, function(arr) {
            return d3.max(_.map(arr, map));
        });
        var min = d3.min(arrays, function(arr) {
            return d3.min(_.map(arr, map));
        });
 
        return [min, max];
    };
 
 
    var yDomain = nestedExtent(data, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(data, function(d) {
        return d.x;
    });
 
 
    var xSpread = Math.abs(xDomain[0] - xDomain[1]);
    var ySpread = Math.abs(yDomain[0] - yDomain[1]);

    var simpleData = _.map(data, function(d) {
        return simplify(d, 0.1);
    });
 
    var chartWidth = $(selector).width();
    var chartHeight = (opts.height || (chartWidth * 0.8));
 
    // do everything for the minimap
    var minimapWidth = 0.2 * chartWidth;

    chartWidth -= minimapWidth;


    var minimapLineHeight = 20;
    var minimapLinePadding = 5;
 
 
    var minimapX = d3.scale.linear()
                    .domain([xDomain[0] - xSpread * 0.05, xDomain[1] + xSpread * 0.05])
                    .range([0, minimapWidth]);
 
    var minimapY = d3.scale.linear()
                    .domain([yDomain[0] - ySpread * 0.05, yDomain[1] + ySpread * 0.05])
                    .range([minimapLineHeight, 0]);
 
    var minimapLine = d3.svg.line()
                        .x(function(d) {
                            return minimapX(d.x);
                        })
                        .y(function(d) {
                            return minimapY(d.y);
                        });
 
 
 

    var selectedLinesLength = 0; 
    var getChartData = function(dataObjArr) {

        return _.map(dataObjArr, function(dataObj, i) {

            dataObj.data =  _.map(dataObj.data, function(point) {
                var p = {
                    x: point.x
                };
 
                p.y = chartY(point.y) + i * (chartHeight / selectedLinesLength);
 
                return p;
            });

            return dataObj;
        });

    };


 
 
    var chartX = d3.scale.linear()
                    .domain([xDomain[0] - xSpread * 0.05, xDomain[1] + xSpread * 0.05])
                    .range([0, chartWidth]);
 
    var chartY = d3.scale.linear()
                    .domain([yDomain[0] - ySpread * 0.05, yDomain[1] + ySpread * 0.05]);
    
    var zoomY = d3.scale.linear();
 
    var chartLine = d3.svg.line()
                        .x(function(d) {
                            return chartX(d.x);
                        })
                        .y(function(d) {
                            return zoomY(d.y);
                        });
 
 
    var minimapDiv = d3.select(selector).append('div').attr('class', 'minimap');
 
    _.each(simpleData, function(d, i) {
 
        var minimapSvg = minimapDiv.append('div').attr('class', 'miniline-container')
            .append('svg')
            .attr('class', 'stacked-line-plot-minimap')
            .attr('width', minimapWidth)
            .attr('height', minimapLineHeight);
 
        var minimap = minimapSvg.append('g')
            .attr('class', 'minimap');
        
        minimap.append('svg:clipPath')
            .attr('id', 'minimapClip')
            .append('svg:rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', minimapWidth)
            .attr('height', (minimapLineHeight + minimapLinePadding) * data.length);
 
        var chartBody = minimap.append('g')
            .attr('clip-path', 'url(#minimapClip)');
 
        chartBody.append('path')
            .datum(d)
            .attr('class', 'line')
            .attr('d', minimapLine)
            .style('stroke', colors[i]);
 
    });
 
    $(selector).find('.miniline-container').click(function() {
        $(this).toggleClass('active');
        updateChart();
    });
 

    var panExtent = {x: [xDomain[0], xDomain[1]], y: [-Infinity,Infinity] };

    var zoom = d3.behavior.zoom()
        .x(chartX)
        .y(zoomY)
        .on('zoom', zoomed);


    var chartDiv = d3.select(selector).append('div').attr('class', 'chart').style('width', chartWidth + 'px');
 
    var chartSvg = chartDiv.append('svg')
        .attr('class', 'stacked-line-plot')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .call(zoom);
 
    var chart = chartSvg.append('g')
        .attr('class', 'chart');
 
    chart.append('svg:clipPath')
        .attr('id', 'chartClip')
        .append('svg:rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', chartHeight);
 
 
    var chartBody = chart.append('g')
        .attr('clip-path', 'url(#chartClip)');


    var updateChart = function() {
 
        var tempData = [], domainData = [];
        $('.miniline-container').each(function(i) {
            if($(this).hasClass('active')) {
                tempData.push({
                    data: data[i],
                    index: i
                });

                domainData.push(data[i]);
            }
        });

        selectedLinesLength = tempData.length;
        

        var yDomain = nestedExtent(domainData, function(d) {
            return d.y;
        });
        var ySpread = Math.abs(yDomain[0] - yDomain[1]);

        chartY.domain([yDomain[0] - ySpread * 0.05, yDomain[1] + ySpread * 0.05]).range([chartHeight / selectedLinesLength, 0]);

        tempData = getChartData(tempData);

        var lineContainer = chartBody.selectAll('.line')
                            .data(tempData, function(d) {
                                return d.index;
                            });

        lineContainer
            .enter().append('g')
            .append('path')
            .attr('class', 'line')
            .attr('d', function(d) {
                return chartLine(d.data);
            })
            .attr('index', function(d) {
                return d.index;
            })
            .style('stroke', function(d, i) {
                return colors[d.index];
            });


        lineContainer.exit().remove();

        chart.selectAll('.line')
            .transition()
            .duration(750)
            .attr('d', function(d) {
                return chartLine(d.data);
            });
    }

    function zoomed() {
        chart.selectAll('.line')
            .attr('d', function(d) {
                return chartLine(d.data);
            });
    }
};
 
module.exports = LineStackedGraph;
 
 
 
LineStackedGraph.prototype.updateData = function(data) {
    this.svg.select('.line')
        .datum(data)
        .transition()
        .attr('d', this.line);
};


