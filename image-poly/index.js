'use strict';

var utils = require('lightning-client-utils');
var inherits = require('inherits');
var d3 = require('d3');
var _ = require('lodash');
var validator = require("geojson-validation");
var L = require('leaflet');
var F = require('leaflet.freedraw-browserify');
F(L);

// code adopted from http://kempe.net/blog/2014/06/14/leaflet-pan-zoom-image.html

var ImgPoly = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts

    this.data = this._formatData(data)
    this.images = images
    this.selector = selector;

    this._init();
}

inherits(ImgPoly, require('events').EventEmitter);

ImgPoly.prototype._init = function() {

    var opts = this.opts;
    var data = this.data ? this.data : {};
    var images = this.images;
    var selector = this.selector;
    var self = this;

    this.mid = utils.getUniqueId();
    this.markup = '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css"/><div id="image-map-' + this.mid + '" class="image-map"></div>';

    var image = images[0];
    var coords = [];

    this.$el = $(selector).first();
    this.$el.append(this.markup);

    var maxWidth = this.$el.width();

    // create an image so we can get aspect ratio
    this.img = new Image();
    var img = this.img;
    img.src = utils.cleanImageURL(image);
    var COLOR_MODES;

    img.onload = function() {

        // get image dimensions
        var imw = img.width;
        var imh = img.height;

        // use image dimensions to set css
        var w = maxWidth,
            h = maxWidth * (imh / imw);

        self.$el.find('#image-map-' + self.mid).width(w).height(h);

        //create the map
        if(self.map) {
            self.map.remove();    
        }
        self.map = L.map('image-map-' + self.mid, {
            minZoom: 1,
            maxZoom: 8,
            center: [w/2, h/2],
            zoom: 1,
            attributionControl: false,
            zoomControl: false,
            crs: L.CRS.Simple,
        });
        
        var map = self.map;
             
        // calculate the edges of the image, in coordinate space
        var southWest = map.unproject([0, h], 1);
        var northEast = map.unproject([w, 0], 1);
        var bounds = new L.LatLngBounds(southWest, northEast);
         
        // add the image overlay to cover the map
        var overlay = L.imageOverlay(img.src, bounds);
        map.addLayer(overlay)
         
        // tell leaflet that the map is exactly as big as the image
        map.setMaxBounds(bounds);

        // add free drawing
        var freeDraw = new L.FreeDraw({
          mode: L.FreeDraw.MODES.CREATE | L.FreeDraw.MODES.DELETE | L.FreeDraw.MODES.DELETE,
        });

        // set free drawing options
        freeDraw.options.attemptMerge = false;
        freeDraw.options.setHullAlgorithm('brian3kb/graham_scan_js');
        freeDraw.options.setSmoothFactor(0);
        
        // add the free drawing layer
        map.addLayer(freeDraw);

        // initialize with any polygons from the data
        if (!_.isEmpty(data)) {

            var polygons = data.polygons;

            polygons = polygons.map(function (g) {
                var converted = [];
                g.map(function (p) {
                    var newp = new L.point(p[0] / (imw / w), p[1] / (imh / h), false);
                    var newpoint = map.unproject(newp, 1);
                    converted.push(newpoint);
                });
                return converted;
            });

            freeDraw.options.simplifyPolygon = false;
            polygons.forEach(function (g) {
                freeDraw.createPolygon(g, true);
            });
            freeDraw.options.simplifyPolygon = true;

            COLOR_MODES = ['white', 'bright', 'data-white'];
            var colorIndex = 2;

            getUserData()

        } else {

            COLOR_MODES = ['white', 'bright'];
            var colorIndex = 0;

        }

        d3.select(self.$el[0]).on('keydown', keydown).on('keyup', keyup);

        updateStyles();

        function updateStyles() {

            var c;
            if(COLOR_MODES[colorIndex].indexOf('white') > -1) {
                c = d3.hsl('rgb(255,255,255)');
            } else if (COLOR_MODES[colorIndex].indexOf('bright') > -1) {
                c = d3.hsl('rgb(240,30,110)');
            }

            var isData = (data.color && COLOR_MODES[colorIndex].indexOf('data') > -1);

            d3.select(self.$el[0])
               .selectAll('.image-map g path.leaflet-freedraw-polygon')
               .style('stroke', function(d, i) {
                if(isData && i < data.color.length) {
                    return data.color[i];
                }
                return c;
               })
               .style('fill', function(d, i) {
                var fill;
                if(isData && i < data.color.length) {
                    fill = d3.hsl(data.color[i]);
                } else {
                    fill = c;
                }
                return fill.brighter(1.2).toString();
               }); 

        }


        var mod = function(x, n) {
            return ((x%n)+n)%n;
        };
        function keydown() {
            if (d3.event.altKey) {
                freeDraw.setMode(L.FreeDraw.MODES.EDIT);
            }
            if (d3.event.metaKey | d3.event.shiftKey) {
                freeDraw.setMode(L.FreeDraw.MODES.VIEW);
            }
            if (d3.event.shiftKey & (d3.event.keyCode == 37 | d3.event.keyCode == 39)) {
                d3.event.preventDefault();
                if (d3.event.keyCode == 37) {
                    colorIndex = mod(colorIndex - 1, COLOR_MODES.length);
                }
                if (d3.event.keyCode == 39) {
                    colorIndex = mod(colorIndex + 1, COLOR_MODES.length);
                }
                updateStyles();
            }
        }

        function keyup() {
            freeDraw.setMode(L.FreeDraw.MODES.CREATE | L.FreeDraw.MODES.DELETE)
        }

        self.emit('image:loaded');

        function getUserData() {
            // extract coordinates from regions
            var n = freeDraw.memory.states.length;
            var coords = freeDraw.memory.states[n-1].map( function(d) {
                var points = [];
                d.forEach(function (p) {
                    var newpoint = map.project(p, 1);
                    newpoint.x *= (imw / w);
                    newpoint.y *= (imh / h);
                    points.push([newpoint.x, newpoint.y]);
                });
                return points;
            });

            utils.sendCommMessage(self, 'selection', coords);
            utils.updateSettings(self, {
                coords: coords
            }, function(err) {
                if(err) {
                    console.log('err saving user data');
                    console.log(err);
                }
            });
        }

        self.$el.unbind().click(function() {
            getUserData()
        });

        utils.getSettings(self, function(err, settings) {
            if(!err) {
                coords = settings.coords;
            }
        });
        
        freeDraw.on('markers', updateStyles);
        freeDraw.on('destroy', function(d) {

            var i = d.index;
            
            if(data.color && _.isArray(data.color)) {
                data.color.splice(i, 1);    

                if(data.color.length === 0) {
                    colorIndex = 0;
                    COLOR_MODES = ['white', 'bright'];
                }
            }

            getUserData()
            updateStyles()
        })
        
        self.map = map
        self.bounds = bounds
        self.overlay = overlay
        
    }

};

module.exports = ImgPoly;

ImgPoly.prototype._formatData = function(data) {

    if (!_.isEmpty(data)) {
        
        var polygons = []

        if (validator.isFeatureCollection(data)) {
            data.features.forEach(function(d) {
                if (validator.isFeature(d)) {
                    if (validator.isPolygon(d.geometry)) {
                        polygons.push(d.geometry.coordinates[0])
                    }
                }
            })
        } else if (data.coordinates) {
            polygons = data.coordinates
        } else {
            throw "Input data not understood"
        }

        var retColor = utils.getColorFromData(data);
        if (retColor.length == 0) {
            retColor = utils.getColors(polygons.length)
        } else if (retColor.length == 1) {
            retColor = _.range(polygons.length).map(function () { return retColor })
        }

        data.color = retColor

        data.polygons = polygons
    }
    return data
}


ImgPoly.prototype.setImage = function(image) {
    this.img.src = image;
};


ImgPoly.prototype.updateData = function(image) {
    
    var map = this.map
    var overlay = this.overlay
    var bounds = this.bounds
    var self = this

    // get the new image
    var img = new Image();
    img.src = (window.lightning && window.lightning.host) ? window.lightning.host + image : image;
    img.onload = function() {
        // replace the overlay and make sure it's behind other graphics
        map.removeLayer(overlay);
        overlay = new L.ImageOverlay(img.src, bounds).addTo(map);
        overlay.bringToBack()
        self.overlay = overlay
    }
   
};
