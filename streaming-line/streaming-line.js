'use strict';
var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils');
var LineGraph = require('../viz/line');
var inherits = require('inherits');


var margin = {
    top: 30,
    right: 20,
    bottom: 20,
    left: 45
};

var nestedExtent = function(arrays, map) {
    var max = d3.max(arrays, function(arr) {
        return d3.max(_.map(arr, map));
    });
    var min = d3.min(arrays, function(arr) {
        return d3.min(_.map(arr, map));
    });

    return [min, max];
};


var StreamingLine = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts;

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data);
    this.selector = selector;
    this._init();
};


StreamingLine.prototype.appendData = function(data) {

    var newData = this._formatData(data);

    var self = this;

    _.each(newData, function(d, i) {
        if(self.data.length < i) {
            self.data[i].concat(d);
        }
    });
    
    data = this.data;

    var yDomain = nestedExtent(data, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(data, function(d) {
        return d.x;
    });
    
    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;
    var xSpread = Math.abs(xDomain[1] - xDomain[0]) || 1;

    this.x.domain([xDomain[0] - 0.05 * xSpread, xDomain[1] - 1 + 0.05 * xSpread]);
    this.y.domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread]);

    this.updateAxis();

    this.svg.selectAll('.line')
        .data(data)
        .transition()
        .attr('d', this.line);
};


inherits(StreamingLine, LineGraph);
