var BubbleScreen = (function() {
  var klass = function BubbleScreen(game, player, canvas) {
    this.game     = game
    this.bubbles  = []
    this.observer = new PopObserver(canvas, player)
    this.game.registerScreen(this)
    this.player   = player
    this.context  = initCanvas(canvas, this.width, this.height)
    animate(this.context, [function(canvas) { renderEntities(canvas, this.getBubbles()) }.bind(this)])
  }

  function initCanvas(canvas, width, height) {
    canvas.width        = width
    canvas.style.width  = width + 'px'
    canvas.height       = height
    canvas.style.height = height + 'px'

    return canvas.getContext('2d')
  }

  function animate(canvas, render_steps) {
    var last = Date.now(),
        now  = last
    function render() {
      now = Date.now()
      canvas.delta = now - last
      last = now
      //clearScreen(canvas)
      for (var i = 0; i < render_steps.length; i++) {
        render_steps[i](canvas)
      }
      window.requestAnimationFrame(render)
    }

    window.requestAnimationFrame(render)
  }

  function clearScreen(canvas) {
    canvas.fillStyle = '#EEF'
    canvas.fillRect(0, 0, canvas.canvas.width, canvas.canvas.height)
  }

  function renderEntities(canvas, entities) {
    for (var i = entities.length; i--; ) {
      entities[i].render(canvas)
    }
  }

  klass.prototype.setDimensions = function(width, height) {
    this.width  = width
    this.height = height
  }

  klass.prototype.registerBubble = function(bubble){
    this.bubbles.push(new BubbleRenderer(bubble))
    this.observer.registerBubble(bubble)
  }

  klass.prototype.popBubble = function(i, popper) {
    this.getBubbles()[i].bubble.pop(popper)
  }

  klass.prototype.getBubbles = function() {
    return this.bubbles
  }

  var PopObserver = (function() {
    var klass = function PopObserver(canvas, player) {
      this.bubbles = []
      canvas.addEventListener('click', function(event) {
        this.setBubbles(handleClickEvent(event, canvas, player, this.getBubbles()))
      }.bind(this))
    }

    function handleClickEvent(event, canvas, player, bubbles) {
      var x = event.pageX - canvas.offsetLeft,
          y = event.pageY - canvas.offsetTop

      for (var i = bubbles.length; i--; ) {
        if (bubbles[i].tryToPop({ x: x, y: y }, player)) {
          bubbles.splice(i, 1)
        }
      }
      return bubbles
    }

    klass.prototype.registerBubble = function(bubble) {
      this.bubbles.push(bubble)
    }

    klass.prototype.setBubbles = function(bubbles) {
      this.bubbles = bubbles
    }

    klass.prototype.getBubbles = function() {
      return this.bubbles
    }

    return klass
  })()

  return klass
})()

var Bubble = (function() {
  var klass = function Bubble(center, radius) {
    this.popper = null
    this.center = center
    this.radius = radius
  }

  klass.prototype.getPlayerColor = function() {
    return this.popper
  }

  klass.prototype.getCenterX = function() {
    return this.getCenter().x
  }

  klass.prototype.getCenterY = function() {
    return this.getCenter().y
  }

  klass.prototype.getCenter = function() {
    return this.center
  }

  klass.prototype.getRadius = function() {
    return this.radius
  }

  klass.prototype.tryToPop = function(pos, popper) {
    if (this.isPopped()) return
    var dx       = pos.x - this.center.x,
        dy       = pos.y - this.center.y,
        distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < this.radius) {
      this.pop(popper)
    }
    return this.isPopped()
  }

  klass.prototype.pop = function(popper) {
    this.popper = popper
  }

  klass.prototype.isPopped = function() {
    return !!this.wasPoppedBy()
  }

  klass.prototype.wasPoppedBy = function() {
    return this.popper
  }

  return klass
})()

var BubbleRenderer = (function() {
  var colors = {
    'red':   '#C44',
    'green': '#4C4',
    'blue':  '#44C'
  }

  var klass = function BubbleRenderer(bubble) {
    this.bubble    = bubble
    this.particles = null
    this.unpopped_drawn = false
  }

  klass.prototype.render = function(canvas) {
    if (this.bubble.isPopped()) {
      this.particles = renderPopped(canvas, this.bubble, this.particles)
    } else {
      if (!this.unpopped_drawn) renderUnpopped(canvas, this.bubble)
      this.unpopped_drawn = true
    }
  }

  function renderPopped(canvas, bubble, particles) {
    if (!particles) {
      particles = splat(bubble.getCenter())
      renderCircle(canvas, bubble.getCenterX(), bubble.getCenterY(), bubble.getRadius(), getUnpoppedHexColor())
    }
    particles = animateBubbleSplat(canvas, particles)
    renderBubbleSplat(canvas, particles, getHexColor(bubble.getPlayerColor()))

    return particles
  }

  function splat(pos) {
    var particles = []
    for (var i = 70; i--; ) {
      particles.push({
        x:     pos.x,
        y:     pos.y,
        angle: i * 5,
        size:  5 + Math.random() * 3,
        life:  50 + Math.random() * 75
      })
    }

    return particles
  }

  function animateBubbleSplat(canvas, particles) {
    for (var i = particles.length; i--; ) {
      var p = particles[i]
      p.x += Math.cos(p.angle) * 4 + Math.random() * 2 - Math.random() * 2
      p.y += Math.sin(p.angle) * 4 + Math.random() * 2 - Math.random() * 2
      p.life -= canvas.delta
      p.size -= canvas.delta / 50

      if (p.size <= 0) p.life = 0

      if (p.life <= 0) particles.splice(i, 1)
    }

    return particles
  }

  function renderBubbleSplat(canvas, particles, color) {
    canvas.fillStyle = color
    for (var i = 0; i < particles.length; i++) {
      if (Math.random() < 0.1) continue
      var p = particles[i]
      canvas.beginPath()
      canvas.arc(p.x, p.y, p.size, 0, Math.PI * 2, false)
      canvas.fill()
    }
  }

  function renderUnpopped(canvas, bubble) {
    renderCircle(canvas, bubble.getCenterX(), bubble.getCenterY(), bubble.getRadius(), getUnpoppedHexColor())
    renderBubbleShine(canvas, bubble)
  }

  function renderBubbleShine(canvas, bubble) {
    canvas.beginPath()
    canvas.arc(bubble.getCenterX() + 3, bubble.getCenterY() + 3, bubble.getRadius() * 0.8, -(Math.PI / 2), Math.PI, true)
    canvas.arc(bubble.getCenterX(), bubble.getCenterY(), bubble.getRadius() * 0.8, Math.PI, -(Math.PI / 2), false)
    canvas.fillStyle = '#FFF'
    canvas.fill()
  }

  function renderCircle(canvas, x, y, radius, color) {
    canvas.beginPath()
    canvas.arc(x, y, radius, 0, 2 * Math.PI, false)
    canvas.fillStyle = color
    canvas.fill()
    canvas.lineWidth = 2
    canvas.strokeStyle = '#DDD'
    canvas.stroke()
  }

  function getUnpoppedHexColor() {
    return '#E6E6FF'
  }

  function getHexColor(color_name) {
    return colors[color_name]
  }

  return klass
})()

var BubbleKings = (function() {
  var klass = function BubbleKings(opts) {
    this.options = {
      rows: 5,
      cols: 6,
      bubble_size: 25
    }
    this.bubbles = initBubbles(this.options.rows, this.options.cols, this.options.bubble_size)
  }

  function initBubbles(rows, cols, size) {
    var bubbles = []
    for (var i = rows; i--; ) {
      for (var j = cols; j--; ) {
        bubbles.push(new Bubble({ x: (size * (2 * (j + 0.5))), y: (size * (2 * (i + 0.5))) }, size))
      }
    }

    return bubbles
  }

  klass.prototype.registerScreen = function(screen) {
    for (var i = this.getBubbles().length; i--; ) {
      screen.registerBubble(this.getBubbles()[i])
    }
    screen.setDimensions(2 * this.options.cols * this.options.bubble_size, 2 * this.options.rows * this.options.bubble_size)
  }

  klass.prototype.getBubbles = function() {
    return this.bubbles
  }

  return klass
})()

export var App = {
  run: function () {
    var canvas = document.getElementById('game')
    var game = new BubbleKings()
    this.screen = new BubbleScreen(game, 'red', canvas)
  },
  screen: null
}
