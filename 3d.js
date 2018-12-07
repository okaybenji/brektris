
const $ = query => document.querySelector(query);
const main = $('main');

/** Set up Three.js **/
// First we initialize the scene and our camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 44.5, main.offsetWidth / main.offsetHeight, 0.1, 10000 );
camera.position.z = 3000;
camera.position.y = -1220;
camera.position.x = 563;

// We create the WebGL renderer and add it to the document
const renderer = new THREE.WebGLRenderer();
renderer.setSize( main.offsetWidth, main.offsetHeight );

$('main').appendChild( renderer.domElement );

// Get the shader code
const fragmentShader = document.getElementById('fragShader').innerHTML;

const depth = 50; // Default depth for all 3D objects.

/** Set up the scene **/
const paddleGeo = new THREE.BoxGeometry( 200, 40, depth );
const ballGeo = new THREE.BoxGeometry( 40, 40, 40 );
const gemGeo = new THREE.BoxGeometry( 30, 30, 30 );
const scoreGemGeo = new THREE.BoxGeometry( 60, 60, 60 );
const bulletGeo = new THREE.BoxGeometry( 20, 20, 20 );
const brickGeo = new THREE.BoxGeometry( 120, 40, depth );

//  const paddleMaterial = new THREE.ShaderMaterial({fragmentShader});
//const cubeMaterial = new THREE.MeshLambertMaterial({color: 0x55B663});

// Define materials.
const white = new THREE.MeshLambertMaterial( { color: 0xffffff} );
const grey = new THREE.MeshLambertMaterial( { color: 0x666666} );
const pink = new THREE.MeshLambertMaterial( { color: 0xff1951} );
const purple = new THREE.MeshLambertMaterial( { color: 0x9c5cff} );
const yellow = new THREE.MeshLambertMaterial( { color: 0xffdc00} );

//const bgGeo = new THREE.PlaneGeometry( main.offsetWidth, main.offsetHeight );
//const bg = new THREE.Mesh( bgGeo, grey );
//bg.position.x = 570;
//bg.position.y = -1000;
//scene.add(bg);

paddle = new THREE.Mesh( paddleGeo, white );
scene.add( paddle );
paddle.position.y = -2100;

// Goes with the UI to show how many gems have been collected.
const scoreGem = new THREE.Mesh( scoreGemGeo, pink );
scene.add(scoreGem);
scoreGem.position.y = -2275
scoreGem.position.x = 1020;
scoreGem.rotation.z = Math.PI / 4;
scoreGem.rotation.x = Math.PI / 4;

const boundaryGeo = new THREE.BoxGeometry( 10, 10, 1 );
const boundary = [...Array(50)].map((item, i) => {
  const dot = new THREE.Mesh( boundaryGeo, white );
  scene.add(dot);
  dot.position.x = i * 25;
  dot.position.y = -2100;

  return dot;
});

// White directional light at half intensity shining from the top.
//const light = new THREE.DirectionalLight( 0xffffff, 0.5 );
//light.position.z = 1;
//light.position.y = 0;

let gemRotation = 0;

const ambientLight = new THREE.AmbientLight( 0xBBBBBB );
scene.add(ambientLight);

const pointLight = new THREE.PointLight( 0xffffff, 0.5, 0 );
pointLight.position.set(570, -1000, 300);
scene.add( pointLight );

let balls = [];
let bricks = [];
let bullets = [];

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
          : b.type === 'gem' ? pink
          : b.type === 'brickShell' ? yellow
          : purple;

        const mesh = b.type === 'gem' ? gemGeo : brickGeo;

        const brick = new THREE.Mesh(mesh, color);
        scene.add(brick);
        brick.position.x = b.x;
        brick.position.y = -b.y;

        if (b.type === 'gem') {
          brick.rotation.z = Math.PI / 4;
          brick.rotation.x = Math.PI / 4;
          brick.rotation.y = gemRotation;
        }

        return brick;
      });

    scoreGem.rotation.y = gemRotation;

    bullets.forEach(b => scene.remove(b));
    bullets = p.bullets.getChildren()
      .filter(b => b.active)
      .map(b => {
        const bullet = new THREE.Mesh(bulletGeo, white);
        scene.add(bullet);
        bullet.position.x = b.x;
        bullet.position.y = -b.y;

        return bullet;
      });
  }

  gemRotation += 0.05;

  requestAnimationFrame( render );
  renderer.render( scene, camera );
};

render();

// Listen for resize event to update resolution uniforms.
window.onresize = function(event){
  renderer.setSize(main.offsetWidth, main.offsetHeight);
}
