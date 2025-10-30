var NumVertices = 36; //(6 faces)(2 triangles/face)(3 vertices/triangle)

var movement = false;
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var zDist = -25.0;

var points = [];
var colors = [];

var board_height = 20;
var board_width = 6;
var board_depth = 6;
var board_array = [];

var vertices = [
    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5, -0.5, -0.5, 1.0 )
];

var color_table = [
    vec4(1.0, 0.0, 0.0, 1.0), // red
    vec4(0.0, 1.0, 0.0, 1.0), // green
    vec4(0.0, 0.0, 1.0, 1.0), // blue
    vec4(1.0, 1.0, 0.0, 1.0) // yellow
]

// Shader transformation matrices

var modelViewMatrix, projectionMatrix;

var angle = 0;

var modelViewMatrixLoc;
var uColorLoc;

var vBuffer, cBuffer;

function init_board_array() {
    for (var i = 0; i < board_height; i++ ) {
        var layer_array = [];

        for (var j = 0; j < board_depth; j++) {
            row_array = [];

            for (var k = 0; k < board_width; k++) {
                row_array.push(0);
            }

            layer_array.push(row_array);
        }

        board_array.push(layer_array);
    }
}

//----------------------------------------------------------------------------

function quad(  a,  b,  c,  d ) { 
    points.push(vertices[a]);  
    points.push(vertices[b]);  
    points.push(vertices[c]); 
    points.push(vertices[a]);  
    points.push(vertices[c]);  
    points.push(vertices[d]); 
}


function colorCube() {
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

//____________________________________________

// Remmove when scale in MV.js supports scale matrices

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}


//--------------------------------------------------


window.onload = function init() {
    // game init
    init_board_array();

    // webGL init
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable( gl.DEPTH_TEST ); 
    
    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    
    gl.useProgram( program );

    colorCube();
    
    // Load shaders and use the resulting shader program
    
    program = initShaders( gl, "vertex-shader", "fragment-shader" );    
    gl.useProgram( program );

    // Create and initialize  buffer objects
    
    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    projectionMatrix = perspective( 60.0, 1.0, 0.1, 100.0 );
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrix) );

    uColorLoc = gl.getUniformLocation(program, "uColor");

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.clientX;
        origY = e.clientY;
        e.preventDefault();         // Disable drag and drop
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	    spinY = ( spinY + (e.clientX - origX) ) % 360;
            spinX = ( spinX + (origY - e.clientY) ) % 360;
            origX = e.clientX;
            origY = e.clientY;
        }
    } );
    
    // Event listener for keyboard
     window.addEventListener("keydown", function(e){
         switch( e.keyCode ) {
            case 38:	// upp ör
                zDist += 1.0;
                break;
            case 40:	// niður ör
                zDist -= 1.0;
                break;
         }
     }  );  

    // Event listener for mousewheel
     window.addEventListener("mousewheel", function(e){
         if( e.wheelDelta > 0.0 ) {
             zDist += 1.0;
         } else {
             zDist -= 1.0;
         }
     }  );  
       
  
    render();
}



function render_background() {
    var s = scalem(-board_width, -board_height, -board_depth);
    var instanceMatrix = mult( translate( 0.0, 0.0, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
    gl.uniform4fv(uColorLoc, flatten(vec4(0.2, 0.2, 0.2, 1.0)));
    gl.drawArrays( gl.TRIANGLES, 0, NumVertices );
}

function render_block(position, color) {
    var instanceMatrix = translate( 
        position[0] - (board_width - 1) / 2,
        position[1] - (board_height - 1) / 2, 
        position[2] - (board_depth - 1) / 2
    );
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
    gl.uniform4fv(uColorLoc, flatten(color));
    gl.drawArrays( gl.TRIANGLES, 0, NumVertices );
}

function render_board() {
    render_background();
    for (var x = 0; x < board_width; x++ ) {
        for (var y = 0; y < board_height; y++) {
            for (var z = 0; z < board_depth; z++) {
                var value = get_board_value(x, y, z);
                if (value == 0) {
                    continue;
                }
                var color = color_table[value - 1];
                var position = vec3(x, y, z);
                render_block(position, color);
            }
        }
    }
}

function get_board_value( x, y, z ) {
    return board_array[y][z][x];
}

function set_board_value( x, y, z, new_value ) {
    board_array[y][z][x] = new_value;
}



var render = function() {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    
    // Staðsetja áhorfanda og meðhöndla músarhreyfingu
    var mv = lookAt( vec3(0.0, 2.0, zDist), vec3(0.0, 2.0, 0.0), vec3(0.0, 1.0, 0.0) );
    mv = mult( mv, rotateX( spinX ) );
    mv = mult( mv, rotateY( spinY ) );
    modelViewMatrix = mv;

    set_board_value(0, 0, 0, 1);
    set_board_value(1, 1, 1, 2);
    set_board_value(2, 2, 2, 3);
    set_board_value(3, 3, 3, 4);
    set_board_value(4, 4, 4, 1);
    set_board_value(5, 5, 5, 2);
    render_board();

    requestAnimFrame(render);
}



