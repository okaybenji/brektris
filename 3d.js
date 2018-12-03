
const $ = query => document.querySelector(query);
const main = $('main');

/** Set up Three.js **/
// First we initialize the scene and our camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, main.offsetWidth / main.offsetHeight, 0.1, 10000 );
camera.position.z += 2000;
camera.position.y -= 1000;
camera.position.x += 570;

// We create the WebGL renderer and add it to the document
const renderer = new THREE.WebGLRenderer();
renderer.setSize( main.offsetWidth, main.offsetHeight );
$('main').appendChild( renderer.domElement );

// Get the shader code
const fragmentShader = document.getElementById('fragShader').innerHTML;

const depth = 100; // Default depth for all 3D objects.

/** Set up the scene **/
const paddleGeo = new THREE.BoxGeometry( 200, 40, depth );
const ballGeo = new THREE.BoxGeometry( 40, 40, depth );
const brickGeo = new THREE.BoxGeometry( 120, 40, depth );

//  const paddleMaterial = new THREE.ShaderMaterial({fragmentShader});
//const cubeMaterial = new THREE.MeshLambertMaterial({color: 0x55B663});

// Define materials.
const white = new THREE.MeshBasicMaterial( { color: 0xffffff} );
const pink = new THREE.MeshBasicMaterial( { color: 0xff1951} );
const purple = new THREE.MeshBasicMaterial( { color: 0x9c5cff} );
const yellow = new THREE.MeshBasicMaterial( { color: 0xffdc00} );

paddle = new THREE.Mesh( paddleGeo, white );
scene.add( paddle );
paddle.position.y = -2100;

let balls = [];
let bricks = [];

let p;

/** Animate the scene. **/
const render = () => {
  // Get the Phaser scene.
  p = game.activeScene;

  // Make sure it's loaded.
  if (p && p.paddle) {
    paddle.position.x = p.paddle.x;

    balls.forEach(b => scene.remove(b));
    balls = p.balls.map(b => {
      const ball = new THREE.Mesh(ballGeo, white);
      scene.add(ball);
      ball.position.x = b.x;
      ball.position.y = -b.y;

      return ball;
    });

    bricks.forEach(b => scene.remove(b));
    bricks = p.bricks.getChildren()
      .filter(b => b.active)
      .map(b => {
        const color =
          b.type === 'brick' ? purple
          : b.type === 'brickHard' ? pink
          : b.type === 'brickShell' ? yellow
          : pink;

        const brick = new THREE.Mesh(brickGeo, color);
        scene.add(brick);
        brick.position.x = b.x;
        brick.position.y = -b.y;

        return brick;
      });
  }

  requestAnimationFrame( render );
  renderer.render( scene, camera );
};

render();

// Listen for resize event to update resolution uniforms.
window.onresize = function(event){
  renderer.setSize(main.offsetWidth, main.offsetHeight);
}
