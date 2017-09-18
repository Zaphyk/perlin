var cubeRotation = 0.0;
var chunk_width = 32, chunk_depth = 32, chunk_height = 32;
var vertCount = 0;
var mode;
var buffers;
var global_gl;
var globalScale = .55;


var voxels = [];
for(x = 0; x < chunk_width; x++){
  voxels[x] = [];
  for(y = 0; y < chunk_height; y++){
    voxels[x][y] = [];
    for(z = 0; z < chunk_depth; z++){
      voxels[x][y][z] = 0;
    }
  }  
}

heightmap();

var rng = RandomInt(1, 65536);
noise.seed(rng);
document.getElementById('seed').value = rng;

function recreate(){
    //display value
    $('#scale-value').val($('#scale').val());
    $('#amplitude-value').val($('#amplitude').val());
    //-----------------------
	heightmap(); 
	buffers = initBuffers(global_gl);
}

function lerp(F1, F2, T){
	return (1-T)*F1 + T*F2;
}

function RandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}

function heightmap(){
  var type = $('#dimension').val();
  var noiseType = $('#noiseType').val();
  var scale = parseFloat( $('#scale').val() ), amplitude = parseFloat( $('#amplitude').val());
  var rng = $('#seed').val();
  if(rng >= 65536)
    document.getElementById('seed').value = 65536;
  if(rng < 1)
    document.getElementById('seed').value = 1;

  noise.seed(rng);

  var t0 = performance.now();

  if(type == "2 Dimensions"){
    for(x = 0; x < chunk_width; x++){
      for(z = 0; z < chunk_depth; z++){
        var height = 0;
        if(noiseType == "Simplex Noise")
          height = noise.simplex2( x * scale, z * scale) * amplitude + chunk_height * .5;
        
        else if(noiseType == "Perlin Noise")
          height = noise.perlin2( x * scale, z * scale) * amplitude + chunk_height * .5;
        
        
        for(y = 0; y < chunk_height; y++){
        	voxels[x][y][z] = (height-y); 
        }
      }  
    }
  }else if("3 Dimensions"){
    for(x = 0; x < chunk_width; x++){
      for(z = 0; z < chunk_depth; z++){
        for(y = 0; y < chunk_height; y++){
          if(noiseType == "Simplex Noise")
            voxels[x][y][z] = noise.simplex3( x * scale, y * scale, z * scale) * amplitude;
          
          else if(noiseType == "Perlin Noise")
            voxels[x][y][z] = noise.perlin3( x * scale, y * scale, z * scale) * amplitude;
        }
      }  
    }
  }
  t1 = performance.now();
  document.getElementById("timeSpent").innerHTML = "Time: "+(t1-t0).toFixed(3) + " MS";

}



main();

//
// Start here
//
var uints_for_indices;
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');
  global_gl = gl;
  mode = gl.TRIANGLES;
  canvas.onmousedown = handleMouseDown;
  document.onmouseup = handleMouseUp;
  document.onmousemove = handleMouseMove;

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program

  const vsSource = `
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition,1);
      vColor = vec4( mat3(uNormalMatrix) * aVertexColor.xyz, 1);
    }
  `;

  // Fragment shader program

  const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vec4( (vColor.xyz + vec3(1,1,1) ) * .5, 1);
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVevrtexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),

    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  buffers = initBuffers(gl);

  var then = 0;

  // Draw the scene repeatedly
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;
	
	velocityX = lerp(velocityX, 0, deltaTime * 6);
	velocityY = lerp(velocityY, 0, deltaTime * 6);

	var newRotationMatrix = mat4.create();
	mat4.identity(newRotationMatrix);
	mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad( -(velocityX / 16) ), [0, 1, 0]);
	mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(velocityY / 16), [1, 0, 0]);
	mat4.multiply(mouseRotationMatrix, newRotationMatrix, mouseRotationMatrix);

    drawScene(gl, programInfo, buffers, deltaTime);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple three-dimensional cube.
//
function initBuffers(gl) {

  // Create a buffer for the cube's vertex positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);


var verts = [], norms = [];
var result = new MData();
for(x = 0; x < chunk_width-1; x++){
  for(y = 0; y < chunk_height-1; y++){
    for(z = 0; z < chunk_depth-1; z++){

        var cell = new GridCell();
        cell.Density[0] = voxels[x][y][z];
        cell.P[0] = [x, y, z];
        cell.P[1] = [x+1, y, z];
        cell.P[2] = [x+1, y, z+1];
        cell.P[3] = [x, y, z+1];
        cell.P[4] = [x, y+1, z];
        cell.P[5] = [x+1, y+1, z];
        cell.P[6] = [x+1, y+1, z+1];
        cell.P[7] = [x, y+1, z+1];

        if(x < chunk_width-1)
          cell.Density[1] = voxels[x+1][y][z];
        

        if(x < chunk_width-1 && z < chunk_width-1)
          cell.Density[2] = voxels[x+1][y][z+1];
        

        if(z < chunk_width-1)
          cell.Density[3] = voxels[x][y][z+1];

        if(y < chunk_height-1)
          cell.Density[4] = voxels[x][y+1][z];
      

        if(x < chunk_width-1 && y < chunk_height-1)
          cell.Density[5] =  voxels[x+1][y+1][z];

        if(x < chunk_width-1 && y < chunk_height-1 && z < chunk_width-1)
          cell.Density[6] = voxels[x+1][y+1][z+1];
        

        if(z < chunk_width-1 && y < chunk_height-1)
          cell.Density[7] =  voxels[x][y+1][z+1];
          
        
        for(k=0; k < cell.P.length; k++)
          cell.P[k] = [cell.P[k][0] , cell.P[k][1], cell.P[k][2] * 1 - chunk_width * .5];

       	MarchCube(0, cell, result);
    }
  }  
}
verts = result.vertices;
norms = result.normals;

var globalScale = .65;
  for(i = 0; i < verts.length; i+=3){
    verts[i+0] *= globalScale;
    verts[i+1] *= globalScale;
    verts[i+2] *= globalScale;
  }


  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);


  var colors = [];

  for (var j = 0; j < verts.length; j+=3) {
  var c = [ norms[j+0], norms[j+1], norms[j+2], 1.0]; 
    colors.push( (c[0] ) * 1);
    colors.push( (c[1] ) * 1);
    colors.push( (c[2] ) * 1);
    colors.push(c[3]);
  }

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex arrays for each face's vertices.

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  /*const indices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23,   // left
  ];*/

var indices = [];
for (var j = 0; j < verts.length / 3; j++) {
  indices.push(j);
}
vertCount = indices.length;

  // Now send the element array to GL
var array = new Uint16Array(indices)

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
       array, gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
  };
}

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

var mouseRotationMatrix = mat4.create();
mat4.identity(mouseRotationMatrix);

function degToRad(a){
	return a * Math.PI / 180;
}

function handleMouseDown(event) {
	mouseDown = true;
	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
}

function handleMouseUp(event) {
mouseDown = false;
}

var velocityX = 0, velocityY = 0;
function handleMouseMove(event) {
	if (!mouseDown) {
	  return;
	}
	var newX = event.clientX;
	var newY = event.clientY;

	var deltaX = newX - lastMouseX;
	var deltaY = newY - lastMouseY;
	velocityX += deltaX;
	velocityY += deltaY; 

	lastMouseX = newX
	lastMouseY = newY;
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, deltaTime) {
  resize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(1, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  gl.disable(gl.CULL_FACE);

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = 60 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 1;
  const zFar = 400.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);



  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();
  
  mat4.translate(modelViewMatrix, 
                 modelViewMatrix,   
                 [-chunk_width * .0, 0.0, -chunk_depth * .75]);

  mat4.multiply(modelViewMatrix, modelViewMatrix, mouseRotationMatrix);
  
  mat4.translate(modelViewMatrix, 
                 modelViewMatrix,   
                 [-chunk_width * .5 * globalScale, -chunk_height * .35, -chunk_depth * .0]);

  

  

  const normalMatrix = mat4.create();

  mat4.invert(normalMatrix, modelViewMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  // Tell WebGL how to pull out the colors from the color buffer
  // into the vertexColor attribute.
  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexColor);
  }

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix)
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.normalMatrix,
      false,
      normalMatrix);

  {

    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(mode, vertCount, type, offset);
  }

  // Update the rotation for the next draw

  cubeRotation += deltaTime;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function wireframe(gl){
  if(mode == gl.LINE_STRIP)
    mode = gl.TRIANGLES;
  else
    mode = gl.LINE_STRIP;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
 
  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
 
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
}
