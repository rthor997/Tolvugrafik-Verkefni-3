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
var lineBuffer, vPosition;

var fallSpeed = 500;

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

    currentBlock = {
        x: Math.floor(board_width / 2),
        y: board_height - 1,
        z: Math.floor(board_depth / 2),
        color: 1
    }

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

    lineBuffer = gl.createBuffer();

    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
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
        if (movement) {
        spinY += (e.clientX - origX);
        spinX += (origY - e.clientY);

        origX = e.clientX;
        origY = e.clientY;
    }
    } );
    
    // Event listener for keyboard
     window.addEventListener("keydown", function(e){
         switch( e.keyCode ) {
            case 37:    // vinstri ör
                if (canMoveHorizontal(currentBlock, 1, 0)) {
                    currentBlock.x += 1;
                }
                break;
            case 38:	// upp ör
                if (canMoveHorizontal(currentBlock, 0, 1)) {
                    currentBlock.z += 1;
                }
                break;
            case 39:    // hægri ör
                if (canMoveHorizontal(currentBlock, -1, 0)) {
                    currentBlock.x -= 1;
                }
                break;
            case 40:	// niður ör
                if (canMoveHorizontal(currentBlock, 0, -1)) {
                    currentBlock.z -= 1;
                }
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

    setInterval(function(){
        if (!moveDown(currentBlock)) {
            currentBlock = {
                x: Math.floor(board_width / 2),
                y: board_height - 1,
                z: Math.floor(board_depth / 2),
                color: Math.floor(Math.random()*4)+1
            };
        }
    }, 500); // hvert 500 ms
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
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var instanceMatrix = translate( 
        position[0] - (board_width - 1) / 2,
        position[1] - (board_height - 1) / 2, 
        position[2] - (board_depth - 1) / 2
    );
    var s = scalem(0.9, 0.9, 0.9);
    instanceMatrix = mult(instanceMatrix, s);

    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
    gl.uniform4fv(uColorLoc, flatten(color));
    gl.drawArrays( gl.TRIANGLES, 0, NumVertices );
}

function canMoveDown(block) {
    var newY = block.y - 1;

    // Ef við erum komin á botn
    if (newY < 0) return false;

    // Ef kubbur lendir á öðrum kubbi
    if (get_board_value(block.x, newY, block.z) !== 0) return false;

    return true;
}

function canMoveHorizontal(block, deltaX, deltaZ) {
    var newX = block.x + deltaX;
    var newZ = block.z + deltaZ;

    if (newX < 0 || newX >= board_width || newZ < 0 || newZ >= board_depth) {
        return false;
    }

    if (get_board_value(newX, block.y, newZ) != 0) {
        return false;
    }

    return true;
}

function moveDown(block) {
    if (canMoveDown(block)) {
        block.y -= 1;
        return true;
    } else {
        // Set kubbinn fastan í board_array
        set_board_value(block.x, block.y, block.z, block.color);
        return false;
    }
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

function render_floor_grid() {
    gl.uniform4fv(uColorLoc, flatten(vec4(0.4, 0.4, 0.4, 1.0)));

    for (let x = 0; x <= board_width; x++) {
        drawLine(
            vec3(x - board_width / 2, -board_height / 2 + 0.01, -board_depth / 2),
            vec3(x - board_width / 2, -board_height / 2 + 0.01, board_depth / 2)
        );
    }

    for (let z = 0; z <= board_depth; z++) {
        drawLine(
            vec3(-board_width / 2, -board_height / 2 +0.01, z - board_depth / 2),
            vec3(board_width / 2, -board_height / 2+ 0.01, z - board_depth / 2)
        );
    }
}

function render_left_grid() {
    gl.uniform4fv(uColorLoc, flatten(vec4(0.4, 0.4, 0.4, 1.0)));

    const offsetX = board_width / 2 - 0.01; // aðeins ofan til að forðast Z-fighting

    // Lóðréttar línur eftir Y-ás
    for (let z = 0; z <= board_depth; z++) {
        drawLine(
            vec3(offsetX, -board_height / 2, z - board_depth / 2),
            vec3(offsetX, board_height / 2, z - board_depth / 2)
        );
    }

    // Láréttar línur eftir Z-ás
    for (let y = 0; y <= board_height; y++) {
        drawLine(
            vec3(offsetX, y - board_height / 2, -board_depth / 2),
            vec3(offsetX, y - board_height / 2, board_depth / 2)
        );
    }
}


function render_back_grid() {
    gl.uniform4fv(uColorLoc, flatten(vec4(0.4, 0.4, 0.4, 1.0)));

    const offsetZ = board_depth / 2 - 0.01; 

    // Lóðréttar línur eftir Y
    for (let x = 0; x <= board_width; x++) {
        drawLine(
            vec3(x - board_width / 2, -board_height / 2, offsetZ),
            vec3(x - board_width / 2, board_height / 2, offsetZ)
        );
    }

    // Láréttar línur eftir X
    for (let y = 0; y <= board_height; y++) {
        drawLine(
            vec3(-board_width / 2, y - board_height / 2, offsetZ),
            vec3(board_width / 2, y - board_height / 2, offsetZ)
        );
    }
}


function drawLine(p1, p2) {
    const linePoints = [p1, p2];

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(linePoints), gl.STREAM_DRAW);

    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.drawArrays(gl.LINES, 0, 2);
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
    render_floor_grid();
    render_back_grid();
    render_left_grid();
    // Endurstilla pointer á kubbana
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    render_board();


    // Render fallandi kubb
    render_block(vec3(currentBlock.x, currentBlock.y, currentBlock.z), color_table[currentBlock.color-1]);

    requestAnimFrame(render);
}



