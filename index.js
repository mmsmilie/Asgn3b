// Vertex shader program
const VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV; // Add declaration for UV attribute
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec2 v_UV;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

// Fragment shader program
const FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;         // Base color
  uniform float u_textColorWeight;  // Weight for the texture color
  uniform float u_TextureChoose;
  uniform sampler2D u_Sampler0;     // Dirt
  uniform sampler2D u_Sampler1;     // Grass
  uniform sampler2D u_Sampler2;     // Sky
  void main() {
      vec4 grassColor = texture2D(u_Sampler1, v_UV);
      vec4 skyColor = texture2D(u_Sampler2, v_UV);

      vec4 textureColor = mix(grassColor, skyColor, u_TextureChoose);
  
      gl_FragColor = mix(u_FragColor, textureColor, u_textColorWeight); // Interpolate between base color and texture color based on weight
  }
`;

// Global Variables
let canvas;
let gl; 
let a_Position;
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_textColorWeight;
let u_TextureChoose;

var identityMatrix;

let camera;

let wHeld = false;
let aHeld = false;
let sHeld = false;
let dHeld = false;
let qHeld = false;
let eHeld = false;
let tHeld = false;
let gHeld = false;

let texture;
let texture1;
let texture2;

let objects = [];

let placed = [];

let stats;

let selected_map;

let canvas_mdown = false;

let lastMouseX = null;
let lastMouseY = null;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl");
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
  }
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_Size = gl.getUniformLocation(gl.program, "u_Size");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_textColorWeight = gl.getUniformLocation(gl.program, "u_textColorWeight");
  u_TextureChoose = gl.getUniformLocation(gl.program, "u_TextureChoose");
  if(a_Position < 0 || a_UV < 0 || u_FragColor < 0 || u_Size < 0 || u_ModelMatrix < 0 || u_ProjectionMatrix < 0 || u_ViewMatrix < 0){
    console.log("Failed to get the storage location of attribute or uniform variable");
  }
}

function addActionsFromHTML() {
  document.addEventListener('keydown', function(event) {
    //console.log("Keydown: " + event.key);
    switch (event.key) {
      case "w": wHeld = true; break;
      case "s": sHeld = true; break;
      case "a": aHeld = true; break;
      case "d": dHeld = true; break;
      case "q": qHeld = true; break;
      case "e": eHeld = true; break;
      case "t": tHeld = true; break;
      case "g": gHeld = true; break;
    }
  });

  document.addEventListener('keyup', function(event) {
    switch (event.key) {
      case "w": wHeld = false; break;
      case "s": sHeld = false; break;
      case "a": aHeld = false; break;
      case "d": dHeld = false; break;
      case "q": qHeld = false; break;
      case "e": eHeld = false; break;
      case "t": tHeld = false; break;
      case "g": gHeld = false; break;
    }
  });

  document.addEventListener('keypress', function(event) {
    switch (event.key) {
      case"c": addCube(); break;
      case"b": breakCube(); break;
    }
  });

  canvas.addEventListener("mousedown", function(event) {
    canvas_mdown = true;
    lastMouseX = event.offsetX;
    lastMouseY = event.offsetY;
  });

  canvas.addEventListener("mouseup", function(event) {
      canvas_mdown = false;
      lastMouseX = null;
      lastMouseY = null;
  })

  canvas.addEventListener("mousemove", function(event) {
      if (canvas_mdown) {
          const deltaX = event.offsetX - lastMouseX;
          const deltaY = event.offsetY - lastMouseY;
          camera.alpha = 3;
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX > 0) {
                  camera.panRight();
              } else {
                  camera.panLeft();
              }
          } else {
              if (deltaY > 0) {
                  camera.panDown();
              } else {
                  camera.panUp();
              }
          }

          lastMouseX = event.offsetX;
          lastMouseY = event.offsetY;
          camera.alpha = 5;
      }
  });
} 

function initTextures() {
  texture = gl.createTexture();
  texture1 = gl.createTexture();
  texture2 = gl.createTexture();

  var u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  var u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  var u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");

  var image1 = new Image();
  var image2 = new Image();
  var image3 = new Image();

  image1.onload = function() { loadTexture(texture, u_Sampler0, image1,0); };
  image2.onload = function() { loadTexture(texture1, u_Sampler1, image2,1); };
  image3.onload = function() { loadTexture(texture2, u_Sampler2, image3,2); };

  image1.src = 'dirt.png';
  image2.src = 'grass.png';
  image3.src = 'Sky.jpg';

  return true;
}

function loadTexture(texture, u_Sampler, image,texUnit) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  if(texUnit == 0){
    gl.activeTexture(gl.TEXTURE0);
  }else if(texUnit == 1){
    gl.activeTexture(gl.TEXTURE1);
  }else if(texUnit == 2){
    gl.activeTexture(gl.TEXTURE2);
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.uniform1i(u_Sampler, texUnit); // Bind the texture unit index to the sampler uniform
}

function drawSquare(identityMatrix,rgba,ratio,choice) {
  //console.log(choice);
  const vertices = new Float32Array([
    // Vertex positions and UV coordinates
    -0.5, -0.5, 0.0, 0.0, 0.0,
     0.5, -0.5, 0.0, 1.0, 0.0,
     0.5,  0.5, 0.0, 1.0, 1.0,
    -0.5, -0.5, 0.0, 0.0, 0.0,
     0.5,  0.5, 0.0, 1.0, 1.0,
    -0.5,  0.5, 0.0, 0.0, 1.0,
  ]);

  gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  gl.uniform1f(u_textColorWeight, ratio);
  gl.uniform1f(u_TextureChoose, choice);
  
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
  const FSIZE = vertices.BYTES_PER_ELEMENT;

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 5 * FSIZE, 0);
  gl.enableVertexAttribArray(a_Position);
  
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 5 * FSIZE, 3 * FSIZE); // Set up UV attribute pointer
  gl.enableVertexAttribArray(a_UV);
  
  const SM1 = new Matrix4();
  SM1.set(identityMatrix);
  SM1.translate(0, 0, 0);
  SM1.rotate(180, 0, 0, 1);
  SM1.scale(0.25, 0.25, 0.25);

  gl.uniformMatrix4fv(u_ModelMatrix, false, SM1.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawCube(identityMatrix,rgba,ratio,choice) {
  
  var texid = choice;

  const M1 = new Matrix4(identityMatrix);

  // Draw Front Face
  M1.translate(0, 0, 0.125);  // Move forward in the z-axis
  drawSquare(M1,rgba,ratio,texid);

  // Draw Back Face
  M1.set(identityMatrix);
  M1.translate(0, 0, -0.125);  // Move back in the z-axis
  drawSquare(M1,rgba,ratio,texid);

  // Draw Top Face
  M1.set(identityMatrix);
  M1.rotate(-90, 1, 0, 0);  // Rotate 90 degrees around the x-axis
  M1.translate(0, 0, 0.125);  // Move up in the z-axis
  drawSquare(M1,rgba,ratio,texid);

  // Draw Bottom Face
  M1.set(identityMatrix);
  M1.rotate(90, 1, 0, 0);  // Rotate -90 degrees around the x-axis
  M1.translate(0, 0, 0.125);  // Move down in the z-axis
  drawSquare(M1,rgba,ratio,texid);

  // Draw Left Face
  M1.set(identityMatrix);
  M1.rotate(-90, 0, 1, 0);  // Rotate 90 degrees around the y-axis
  M1.translate(0, 0, 0.125);  // Move left in the z-axis
  drawSquare(M1,rgba,ratio,texid);

  // Draw Right Face
  M1.set(identityMatrix);
  M1.rotate(90, 0, 1, 0);  // Rotate -90 degrees around the y-axis
  M1.translate(0, 0, 0.125);  // Move right in the z-axis
  drawSquare(M1,rgba,ratio,texid);

}

function controls() {
  if(wHeld) {
    camera.moveForward();
  }

  if(aHeld) {
    camera.moveLeft();
  }

  if(sHeld) {
    camera.moveBackward();
  }

  if(dHeld) {
    camera.moveRight();
  }

  if(qHeld) {
    camera.panLeft();
  }

  if(eHeld) {
    camera.panRight();
  }

  if(tHeld){
    camera.panUp();
  }

  if(gHeld){
    camera.panDown();
  }
}

function renderScene() {

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  controls();

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);

  objects.forEach(object => {
    object.render();
  })

  placed.forEach(object => {
    object.render();
  })
}

function tick() {
  stats.begin();
  renderScene();
  stats.end();
  requestAnimationFrame(tick);
}

function drawPillar(z,x,height) {
  if(height == 0) {
    return;
  }

  if (height < 0) {
    var cube = new Cube();
    cube.translate(x-16,-height,z-16);
    objects.push(cube);
  }

  for(var i = 0; i < height; i++) {
    var cube = new Cube();
    cube.translate(x-16,i,z-16);

    objects.push(cube);
  }
}

function makeWorld(size,map) {
  var size_of_world = size;

  // Add SkyBox
  var skyBox = new Cube();
  skyBox.translate(0,0,0);
  skyBox.textChoice = 1;
  skyBox.scale(size_of_world,size_of_world,size_of_world);
  objects.push(skyBox);

  var ground = new Cube();
  ground.translate(0,-1,0);
  ground.textChoice = 0;
  ground.scale(size_of_world,1,size_of_world);
  objects.push(ground);

  for(var i = 0; i < size_of_world; i++) {
    for(var j = 0; j < size_of_world; j++) {
      drawPillar(i,j,map[i][j]);
    }
  }
}

function setBasicMap(){
  selected_map = map_0;
  objects = [];
  placed = [];
  makeWorld(32,selected_map);
}

function setCaveMap(){
  selected_map = map_1;
  objects = [];
  placed = [];
  makeWorld(32,selected_map);
}

function addCube(){
  //console.log(" I HAVE SUSSTAINED GOD HOOD AND CREATED A FUCING CUBBE")

  var x = Math.round(camera.eye.elements[0]);
  var y = Math.round(camera.eye.elements[1]);
  var z = Math.round(camera.eye.elements[2]);

  var cube = new Cube();
  cube.translate(x,y,z);

  placed.push(cube);
}

function breakCube(){
  var x = Math.round(camera.eye.elements[0]);
  var y = Math.round(camera.eye.elements[1]);
  var z = Math.round(camera.eye.elements[2]);

  for(var i = 0; i < placed.length; i++) {
    var cube = placed[i];
    var matrix = cube.matrix;
    if(Math.round(matrix.elements[12]) == x && Math.round(matrix.elements[13]) == y && Math.round(matrix.elements[14]) == z) {
      placed.splice(i,1);
    }
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsFromHTML();

  camera = new Camera(canvas);

  identityMatrix = new Matrix4();

  selected_map = map_0;

  makeWorld(32,selected_map);

  stats = new Stats();
  stats.dom.style.left = "auto";
  stats.dom.style.right = 0;
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);

  // Set clear color
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  initTextures();

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.enable(gl.DEPTH_TEST);

  requestAnimationFrame(tick);
}
