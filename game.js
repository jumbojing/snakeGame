class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 600;
        this.canvas.height = 400;
        
        // 游戏状态
        this.snake = [{x: 10, y: 10}];
        this.food = this.generateFood();
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.health = 100;
        this.gameSpeed = 100;
        this.theme = 'classic';
        this.infiniteMode = false;
        this.reviveCount = 3;
        this.paused = false;
        this.foodCount = 10;
        this.npcSnake = [
            {x: 30, y: 10},
            {x: 29, y: 10},
            {x: 28, y: 10}
        ];
        this.npcDirection = 'left';
        this.activeFoods = [];

        // 初始化控制
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.gameSpeed = parseInt(e.target.value);
        });
        
        document.querySelectorAll('.theme-switcher button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', this.theme);
        document.querySelectorAll('.theme-switcher button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });

        // 无限模式开关
        document.getElementById('infiniteMode').addEventListener('click', () => {
            this.infiniteMode = !this.infiniteMode;
            document.getElementById('infiniteMode').textContent = 
                this.infiniteMode ? "普通模式" : "无限模式";
        });

        // 复活按钮
        document.getElementById('revive').addEventListener('click', () => {
            if (this.reviveCount > 0) {
                this.reviveCount--;
                this.snake = [{x: 10, y: 10}];
                this.health = 100;
                document.getElementById('health').textContent = this.health;
                document.getElementById('revive').style.display = 'none';
                document.getElementById('revive').textContent = `复活（剩余${this.reviveCount}次）`;
            }
        });
        });

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                'ArrowUp': 'up', 'w': 'up',
                'ArrowDown': 'down', 's': 'down',
                'ArrowLeft': 'left', 'a': 'left',
                'ArrowRight': 'right', 'd': 'right'
            };
            if (keyMap[e.key] && !this.isOpposite(keyMap[e.key])) {
                this.nextDirection = keyMap[e.key];
            }
        });

        this.gameLoop();
    }

    isOpposite(newDir) {
        const opposites = {up: 'down', down: 'up', left: 'right', right: 'left'};
        return opposites[newDir] === this.direction;
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * (this.canvas.width / 20)),
                y: Math.floor(Math.random() * (this.canvas.height / 20))
            };
        } while (this.snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
        return newFood;
    }

    update() {
        this.direction = this.nextDirection;
        const head = {...this.snake[0]};

        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 处理边界碰撞
        let hitWall = false;
        if (!this.infiniteMode) {
            hitWall = head.x < 0 || head.x >= this.canvas.width/20 || 
                     head.y < 0 || head.y >= this.canvas.height/20;
        } else {
            // 无限模式沿墙滑动
            const prevHead = this.snake[0];
            if (head.x < 0) {
                head.x = 0;
                this.nextDirection = this.direction === 'left' ? 'up' : 'down';
            } else if (head.x >= this.canvas.width/20) {
                head.x = (this.canvas.width/20) - 1;
                this.nextDirection = this.direction === 'right' ? 'up' : 'down';
            } else if (head.y < 0) {
                head.y = 0;
                this.nextDirection = this.direction === 'up' ? 'right' : 'left';
            } else if (head.y >= this.canvas.height/20) {
                head.y = (this.canvas.height/20) - 1;
                this.nextDirection = this.direction === 'down' ? 'right' : 'left';
            }
            // 保持滑动方向
            this.direction = this.nextDirection;
            hitWall = JSON.stringify(head) !== JSON.stringify(prevHead);
        }

        // 处理自碰撞
        const selfCollision = this.snake.some(seg => seg.x === head.x && seg.y === head.y);
        
        if (hitWall) {
            const damage = {150: 5, 100: 10, 60: 20}[this.gameSpeed];
            this.health = Math.max(0, this.health - damage);
            document.getElementById('health').textContent = this.health;
            
            if (this.health <= 0) {
                document.getElementById('revive').style.display = 'inline-block';
                return;
            }
        }

        if (selfCollision || (hitWall && !this.infiniteMode)) {
            if (this.reviveCount > 0) {
                document.getElementById('revive').style.display = 'inline-block';
                return;
            } else {
                alert(`游戏结束！得分：${this.score}`);
                location.reload();
            }
        }

        this.snake.unshift(head);
        
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            this.food = this.generateFood();
        } else {
            this.snake.pop();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制食物
        this.ctx.fillStyle = 'var(--secondary-color)';
        this.ctx.fillRect(this.food.x*20, this.food.y*20, 18, 18);

        // 绘制蛇
        this.snake.forEach((seg, index) => {
            this.ctx.fillStyle = `hsl(${index * 15}, 70%, 50%)`;
            this.ctx.fillRect(seg.x*20, seg.y*20, 18, 18);
        });
    }

    gameLoop(timestamp) {
        if (!this.lastUpdate || timestamp - this.lastUpdate > this.gameSpeed) {
            this.lastUpdate = timestamp;
            this.update();
            this.draw();
        }
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// 启动游戏
window.addEventListener('load', () => new Game());
