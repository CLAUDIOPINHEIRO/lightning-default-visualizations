var Datamaps = require('datamaps-all-browserify');
var _ = require('lodash');
var colorbrewer = require('colorbrewer')
var templateHTML = require('./map.jade');

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};

var scaleColors = function(values, n, colormap) {

    var min = d3.min(values)
    var max = d3.max(values)
    var color = colorbrewer[colormap][n]
    var zdomain = d3.range(n).map(function(d) {return d * (max - min) / (n - 1) + min})
    var z = d3.scale.linear().domain(zdomain).range(color);

    return z

}

var Map = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }
    
    this.opts = opts
   
    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;
    this.selector = selector
    this.defaultColormap = 'Purples';
    this.data = this._formatData(data)
    this._init();

};

module.exports = Map;

Map.prototype._init = function() {

    var width = this.width
    var height = this.height
    var data = this.data
    var selector = this.selector
    
    var regions = data.regions
    var values = data.values

    var self = this

    var $el = $(selector).first();
    $el.append(templateHTML());
    
    var dataObj = {}; 
    var fills = {
        defaultFill: '#ddd'
    };

    // if the data keys are of length 3, this
    // should be treated as a world map
    var isWorld = _.every(regions, function(v) {
        return v.length === 3;
    });
    
    var z = scaleColors(values, 9, data.colormap)

    _.each(regions, function(reg, i) {
        var c = z(values[i]);
        fills[c] = c;
        dataObj[reg] = {
            fillKey: c,
            value: values[i]
        };
    });

    var map = new Datamap({
        element: $el.find('#map-container')[0],
        height: height,
        scope: (isWorld) ? 'world' : 'usa',
        fills: fills,
        data: dataObj,
        geographyConfig: {        

            popupTemplate: function(geography, data) { //this function should just return a string
                //if(data) {
                //    return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong><br/>' + data.value + '</div>';
                //}
                //return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
            },
            highlightBorderColor: '#fff',
            highlightFillColor: 'rgb(150,150,150)',
        }

    });

    this.map = map
    
};

Map.prototype._formatData = function(data) {

    data.colormap = data.colormap ? data.colormap : this.defaultColormap
    return data

}

Map.prototype.updateData = function(data) {

    var self = this
    var map = this.map
    var data = self._formatData(data)
    var regions = data.regions
    var values = data.values

    var z = scaleColors(values, 9, data.colormap)

    var dataObj = {}; 
    _.each(regions, function(reg, i) {
        var c = z(values[i]);
        dataObj[reg] = c
    });
    
    map.updateChoropleth(dataObj)

}