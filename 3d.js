
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
const renderer = new THREE.WebGLRenderer( {antialias: true} );
renderer.setSize( main.offsetWidth, main.offsetHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

$('main').appendChild( renderer.domElement );

const textureLoader = new THREE.TextureLoader();
const textures = {
  brickShell: textureLoader.load('img/brickShell.png'),
  brickGem: textureLoader.load('img/brickGem.png'),
  brickBall: textureLoader.load('img/brickBall.png'),
  brickShooter: textureLoader.load('img/brickShooter.png'),
};

// Get the shader code
// const fragmentShader = document.getElementById('fragShader').innerHTML;

const depth = 50; // Default depth for all 3D objects.

/** Set up the scene **/
const paddleGeo = new THREE.BoxGeometry( 200, 40, depth );
const ballGeo = new THREE.BoxGeometry( 40, 40, 40 );
const gemGeo = new THREE.BoxGeometry( 30, 30, 30 );
const scoreGemGeo = new THREE.BoxGeometry( 60, 60, 60 );
const bulletGeo = new THREE.BoxGeometry( 20, 20, 20 );
const brickGeo = new THREE.BoxGeometry( 120, 40, depth );

//  const paddleMaterial = new THREE.ShaderMaterial({fragmentShader});
const cubeMaterial = new THREE.MeshLambertMaterial({color: 0x55B663});

// Define materials.
const materials = {
  white: new THREE.MeshLambertMaterial({color: 0xffffff}),
  gray: new THREE.MeshLambertMaterial({color: 0xd8d8d8}),
  gem: new THREE.MeshLambertMaterial({color: 0xff1951}),
  brick: new THREE.MeshLambertMaterial({color: 0x9c5cff}),
  brickHard: new THREE.MeshLambertMaterial({color: 0xff1951}),
  brickShellTop: new THREE.MeshLambertMaterial({color: 0xffdc00}),
  brickShellBottom: new THREE.MeshLambertMaterial({color: 0xff8b00}),
  brickShellFront: new THREE.MeshLambertMaterial({map: textures.brickShell}),
  brickGemFront: new THREE.MeshLambertMaterial({map: textures.brickGem}),
  brickBallFront: new THREE.MeshLambertMaterial({map: textures.brickBall}),
  brickShooterFront: new THREE.MeshLambertMaterial({map: textures.brickShooter}),
};

// Font face is 5th material
materials.brickShell = [materials.brickShellFront, materials.brickShellFront, materials.brickShellTop, materials.brickShellBottom, materials.brickShellFront, materials.brickShellTop];
materials.brickGem = [materials.brick, materials.brick, materials.brick, materials.brick, materials.brickGemFront, materials.brick];
materials.brickBall = [materials.brick, materials.brick, materials.brick, materials.brick, materials.brickBallFront, materials.brick];
materials.brickShooter = [materials.brick, materials.brick, materials.brick, materials.brick, materials.brickShooterFront, materials.brick];

const bgGeo = new THREE.PlaneGeometry( main.offsetWidth * 3, main.offsetHeight * 3 );
const bg = new THREE.Mesh( bgGeo, materials.gray );
bg.position.x = 570;
bg.position.y = -1200;
bg.position.z = -150;

bg.receiveShadow = true;
scene.add(bg);

paddle = new THREE.Mesh( paddleGeo, materials.white );
scene.add( paddle );
paddle.position.y = -2100;
paddle.castShadow = true;

// Goes with the UI to show how many gems have been collected.
const scoreGem = new THREE.Mesh( scoreGemGeo, materials.gem );
scene.add(scoreGem);
scoreGem.position.y = -2275
scoreGem.position.x = 1020;
scoreGem.rotation.z = Math.PI / 4;
scoreGem.rotation.x = Math.PI / 4;
scoreGem.castShadow = true;

const boundaryGeo = new THREE.BoxGeometry( 10, 10, 1 );
const boundary = [...Array(50)].map((item, i) => {
  const dot = new THREE.Mesh( boundaryGeo, materials.white );
  scene.add(dot);
  dot.position.x = i * 25;
  dot.position.y = -2100;

  return dot;
});

let gemRotation = 0;

const ambientLight = new THREE.AmbientLight( 0xBBBBBB );
scene.add(ambientLight);

const spotLight = new THREE.SpotLight( 0xffffff );
spotLight.distance = 10000;
spotLight.position.set(570, -1400, 5000);
spotLight.castShadow = true;
spotLight.intensity = 0.5;
spotLight.shadow.mapSize.width = Math.pow(2, 13);
spotLight.shadow.mapSize.height = Math.pow(2, 13);
scene.add( spotLight );

let balls = [];
let bricks = [];
let gems = [];
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
      const ball = new THREE.Mesh(ballGeo, materials.white);
      ball.position.x = b.x;
      ball.position.y = -b.y;
      ball.castShadow = true;
      scene.add(ball);

      return ball;
    });

    bricks.forEach(b => scene.remove(b));
    bricks = p.bricks.getChildren()
      .filter(b => b.active)
      .map(b => {
        const brick = new THREE.Mesh(brickGeo, materials[b.type]);
        brick.castShadow = true;
        brick.position.x = b.x;
        brick.position.y = -b.y;
        scene.add(brick);

        return brick;
      });

    gems.forEach(g => scene.remove(g));
    gems = p.gems.getChildren()
      .filter(g => g.active)
      .map(g => {
        const gem = new THREE.Mesh(gemGeo, materials.gem);
        gem.castShadow = true;
        gem.position.x = g.x;
        gem.position.y = -g.y;
        scene.add(gem);

        gem.rotation.z = Math.PI / 4;
        gem.rotation.x = Math.PI / 4;
        gem.rotation.y = gemRotation;

        return gem;
      });

    scoreGem.rotation.y = gemRotation;

    bullets.forEach(b => scene.remove(b));
    bullets = p.bullets.getChildren()
      .filter(b => b.active)
      .map(b => {
        const bullet = new THREE.Mesh(bulletGeo, materials.white);
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
