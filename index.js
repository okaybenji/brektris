const randomIntBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomArrayElement = arr => arr[Math.floor(Math.random() * arr.length)];

const scenes = {
  logo: {
    preload() {
      //this.load.image('logo', 'img/logo.gif');
    },
    create() {
      // Set up SFX. Don't allow sounds to stack.
      const sfx = () => {
        const sounds = ['silence'];
        const soundbank = sounds.reduce((bank, name) => {
          bank[name] = new Howl({
            src: [`./sfx/${name}.wav`],
            volume: 0.5,
          });

          return bank;
        }, {});

        return {
          play(name) {
            if (soundbank[name].playing()) {
              soundbank[name].stop();
            }
            soundbank[name].play();
          },
          stop(name) {
            soundbank[name].stop();
          }
        };
      };

      game.sfx = sfx();

      //const logo = this.add.image(128, 120, 'logo');

      // Prepare the menu.
      this.scene.add('menu', scenes.menu);

      this.time.delayedCall(3000, () => {
        this.scene.start('menu');
      });
    },
  },
  play: {
    preload() {
      this.load.image('paddle', 'img/paddle.png');
      this.load.image('ball', 'img/ball.png');
      this.load.image('brick', 'img/brick.png');
      this.load.image('brickShell', 'img/brickShell.png');
      this.load.image('brickHard', 'img/brickHard.png');
      this.load.image('brick2xBall', 'img/brick2xBall.png');
      this.load.image('line', 'img/dotted-line.png');
    },
    create() {
      this.physics.world.setBoundsCollision(true);

      this.bricks = this.physics.add.staticGroup();
      this.balls = [];

      this.add.image(game.canvas.width / 2, 2100, 'line');

      const addBrickRow = () => {
        const createBrick = (x) => {
          const rand = Math.random();

          const type =
            rand < 0.05 ? 'none'
            : rand < 0.15 ? 'brick2xBall'
            : rand < 0.25 ? 'brickShell'
            : rand < 0.35 ? 'brickHard'
            : 'brick';

          if (type === 'none') {
            return;
          }

          const brick = new Phaser.Physics.Arcade.Sprite(this, x, -40, type);
          brick.type = type;

          return brick;
        };

        const bricks = [...Array(7)]
          .map((x, i) => createBrick(82 + 160 * i))
          .filter(brick => brick);
        this.bricks.addMultiple(bricks, true);

        this.bricks.getChildren().forEach((brick) => {
          this.tweens.add({
            targets: [brick, brick.body],
            y: brick.y + 100,
            duration: 1000,
          });
        });
      };

      this.paddle = this.physics.add.image(game.canvas.width / 2, 2100, 'paddle').setImmovable();

      // Adds a ball to the world, with optional params.
      const addBall = ({onPaddle, x, y, velocity}) => {
        x = x || game.canvas.width / 2;
        y = y || 2050;
        velocity = velocity || {x: 0, y: 0};

        const ball = this.physics.add.image(x, y, 'ball')
          .setCollideWorldBounds(true)
          .setBounce(1)
          .setVelocity(velocity.x, velocity.y);

        if (onPaddle) {
          ball.setData('onPaddle', true);
        }

        this.physics.add.collider(ball, this.bricks, (ball, brick) => {
          const typeStrategy = {
            brick2xBall() {
              addBall({
                x: ball.x,
                y: ball.y,
                velocity: {
                  x: ball.body.velocity.x,
                  y: -ball.body.velocity.y
                }
              });

              brick.disableBody(true, true);
            },
            brick() {
              brick.disableBody(true, true);
            },
            brickShell: () => {
              // Must hit it from above.
              if (ball.body.blocked.down) {
                brick.disableBody(true, true);
              } else {
                this.tweens.add({
                  targets: brick,
                  props: {
                    x: { value: brick.x + 10, duration: 50 },
                  },
                  yoyo: true,
                  repeat: 2
                });
              }
            },
            brickHard: () => {
              // Turns into regular brick.
              const x = brick.x;
              const y = brick.y;
              brick.disableBody(true, true);
              const newBrick = new Phaser.Physics.Arcade.Sprite(this, x, y, 'brick');
              newBrick
                .type = 'brick';
              this.bricks.add(newBrick, true);
            },
          };

          typeStrategy[brick.type]();
        }, null, this);
        this.physics.add.collider(ball, this.paddle, (ball, paddle) => {
          if (ball.x < paddle.x) {
            //  Ball is on the left-hand side of the paddle
            const diff = paddle.x - ball.x;
            ball.setVelocityX(-10 * diff);
          }
          else if (ball.x > paddle.x) {
            //  Ball is on the right-hand side of the paddle
            const diff = ball.x -paddle.x;
            ball.setVelocityX(10 * diff);
          }
          else {
            //  Ball is perfectly in the middle
            //  Add a little random X to stop it bouncing straight up!
            ball.setVelocityX(2 + Math.random() * 8);
          }
        }, null, this);

        this.balls.push(ball);
      };

      addBrickRow();
      setInterval(addBrickRow, 5000);

      addBall({onPaddle: true});

      this.input.on('pointermove', (pointer) => {
        //  Keep the paddle within the game
        const margin = this.paddle.width / 3;
        this.paddle.x = Phaser.Math.Clamp(pointer.x, margin, game.canvas.width - margin);

        const ballOnPaddle = this.balls.find(b => b.getData('onPaddle'));
        if (ballOnPaddle) {
          ballOnPaddle.x = this.paddle.x;
        }
      }, this);

      this.input.on('pointerup', (pointer) => {
        const ballOnPaddle = this.balls.find(b => b.getData('onPaddle'));
        if (ballOnPaddle) {
          ballOnPaddle.setVelocity(-75, -2000);
          ballOnPaddle.setData('onPaddle', false);
        }

      }, this);
    },
    update() {
      this.balls = this.balls.filter((ball) => {
        if (ball.y > this.paddle.y && this.balls.length > 1) {
          ball.disableBody(true, true);
          return false;
        }

        return true;
      });
    },
  },
  pause: {
    preload() {

    },
    create() {

    },
  },
  menu: {
    preload() {
      // Add the various scenes.
      this.scene.add('pause', scenes.pause);
      this.scene.add('credits', scenes.credits);

    },
    create() {
      // Play a silent "sound" every 20 secs.
      // This prevents AudioContext from pausing itself.
      setInterval(() => {
        game.sfx.play('silence');
      }, 20000);
    },
  },
  credits: {
    create() {
    }
  }
};

const config = {
  type: Phaser.AUTO,
  width: 1125,
  height: 2436,
  pixelArt: true,
  physics: {
    default: 'arcade',
  },
  scene: scenes.play,
};

const game = new Phaser.Game(config);
