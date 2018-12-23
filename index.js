const randomIntBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomArrayElement = arr => arr[Math.floor(Math.random() * arr.length)];

const upgrades = {
  slots: 1, // How many upgrades can be active at once.
  ballProtection: 0, // This + 2 = number of balls before they shatter when crossing paddle line.
  shooterPlus: false, // Upgrades shooter to break shell bricks.
  brickSoftener: false, // Turns hard bricks directly into gems.
};

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
      game.activeScene = this;

      this.load.image('paddle', 'img/paddle.png');
      this.load.image('ball', 'img/ball.png');
      this.load.image('brick', 'img/brick.png');
      this.load.image('brickGem', 'img/brickGem.png');
      this.load.image('brickShell', 'img/brickShell.png');
      this.load.image('brickHard', 'img/brickHard.png');
      this.load.image('brick2xBall', 'img/brick2xBall.png');
      this.load.image('brickShooter', 'img/brickShooter.png');
      this.load.image('gem', 'img/gem.png');
      this.load.image('bullet', 'img/bullet.png');
      this.load.image('line', 'img/dotted-line.png');
    },
    create() {
      const menu = $('#menu');
      const restartButton = $('#restartButton');

      const restart = () => {
        this.scene.restart();
        menu.classList.add('hidden');
      };

      restartButton.onmouseup = restart;
      restartButton.ontouchstart = restart;

      this.endGame = () => {
        this.scene.pause();
        menu.classList.remove('hidden');
        clearInterval(this.rowInterval);
      };

      this.points = 0;
      this.physics.world.setBoundsCollision(true);

      this.bricks = this.physics.add.staticGroup();
      this.gems = this.physics.add.staticGroup();
      this.bullets = this.physics.add.group();
      this.balls = [];
      this.timers = {
        shooterExpiration: null,
        shooterNextFires: null,
      };

      this.add.image(game.canvas.width / 2, 2100, 'line');

      // Determine strategy for dealing with different brick types.
      this.getTypeStrategy = (collider, brick) => {
        // If the old brick was tweening, copy the remaining tween to the new brick.
        const copyTween = (oldBrick, newBrick) => {
          const tweenIndex = this.tweens._active.findIndex(activeTween => {
            return activeTween.targets.find(target => {
              return target === oldBrick;
            });
          });

          if (tweenIndex === -1) {
            return; // Not tweening.
          }

          const tween = this.tweens._active[tweenIndex];
          const tweenData = tween.data ? tween.data[0] : null;

          this.tweens.add({
            targets: newBrick,
            props: {
              y: { value: tweenData.end, duration: tweenData.duration - tweenData.elapsed },
            },
          });
        };

        return {
          brick: () => {
            brick.disableBody(true, true);
          },
          brickGem: () => {
            brick.disableBody(true, true);

            // Add a floating gem.
            const gem = new Phaser.Physics.Arcade.Sprite(this, brick.x, brick.y, 'gem');
            gem.type = 'gem';
            this.gems.add(gem, true);
            copyTween(brick, gem);
          },
          brickShell: () => {
            // Must hit it from above, unless this is a bullet from an upgraded shooter.
            if (collider.body.blocked.down || (collider.type === 'bullet' && upgrades.shooterPlus)) {
              brick.disableBody(true, true);
            } else {
              if (brick.tweening) {
                return;
              }

              brick.tweening = true;

              this.tweens.add({
                targets: brick,
                props: {
                  x: { value: brick.x + 10, duration: 50 },
                },
                yoyo: true,
                repeat: 2,
                onComplete() {
                  brick.tweening = false;
                }
              });
            }
          },
          brickHard: () => {
            // Turns into regular brick.
            brick.disableBody(true, true);
            const type = upgrades.brickSoftener ? 'gem' : 'brickGem';
            const newBrick = new Phaser.Physics.Arcade.Sprite(this, brick.x, brick.y, type);
            newBrick.type = type;
            upgrades.brickSoftener ?
              this.gems.add(newBrick, true)
              : this.bricks.add(newBrick, true);
            copyTween(brick, newBrick);
          },
          brick2xBall: () => {
            this.addBall({
              x: collider.x,
              y: collider.y,
              velocity: {
                x: collider.body.velocity.x,
                y: -collider.body.velocity.y || 2000
              }
            });

            brick.disableBody(true, true);
          },
          brickShooter: () => {
            this.timers.shooterExpiration = Date.now() + 5000;

            brick.disableBody(true, true);
          },
        };
      };

      this.physics.add.collider(this.bullets, this.bricks, (bullet, brick) => {
        const typeStrategy = this.getTypeStrategy(bullet, brick);
        typeStrategy[brick.type]();
        bullet.disableBody(true, true);
      }, null, this);

      const addBrickRow = () => {
        const createBrick = (x) => {
          const rand = Math.random();

          let type =
            rand < 0.05 ? 'none'
            : rand < 0.15 ? 'brick2xBall'
            : rand < 0.25 ? 'brickShell'
            : rand < 0.40 ? 'brickHard'
            : rand < 0.43 ? 'brickShooter'
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

        const shiftDownRow = (entity) => {
          this.tweens.add({
            targets: [entity, entity.body],
            y: entity.y + 100,
            duration: 1000,
          });
        };

        this.bricks.getChildren().forEach(shiftDownRow);
        this.gems.getChildren().forEach(shiftDownRow);
      };

      this.paddle = this.physics.add.image(game.canvas.width / 2, 2100, 'paddle').setImmovable();

      // Adds a ball to the world, with optional params.
      this.addBall = ({onPaddle, x, y, velocity}) => {
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
          const typeStrategy = this.getTypeStrategy(ball, brick);
          typeStrategy[brick.type]();
        }, null, this);

        this.physics.add.overlap(ball, this.gems, (ball, gem) => {
          gem.disableBody(true, true);
          this.points++;
          $('#points').innerHTML = this.points;
        });

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
      this.rowInterval = setInterval(addBrickRow, 5000);

      this.addBall({onPaddle: true});

      this.input.on('pointerdown', (pointer) => {
        this.paddleStart = this.paddle.x;
      });

      this.input.on('pointermove', (pointer) => {
        //  Keep the paddle within the game
        const margin = this.paddle.width / 3;

        const paddleX = pointer.isDown ? this.paddleStart + pointer.x - pointer.downX : pointer.x;

        this.paddle.x = Phaser.Math.Clamp(paddleX, margin, game.canvas.width - margin);

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
      // Remove extra balls that fall below the paddle.
      this.balls = this.balls.filter((ball) => {
        if (ball.y > this.paddle.y && this.balls.length > (1 + upgrades.ballProtection)) {
          ball.disableBody(true, true);
          return false;
        }

        return true;
      });

      // Handle power-up timers.
      if (this.timers.shooterExpiration) {
        // Shooter expired.
        if (Date.now() > this.timers.shooterExpiration) {
          this.timers.shooterExpiration = null;
          this.timers.shooterNextFires = null;
        }
        if (!this.timers.shooterNextFires || Date.now() > this.timers.shooterNextFires) {
          const bullet = new Phaser.Physics.Arcade.Sprite(this, this.paddle.x, this.paddle.y, 'bullet');
          bullet.type = 'bullet';
          this.bullets.add(bullet, true);
          bullet.setVelocity(0, -2000);
          this.timers.shooterNextFires = Date.now() + 250;
        }
      }

      const shouldEndGame = this.bricks
        .getChildren()
        .find(brick => brick.active && brick.y > this.paddle.y);
      if (shouldEndGame) {
        this.endGame();
      }
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
    arcade: {
      // debug: true
    }
  },
  scene: scenes.play,
};

const game = new Phaser.Game(config);
