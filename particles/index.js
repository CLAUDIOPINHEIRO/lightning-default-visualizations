var THREE = require('three.js');
var _ = require('lodash');
require('three-fly-controls')(THREE);


var Particles = function(selector, data, images, opts) {

    var width = $(selector).width();
    var height = width * 0.7;


    var container, stats;
    var controls;
    var camera, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, size;
    var mouseX = 0, mouseY = 0;

    var halfWidth = width / 2;
    var halfHeight = height / 2;

    var zScaleFactor = 5;

    var self = this;

    function init() {


        camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 3000 );
        
        // camera.position.x = 500;
//        camera.position.z = 2800;

        scene = new THREE.Scene();
        geometry = new THREE.Geometry();
        

        var avgs = [0, 0, 0];

        _.each(data.points, function(p) {
            avgs[0] += p[1];
            avgs[1] += p[2] * zScaleFactor;
            avgs[2] += p[0];
        });

        avgs = _.map(avgs, function(n) { return n / data.points.length; });


        var colors = [];

        _.each(data.points, function(p, i) {
            var vertex = new THREE.Vector3();
            vertex.x = p[1] - avgs[0];
            vertex.y = (p[2] * (zScaleFactor + (Math.random() - 0.5))) - avgs[1];
            vertex.z = p[0] - avgs[2];
            geometry.vertices.push( vertex );
            colors[i] = new THREE.Color();
            colors[i].setRGB(data.colors[i][0], data.colors[i][1], data.colors[i][2]);
        });


        THREE.ImageUtils.crossOrigin = '';
        var sprite = THREE.ImageUtils.loadTexture( "http://i.gif.fm/janelia-images/textures/particle.png" );

        geometry.colors = colors;
        
        camera.position.y = 0;
        camera.position.x = -1500;
        camera.position.z = 0;
        
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        var material = new THREE.PointCloudMaterial({ 
            size: 30,
            map: sprite,
            transparent: true,
            blending: THREE.AdditiveBlending,
            vertexColors: THREE.VertexColors,
            opacity : 0.75 
        });
        
        particles = new THREE.PointCloud( geometry, material );
        scene.add( particles );

        renderer = new THREE.WebGLRenderer();        
        renderer.setSize( width, height );
        $(selector)[0].appendChild( renderer.domElement );

        self.scene = scene;
        self.parameters = parameters;
        controls = new THREE.FlyControls(camera, $(selector)[0]);


    }

    function animate() {
        requestAnimationFrame( animate );
        render();
    }

    function render() {
        controls.update();
        renderer.render( scene, camera );
    }
 

    init();
    animate();

};






Particles.prototype.updateData = function(data) {


    var self = this;
    var geometry = new THREE.Geometry();
    
    console.log('updating data')

    _.each(data, function() {
        var vertex = new THREE.Vector3();
        vertex.x = Math.random() * 2000 - 1000;
        vertex.y = Math.random() * 2000 - 1000;
        vertex.z = Math.random() * 2000 - 1000;

        geometry.vertices.push( vertex );


    });

    var materials = []
    for (var i = 0; i < self.parameters.length; i ++ ) {

        var color = self.parameters[i][0];
        var size  = self.parameters[i][1];

        materials[i] = new THREE.PointCloudMaterial( { size: size } );

        var particles = new THREE.PointCloud( geometry, materials[i] );


        self.scene.add( particles );

    }
};


module.exports = Particles;


