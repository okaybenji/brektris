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
    },
    create() {
      this.physics.world.setBoundsCollision(true);

      this.bricks = this.physics.add.staticGroup();

      const addBrickRow = () => {
        const bricks = [...Array(7)]
          .map((x, i) => new Phaser.Physics.Arcade.Sprite(this, 82 + 160 * i, -40, 'brick'));
        this.bricks.addMultiple(bricks, true);

        this.bricks.getChildren().forEach((brick) => {
          this.tweens.add({
            targets: [brick, brick.body],
            y: brick.y + 100,
            duration: 1000,
          });
        });
      };

      addBrickRow();
      setInterval(addBrickRow, 5000);

      this.ball = this.physics.add.image(400, 2350, 'ball').setCollideWorldBounds(true).setBounce(1);
      this.ball.setData('onPaddle', true);

      this.paddle = this.physics.add.image(400, 2400, 'paddle').setImmovable();

      //  Our colliders
      this.physics.add.collider(this.ball, this.bricks, (ball, brick) => brick.disableBody(true, true), null, this);
      this.physics.add.collider(this.ball, this.paddle, (ball, paddle) => {
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

      //  Input events
      this.input.on('pointermove', (pointer) => {
          //  Keep the paddle within the game
          this.paddle.x = Phaser.Math.Clamp(pointer.x, 52, 1073);

          if (this.ball.getData('onPaddle')) {
            this.ball.x = this.paddle.x;
          }
      }, this);

      this.input.on('pointerup', (pointer) => {
        if (this.ball.getData('onPaddle')) {
          this.ball.setVelocity(-75, -2000);
          this.ball.setData('onPaddle', false);
        }
      }, this);
    },
    update() {

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
